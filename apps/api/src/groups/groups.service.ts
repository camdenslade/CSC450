// apps/api/src/groups/groups.service.ts

import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Group } from './group.entity';
import { GroupMember } from './group-member.entity';
import { CreateGroupDto } from './dto/create-group.dto';

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

    // ---------------------------------------------------------

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
}
