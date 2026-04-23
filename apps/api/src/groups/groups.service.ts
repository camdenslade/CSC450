// apps/api/src/groups/groups.service.ts

import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Group } from './group.entity';
import { GroupMember } from './group-member.entity';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';

@Injectable()
export class GroupsService {
    constructor(
        @InjectRepository(Group)
        private readonly groups: Repository<Group>,
        @InjectRepository(GroupMember)
        private readonly members: Repository<GroupMember>,
    ) {}

    /** @returns All groups the caller belongs to, newest first. */
    async listForUser(callerDbId: string): Promise<Group[]> {
        const memberships = await this.members.find({
            where:     { userId: callerDbId },
            relations: ['group', 'group.members', 'group.members.user'],
        });
        return memberships
            .map((m) => m.group)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    // Creator is always added as a member regardless of memberIds.
    async create(ownerDbId: string, dto: CreateGroupDto): Promise<Group> {
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
    async findOne(callerDbId: string, groupId: string): Promise<Group> {
        const group = await this.groups.findOne({
            where:     { id: groupId },
            relations: ['members', 'members.user'],
        });

        if (!group) throw new NotFoundException('Group not found.');
        if (!group.members.some((m) => m.userId === callerDbId)) throw new ForbiddenException();

        return group;
    }

    async update(callerDbId: string, groupId: string, dto: UpdateGroupDto): Promise<Group> {
        const group = await this.findOne(callerDbId, groupId);
        if (group.ownerId !== callerDbId) throw new ForbiddenException('Only the owner can rename the group.');
        group.name = dto.name;
        await this.groups.save(group);
        return this.findOne(callerDbId, groupId);
    }

    async addMember(callerDbId: string, groupId: string, targetUserId: string): Promise<Group> {
        const group = await this.findOne(callerDbId, groupId);
        if (group.ownerId !== callerDbId) throw new ForbiddenException('Only the owner can add members.');
        if (group.members.some((m) => m.userId === targetUserId)) {
            throw new BadRequestException('User is already a member of this group.');
        }
        await this.members.save(this.members.create({ groupId, userId: targetUserId }));
        return this.findOne(callerDbId, groupId);
    }

    async removeMember(callerDbId: string, groupId: string, targetUserId: string): Promise<Group> {
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
