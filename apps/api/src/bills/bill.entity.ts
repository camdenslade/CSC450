// apps/api/src/bills/bill.entity.ts

import { Entity, Column, Index, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '../common/base.entity';
import { BillStatus } from '../common/enums';
import { User } from '../users/user.entity';
import { BillParticipant } from './bill-participant.entity';
import { LedgerEntry } from '../ledger/ledger-entry.entity';

@Entity('bills')
export class Bill extends BaseEntity {
    @Index()
    @Column({ name: 'owner_id', type: 'uuid' })
    ownerId: string;

    @ManyToOne(() => User, (u) => u.bills, { onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'owner_id' })
    owner: User;

    @Column({ length: 120 })
    name: string;

    @Column({ type: 'varchar', nullable: true, length: 160 })
    location: string | null;

    // All monetary values stored in cents to avoid floating-point issues
    @Column({ name: 'total_cents', type: 'int' })
    totalCents: number;

    @Column({ name: 'tax_cents', type: 'int', default: 0 })
    taxCents: number;

    @Column({ name: 'tip_cents', type: 'int', default: 0 })
    tipCents: number;

    @Column({ length: 3, default: 'USD' })
    currency: string;

    @Column({ type: 'varchar', nullable: true, length: 500 })
    notes: string | null;

    // S3 key for the receipt photo
    @Column({ name: 'receipt_s3_key', type: 'varchar', nullable: true, length: 512 })
    receiptS3Key: string | null;

    @Column({
        type: 'enum',
        enum: BillStatus,
        default: BillStatus.OPEN,
    })
    status: BillStatus;

    @OneToMany(() => BillParticipant, (p) => p.bill, { cascade: true })
    participants: BillParticipant[];

    @OneToMany(() => LedgerEntry, (e) => e.bill, { cascade: true })
    ledgerEntries: LedgerEntry[];
}
