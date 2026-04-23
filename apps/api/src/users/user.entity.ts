// apps/api/src/users/user.entity.ts

import { Entity, Column, Index, OneToMany } from 'typeorm';
import { BaseEntity } from '../common/base.entity';
import { Platform } from '../common/enums';
import { Friend } from '../friends/friend.entity';
import { Bill } from '../bills/bill.entity';
import { BillParticipant } from '../bills/bill-participant.entity';
import { LedgerEntry } from '../ledger/ledger-entry.entity';
import { PaymentHandle } from '../payments/payment-handle.entity';

@Entity('users')
export class User extends BaseEntity {
    // Firebase Auth UID - used as the primary correlation key with the mobile client
    @Index({ unique: true })
    @Column({ name: 'auth_provider_uid', length: 128 })
    authProviderUid: string;

    @Index()
    @Column({ name: 'display_name', length: 80 })
    displayName: string;

    // S3 key for the avatar, not a raw URL - resolve through UploadsService
    @Column({ name: 'avatar_s3_key', type: 'varchar', nullable: true, length: 512 })
    avatarS3Key: string | null;

    // HMAC-SHA256 of the phone number with a per-deployment salt.
    // Stored for lookup by phone without holding raw PII.
    @Index()
    @Column({ name: 'phone_hash', type: 'varchar', nullable: true, length: 64 })
    phoneHash: string | null;

    // Same hashing scheme as phone
    @Index()
    @Column({ name: 'email_hash', type: 'varchar', nullable: true, length: 64 })
    emailHash: string | null;

    @Column({
        name: 'default_platform',
        type: 'enum',
        enum: Platform,
        nullable: true,
    })
    defaultPlatform: Platform | null;

    // Expo/APNs/FCM push token registered by the device
    @Column({ name: 'push_token', type: 'varchar', nullable: true, length: 512 })
    pushToken: string | null;

    @Column({
        name: 'push_platform',
        type: 'varchar',
        nullable: true,
        length: 16,
    })
    pushPlatform: string | null;

    @OneToMany(() => PaymentHandle, (h) => h.user, { cascade: true })
    paymentHandles: PaymentHandle[];

    @OneToMany(() => Friend, (f) => f.requester)
    sentFriendRequests: Friend[];

    @OneToMany(() => Friend, (f) => f.recipient)
    receivedFriendRequests: Friend[];

    @OneToMany(() => Bill, (b) => b.owner)
    bills: Bill[];

    @OneToMany(() => BillParticipant, (p) => p.user)
    participations: BillParticipant[];

    @OneToMany(() => LedgerEntry, (e) => e.user)
    ledgerEntries: LedgerEntry[];
}
