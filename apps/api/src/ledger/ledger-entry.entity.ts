// apps/api/src/ledger/ledger-entry.entity.ts

import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../common/base.entity';
import { User } from '../users/user.entity';
import { Bill } from '../bills/bill.entity';

@Entity('ledger_entries')
export class LedgerEntry extends BaseEntity {
    @Index()
    @Column({ name: 'user_id', type: 'uuid' })
    userId: string;

    @ManyToOne(() => User, (u) => u.ledgerEntries, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Index()
    @Column({ name: 'bill_id', type: 'uuid' })
    billId: string;

    @ManyToOne(() => Bill, (b) => b.ledgerEntries, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'bill_id' })
    bill: Bill;

    // Positive = user is owed money; negative = user owes money. In cents.
    @Column({ name: 'delta_cents', type: 'int' })
    deltaCents: number;

    @Column({ name: 'settled_at', type: 'timestamptz', nullable: true })
    settledAt: Date | null;
}
