// apps/api/src/groups/group.entity.ts

import { Entity, Column, Index, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '../common/base.entity';
import { User } from '../users/user.entity';
import { GroupMember } from './group-member.entity';

@Entity('groups')
export class Group extends BaseEntity {
    @Index()
    @Column({ name: 'owner_id', type: 'uuid' })
    ownerId: string;

    @ManyToOne(() => User, { onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'owner_id' })
    owner: User;

    @Column({ length: 80 })
    name: string;

    @Column({ name: 'avatar_s3_key', type: 'varchar', nullable: true, length: 512 })
    avatarS3Key: string | null;

    @OneToMany(() => GroupMember, (m) => m.group, { cascade: true })
    members: GroupMember[];
}
