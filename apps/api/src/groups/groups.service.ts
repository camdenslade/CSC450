// apps/api/src/groups/groups.service.ts

import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Group } from './group.entity';
import { GroupMember } from './group-member.entity';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { S3Service } from '../s3/s3.service';

type GroupWithAvatarUrl = Group & { avatarUrl: string | null };

@Injectable()
export class GroupsService {
    constructor(
        @InjectRepository(Group)
        private readonly groups: Repository<Group>,
        @InjectRepository(GroupMember)
        private readonly members: Repository<GroupMember>,
        private readonly s3: S3Service,
    ) {}

    private async withAvatarUrl(group: Group): Promise<GroupWithAvatarUrl> {
        const avatarUrl = group.avatarS3Key
            ? await this.s3.createReadUrl(group.avatarS3Key)
            : null;

        const members = await Promise.all(
            (group.members ?? []).map(async (m) => {
                const userAvatarUrl = m.user?.avatarS3Key
                    ? await this.s3.createReadUrl(m.user.avatarS3Key)
                    : null;
                return { ...m, user: { ...m.user, avatarUrl: userAvatarUrl } };
            })
        );

        return { ...group, members, avatarUrl };
    }

    /** @returns All groups the caller belongs to, newest first. */
    async listForUser(callerDbId: string): Promise<GroupWithAvatarUrl[]> {
        const memberships = await this.members.find({
            where:     { userId: callerDbId },
            relations: ['group', 'group.members', 'group.members.user'],
        });
        const raw = memberships
            .map((m) => m.group)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        return Promise.all(raw.map((g) => this.withAvatarUrl(g)));
    }

    // Creator is always added as a member regardless of memberIds.
    async create(ownerDbId: string, dto: CreateGroupDto): Promise<GroupWithAvatarUrl> {
        const group = await this.groups.save(
            this.groups.create({ ownerId: ownerDbId, name: dto.name }),
        );

        const memberIds = dto.memberIds ?? [];
        if (!memberIds.includes(ownerDbId)) memberIds.push(ownerDbId);

        for (const userId of memberIds) {
            await this.members.save(this.members.create({ groupId: group.id, userId }));
        }

        return this.findOne(ownerDbId, group.id);
    }

    // Non-members get a 403, not a 404, to avoid group ID enumeration.
    async findOne(callerDbId: string, groupId: string): Promise<GroupWithAvatarUrl> {
        const group = await this.groups.findOne({
            where:     { id: groupId },
            relations: ['members', 'members.user'],
        });

        if (!group) throw new NotFoundException('Group not found.');
        if (!group.members.some((m) => m.userId === callerDbId)) throw new ForbiddenException();

        return this.withAvatarUrl(group);
    }

    async update(callerDbId: string, groupId: string, dto: UpdateGroupDto): Promise<Group> {
        const group = await this.findOne(callerDbId, groupId);
        if (group.ownerId !== callerDbId) throw new ForbiddenException('Only the owner can update the group.');
        if (dto.name !== undefined) group.name = dto.name;
        if (dto.avatarS3Key !== undefined) group.avatarS3Key = dto.avatarS3Key;
        await this.groups.save(group);
        return this.findOne(callerDbId, groupId);
    }

    async addMember(callerDbId: string, groupId: string, targetUserId: string): Promise<GroupWithAvatarUrl> {
        const group = await this.findOne(callerDbId, groupId);
        if (group.ownerId !== callerDbId) throw new ForbiddenException('Only the owner can add members.');
        if (group.members.some((m) => m.userId === targetUserId)) {
            throw new BadRequestException('User is already a member of this group.');
        }
        await this.members.save(this.members.create({ groupId, userId: targetUserId }));
        return this.findOne(callerDbId, groupId);
    }

    async removeMember(callerDbId: string, groupId: string, targetUserId: string): Promise<GroupWithAvatarUrl> {
        const group = await this.findOne(callerDbId, groupId);
        if (group.ownerId !== callerDbId && callerDbId !== targetUserId) {
            throw new ForbiddenException('Only the owner can remove other members.');
        }
        if (targetUserId === group.ownerId) {
            throw new BadRequestException('The owner cannot be removed. Transfer ownership or delete the group.');
        }
        const membership = await this.members.findOne({ where: { groupId, userId: targetUserId } });
        if (!membership) throw new NotFoundException('Member not found in this group.');
        await this.members.remove(membership);
        return this.findOne(callerDbId, groupId);
    }

    async deleteGroup(callerDbId: string, groupId: string): Promise<void> {
        const group = await this.findOne(callerDbId, groupId);
        if (group.ownerId !== callerDbId) throw new ForbiddenException('Only the owner can delete the group.');
        await this.groups.remove(group);
    }
}
