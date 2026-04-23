// apps/api/src/bills/bills.service.ts

import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Bill } from './bill.entity';
import { BillParticipant } from './bill-participant.entity';
import { LedgerEntry } from '../ledger/ledger-entry.entity';
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { PaymentsService } from '../payments/payments.service';
import { S3Service } from '../s3/s3.service';
import { CreateBillDto } from './dto/create-bill.dto';
import { UpdateSplitDto } from './dto/update-split.dto';
import { BillStatus, ParticipantState } from '../common/enums';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class BillsService {
    private readonly logger = new Logger(BillsService.name);

    constructor(
        @InjectRepository(Bill)
        private readonly bills: Repository<Bill>,
        @InjectRepository(BillParticipant)
        private readonly participants: Repository<BillParticipant>,
        @InjectRepository(LedgerEntry)
        private readonly ledger: Repository<LedgerEntry>,
        @InjectRepository(User)
        private readonly users: Repository<User>,
        private readonly usersService: UsersService,
        private readonly paymentsService: PaymentsService,
        private readonly s3: S3Service,
        private readonly dataSource: DataSource,
        private readonly notifications: NotificationsService,
    ) {}

    private async withReceiptUrl(bill: Bill): Promise<Bill & { receiptUrl: string | null }> {
        const receiptUrl = bill.receiptS3Key
            ? await this.s3.createReadUrl(bill.receiptS3Key)
            : null;
        return Object.assign(bill, { receiptUrl });
    }

    private async withReceiptUrls(bills: Bill[]): Promise<(Bill & { receiptUrl: string | null })[]> {
        return Promise.all(bills.map((b) => this.withReceiptUrl(b)));
    }

    // Creates the bill, persists participants, and seeds ledger entries.
    // Payment links are generated best-effort at creation time.
    async create(callerUid: string, dto: CreateBillDto): Promise<Bill> {
        const owner = await this.usersService.getProfile(callerUid);

        const shareTotal = dto.participants.reduce((sum, p) => sum + p.share, 0);

        // Shares must equal the bill total - never trust client-calculated amounts
        if (shareTotal !== dto.total) {
            throw new BadRequestException(
                `Participant shares (${shareTotal}) do not match bill total (${dto.total}).`,
            );
        }

        // Fetch all owner handles once to avoid N DB queries inside the participant loop
        const ownerHandles = await this.paymentsService.listHandles(owner.id);
        const handleByPlatform = new Map(ownerHandles.map((h) => [h.platform, h]));

        return this.dataSource.transaction(async (em) => {
            const bill = em.create(Bill, {
                ownerId:      owner.id,
                name:         dto.name,
                location:     dto.location ?? null,
                totalCents:   dto.total,
                taxCents:     dto.tax ?? 0,
                tipCents:     dto.tip ?? 0,
                currency:     dto.currency ?? 'USD',
                notes:        dto.notes ?? null,
                receiptS3Key: dto.receiptKey ?? null,
                status:       BillStatus.OPEN,
            });

            const savedBill = await em.save(bill);

            for (const p of dto.participants) {
                const participant = em.create(BillParticipant, {
                    billId:           savedBill.id,
                    userId:           p.userId ?? null,
                    contactName:      p.contact?.name ?? null,
                    contactPhoneHash: p.contact?.phone
                        ? this.usersService.hashContact(p.contact.phone)
                        : null,
                    platform:   p.platform,
                    shareCents: p.share,
                    state:      ParticipantState.PENDING,
                });

                try {
                    const handle = handleByPlatform.get(p.platform);
                    if (!handle) throw new Error('no handle');
                    const link = this.paymentsService.buildLinkFromHandle(
                        handle.handle,
                        p.platform,
                        p.share,
                        `TabUp: ${dto.name}`,
                    );
                    participant.paymentLink = link.paymentUrl;
                } catch {
                    // Best-effort - link can be generated later if the owner registers a handle
                    participant.paymentLink = null;
                }

                await em.save(participant);

                // Ledger entries only for registered users, not external contacts
                if (p.userId) {
                    await em.save(em.create(LedgerEntry, {
                        userId:     p.userId,
                        billId:     savedBill.id,
                        deltaCents: -p.share, // negative = owes money
                    }));
                }
            }

            // Owner's ledger entry - they are owed the full total
            await em.save(em.create(LedgerEntry, {
                userId:     owner.id,
                billId:     savedBill.id,
                deltaCents: dto.total,
            }));

            return savedBill;
        });
    }

    /** @returns All bills where the caller is owner or participant, newest first. */
    async listForUser(callerDbId: string): Promise<(Bill & { receiptUrl: string | null })[]> {
        const bills = await this.bills
            .createQueryBuilder('bill')
            .leftJoinAndSelect('bill.participants', 'participant')
            .where('bill.ownerId = :id OR participant.userId = :id', { id: callerDbId })
            .orderBy('bill.createdAt', 'DESC')
            .getMany();
        return this.withReceiptUrls(bills);
    }

    // Owner and participants can view; everyone else gets 403.
    async findOne(callerDbId: string, billId: string): Promise<Bill & { receiptUrl: string | null }> {
        const bill = await this.bills.findOne({
            where:     { id: billId },
            relations: ['participants', 'participants.user'],
        });

        if (!bill) throw new NotFoundException('Bill not found.');

        const canView = bill.ownerId === callerDbId
            || bill.participants.some((p) => p.userId === callerDbId);

        if (!canView) throw new ForbiddenException();

        return this.withReceiptUrl(bill);
    }

    // Owner-only. New shares must still sum to the original bill total.
    async updateSplit(callerDbId: string, billId: string, dto: UpdateSplitDto): Promise<Bill> {
        const bill = await this.bills.findOne({
            where: { id: billId }, relations: ['participants'],
        });

        if (!bill) throw new NotFoundException('Bill not found.');
        if (bill.ownerId !== callerDbId) throw new ForbiddenException();
        if (bill.status !== BillStatus.OPEN) {
            throw new BadRequestException('Only open bills can be updated.');
        }

        const newTotal = dto.splits.reduce((sum, s) => sum + s.share, 0);
        if (newTotal !== bill.totalCents) {
            throw new BadRequestException(
                `Updated shares (${newTotal}) do not match bill total (${bill.totalCents}).`,
            );
        }

        for (const split of dto.splits) {
            const participant = bill.participants.find((p) => p.id === split.participantId);
            if (!participant) {
                throw new NotFoundException(`Participant ${split.participantId} not found on this bill.`);
            }
            participant.shareCents = split.share;
            await this.participants.save(participant);
        }

        return this.findOne(callerDbId, billId);
    }

    // Marks a participant as paid. Auto-settles the bill when everyone is paid.
    async settleParticipant(callerDbId: string, billId: string, participantId: string): Promise<Bill> {
        const bill = await this.bills.findOne({
            where: { id: billId }, relations: ['participants'],
        });

        if (!bill) throw new NotFoundException('Bill not found.');
        if (bill.ownerId !== callerDbId) throw new ForbiddenException();

        const participant = bill.participants.find((p) => p.id === participantId);
        if (!participant) throw new NotFoundException('Participant not found on this bill.');

        participant.state     = ParticipantState.PAID;
        participant.paidCents = participant.shareCents;
        participant.settledAt = new Date();
        await this.participants.save(participant);

        // Mark the participant's ledger entry settled
        if (participant.userId) {
            const entry = await this.ledger.findOne({
                where: { userId: participant.userId, billId },
            });
            if (entry) {
                entry.settledAt = new Date();
                await this.ledger.save(entry);
            }
        }

        // Auto-settle the bill if every participant is now paid
        const allPaid = bill.participants.every(
            (p) => p.id === participantId || p.state === ParticipantState.PAID,
        );

        if (allPaid) {
            bill.status = BillStatus.SETTLED;
            await this.bills.save(bill);
        }

        return this.findOne(callerDbId, billId);
    }

    // Owner-only. Sends a push reminder immediately, or schedules one for delayDays from now.
    async remindParticipant(
        callerDbId: string,
        billId: string,
        participantId: string,
        delayDays?: number,
    ): Promise<void> {
        const bill = await this.bills.findOne({
            where: { id: billId }, relations: ['participants'],
        });
        if (!bill) throw new NotFoundException('Bill not found.');
        if (bill.ownerId !== callerDbId) throw new ForbiddenException();

        const participant = bill.participants.find((p) => p.id === participantId);
        if (!participant) throw new NotFoundException('Participant not found on this bill.');
        if (!participant.userId) throw new BadRequestException('Cannot remind an external contact — no app account.');

        if (delayDays && delayDays > 0) {
            const remindAt = new Date();
            remindAt.setDate(remindAt.getDate() + delayDays);
            participant.remindAt = remindAt;
            await this.participants.save(participant);
        } else {
            participant.remindAt = null;
            participant.remindersSent += 1;
            await this.participants.save(participant);
            await this.notifications.sendReminder(participant.userId, bill.name);
        }
    }

    // Called by the scheduler — fires any reminders that are due.
    async fireScheduledReminders(): Promise<void> {
        const due = await this.participants.find({
            where: {
                state: ParticipantState.PENDING,
            },
            relations: ['bill'],
        });

        const now = new Date();
        const overdue = due.filter((p) => p.remindAt && p.remindAt <= now && p.userId);

        for (const participant of overdue) {
            try {
                await this.notifications.sendReminder(participant.userId!, participant.bill.name);
                participant.remindAt = null;
                participant.remindersSent += 1;
                await this.participants.save(participant);
            } catch {
                // Best-effort — will retry next tick
            }
        }
    }

    // Owner-only. Open bills only.
    async cancel(callerDbId: string, billId: string): Promise<void> {
        const bill = await this.bills.findOne({ where: { id: billId } });
        if (!bill) throw new NotFoundException('Bill not found.');
        if (bill.ownerId !== callerDbId) throw new ForbiddenException();
        if (bill.status !== BillStatus.OPEN) {
            throw new BadRequestException('Only open bills can be cancelled.');
        }
        bill.status = BillStatus.CANCELLED;
        await this.bills.save(bill);
    }
}
