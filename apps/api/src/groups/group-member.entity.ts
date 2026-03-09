// apps/api/src/groups/group-member.entity.ts

import { Entity, Column, Index, ManyToOne, JoinColumn, PrimaryColumn } from 'typeorm';
import { Group } from './group.entity';
import { User } from '../users/user.entity';

@Entity('group_members')
export class GroupMember {
    @PrimaryColumn({ name: 'group_id', type: 'uuid' })
    groupId: string;

    @PrimaryColumn({ name: 'user_id', type: 'uuid' })
    userId: string;

    @ManyToOne(() => Group, (g) => g.members, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'group_id' })
    group: Group;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Index()
    @Column({ name: 'joined_at', type: 'timestamptz', default: () => 'NOW()' })
    joinedAt: Date;
}
