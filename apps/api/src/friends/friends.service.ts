// apps/api/src/friends/friends.service.ts

import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Friend } from './friend.entity';
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { FriendSource, FriendStatus } from '../common/enums';
import { InviteFriendDto } from './dto/invite-friend.dto';

@Injectable()
export class FriendsService {
    constructor(
        @InjectRepository(Friend)
        private readonly friends: Repository<Friend>,
        @InjectRepository(User)
        private readonly users: Repository<User>,
        private readonly usersService: UsersService,
    ) {}

    /** @returns Pending friend requests where the caller is the recipient. */
    async listRequests(callerDbId: string): Promise<Friend[]> {
        return this.friends.find({
            where: { recipientId: callerDbId, status: FriendStatus.PENDING },
            relations: ['requester'],
        });
    }

    async listFriends(callerDbId: string): Promise<Friend[]> {
        return this.friends.find({
            where: [
                { requesterId: callerDbId, status: FriendStatus.ACCEPTED },
                { recipientId: callerDbId, status: FriendStatus.ACCEPTED },
            ],
            relations: ['requester', 'recipient'],
        });
    }

    // Send a friend request directly by target user DB ID (used after a name search).
    async inviteById(callerUid: string, targetUserId: string): Promise<Friend> {
        const caller = await this.usersService.getProfile(callerUid);
        if (caller.id === targetUserId) {
            throw new BadRequestException('You cannot add yourself as a friend.');
        }

        const target = await this.users.findOne({ where: { id: targetUserId } });
        if (!target) throw new NotFoundException('User not found.');

        const existing = await this.friends.findOne({
            where: [
                { requesterId: caller.id, recipientId: target.id },
                { requesterId: target.id, recipientId: caller.id },
            ],
        });

        if (existing) {
            if (existing.status === FriendStatus.ACCEPTED) throw new ConflictException('Already friends.');
            if (existing.status === FriendStatus.PENDING)  throw new ConflictException('A friend request already exists.');
        }

        const record = this.friends.create({
            requesterId: caller.id,
            recipientId: target.id,
            status:      FriendStatus.PENDING,
            source:      FriendSource.MANUAL,
        });

        return this.friends.save(record);
    }

    // ---------------------------------------------------------

    // Hashes the contact value before lookup - raw PII never leaves this method.
    async invite(callerUid: string, dto: InviteFriendDto): Promise<Friend> {
        const caller = await this.usersService.getProfile(callerUid);
        const hash   = this.usersService.hashContact(dto.value);

        const targetField = dto.target === 'phone' ? 'phoneHash' : 'emailHash';
        const target = await this.users.findOne({ where: { [targetField]: hash } });

        if (!target) throw new NotFoundException('No TabUp user found with that contact.');
        if (target.id === caller.id) throw new BadRequestException('You cannot add yourself as a friend.');

        const existing = await this.friends.findOne({
            where: [
                { requesterId: caller.id, recipientId: target.id },
                { requesterId: target.id, recipientId: caller.id },
            ],
        });

        if (existing) {
            if (existing.status === FriendStatus.ACCEPTED) throw new ConflictException('Already friends.');
            if (existing.status === FriendStatus.PENDING)  throw new ConflictException('A friend request already exists.');
        }

        const record = this.friends.create({
            requesterId: caller.id,
            recipientId: target.id,
            status:      FriendStatus.PENDING,
            source:      FriendSource.MANUAL,
        });

        return this.friends.save(record);
    }

    // Only the recipient can accept an inbound request.
    async accept(callerDbId: string, friendId: string): Promise<Friend> {
        const record = await this.friends.findOne({ where: { id: friendId } });
        if (!record) throw new NotFoundException('Friend request not found.');
        if (record.recipientId !== callerDbId) throw new ForbiddenException();
        if (record.status !== FriendStatus.PENDING) {
            throw new BadRequestException('This request is not in a pending state.');
        }
        record.status = FriendStatus.ACCEPTED;
        return this.friends.save(record);
    }

    // Either side of a friendship can remove it.
    async remove(callerDbId: string, friendId: string): Promise<void> {
        const record = await this.friends.findOne({ where: { id: friendId } });
        if (!record) throw new NotFoundException('Friend record not found.');
        if (record.requesterId !== callerDbId && record.recipientId !== callerDbId) {
            throw new ForbiddenException();
        }
        await this.friends.remove(record);
    }
}
