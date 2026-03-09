// apps/api/src/payments/payment-handle.entity.ts
//
// Handle format per platform (enforced in PaymentsService):
//   PayPal  - alphanumeric, hyphens, underscores, periods, max 40 chars
//   Venmo   - alphanumeric, hyphens, underscores, periods, max 30 chars
//   CashApp - alphanumeric only, max 20 chars (stored without the $)

import { Entity, Column, Index, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { BaseEntity } from '../common/base.entity';
import { Platform } from '../common/enums';
import { User } from '../users/user.entity';

@Unique(['userId', 'platform'])
@Entity('payment_handles')
export class PaymentHandle extends BaseEntity {
    @Index()
    @Column({ name: 'user_id', type: 'uuid' })
    userId: string;

    @ManyToOne(() => User, (u) => u.paymentHandles, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ type: 'enum', enum: Platform })
    platform: Platform;

    // Stored without any prefix (@, $, etc.)
    @Column({ length: 64 })
    handle: string;

    @Column({ name: 'verified_at', type: 'timestamptz', nullable: true })
    verifiedAt: Date | null;
}
