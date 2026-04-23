// apps/api/src/bills/bill-participant.entity.ts

import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../common/base.entity';
import { Platform, ParticipantState } from '../common/enums';
import { Bill } from './bill.entity';
import { User } from '../users/user.entity';

@Entity('bill_participants')
export class BillParticipant extends BaseEntity {
    @Index()
    @Column({ name: 'bill_id', type: 'uuid' })
    billId: string;

    @ManyToOne(() => Bill, (b) => b.participants, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'bill_id' })
    bill: Bill;

    // Null when the participant is an external (non-registered) contact
    @Index()
    @Column({ name: 'user_id', type: 'uuid', nullable: true })
    userId: string | null;

    @ManyToOne(() => User, (u) => u.participations, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'user_id' })
    user: User | null;

    // External contact fields - only populated when user_id is null
    @Column({ name: 'contact_name', type: 'varchar', nullable: true, length: 80 })
    contactName: string | null;

    // Hashed the same way as user.phoneHash for privacy consistency
    @Column({ name: 'contact_phone_hash', type: 'varchar', nullable: true, length: 64 })
    contactPhoneHash: string | null;

    @Column({ type: 'enum', enum: Platform })
    platform: Platform;

    @Column({ name: 'share_cents', type: 'int' })
    shareCents: number;

    @Column({ name: 'paid_cents', type: 'int', default: 0 })
    paidCents: number;

    @Column({
        type: 'enum',
        enum: ParticipantState,
        default: ParticipantState.PENDING,
    })
    state: ParticipantState;

    // Pre-generated payment URL for this participant to pay the bill owner
    @Column({ name: 'payment_link', type: 'varchar', nullable: true, length: 1024 })
    paymentLink: string | null;

    @Column({ name: 'reminders_sent', type: 'int', default: 0 })
    remindersSent: number;

    @Column({ name: 'remind_at', type: 'timestamptz', nullable: true })
    remindAt: Date | null;

    @Column({ name: 'settled_at', type: 'timestamptz', nullable: true })
    settledAt: Date | null;
}
