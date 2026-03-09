// apps/api/src/friends/friend.entity.ts

import { Entity, Column, Index, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { BaseEntity } from '../common/base.entity';
import { FriendStatus, FriendSource } from '../common/enums';
import { User } from '../users/user.entity';

@Unique(['requesterId', 'recipientId'])
@Entity('friends')
export class Friend extends BaseEntity {
    @Index()
    @Column({ name: 'requester_id', type: 'uuid' })
    requesterId: string;

    @ManyToOne(() => User, (u) => u.sentFriendRequests, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'requester_id' })
    requester: User;

    @Index()
    @Column({ name: 'recipient_id', type: 'uuid' })
    recipientId: string;

    @ManyToOne(() => User, (u) => u.receivedFriendRequests, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'recipient_id' })
    recipient: User;

    @Column({
        type: 'enum',
        enum: FriendStatus,
        default: FriendStatus.PENDING,
    })
    status: FriendStatus;

    @Column({
        type: 'enum',
        enum: FriendSource,
        default: FriendSource.MANUAL,
    })
    source: FriendSource;
}
