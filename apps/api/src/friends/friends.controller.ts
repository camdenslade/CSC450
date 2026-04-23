// apps/api/src/friends/friends.controller.ts

import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Post,
    UseGuards,
} from '@nestjs/common';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/guards/firebase-auth.guard';
import { FriendsService } from './friends.service';
import { InviteFriendDto } from './dto/invite-friend.dto';
import { InviteByIdDto } from './dto/invite-by-id.dto';
import { AcceptFriendDto } from './dto/accept-friend.dto';
import { UsersService } from '../users/users.service';

@UseGuards(FirebaseAuthGuard)
@Controller('v1/friends')
export class FriendsController {
    constructor(
        private readonly friendsService: FriendsService,
        private readonly usersService:   UsersService,
    ) {}

    @Get()
    async listFriends(@CurrentUser() caller: AuthenticatedUser) {
        const userId = await this.usersService.getUserDbId(caller.uid);
        return this.friendsService.listFriends(userId);
    }

    @Get('requests')
    async listRequests(@CurrentUser() caller: AuthenticatedUser) {
        const userId = await this.usersService.getUserDbId(caller.uid);
        return this.friendsService.listRequests(userId);
    }

    /** Send a friend request by target user DB ID (after a name search). */
    @Post('invite-by-id')
    async inviteById(
        @CurrentUser() caller: AuthenticatedUser,
        @Body() dto: InviteByIdDto,
    ) {
        return this.friendsService.inviteById(caller.uid, dto.targetUserId);
    }

    @Post('invite')
    async invite(
        @CurrentUser() caller: AuthenticatedUser,
        @Body() dto: InviteFriendDto,
    ) {
        return this.friendsService.invite(caller.uid, dto);
    }

    @Post('accept')
    async accept(
        @CurrentUser() caller: AuthenticatedUser,
        @Body() dto: AcceptFriendDto,
    ) {
        const userId = await this.usersService.getUserDbId(caller.uid);
        return this.friendsService.accept(userId, dto.friendId);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async remove(
        @CurrentUser() caller: AuthenticatedUser,
        @Param('id') id: string,
    ) {
        const userId = await this.usersService.getUserDbId(caller.uid);
        return this.friendsService.remove(userId, id);
    }
}
