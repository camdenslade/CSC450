// apps/api/src/groups/groups.controller.ts

import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/guards/firebase-auth.guard';
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UsersService } from '../users/users.service';

@UseGuards(FirebaseAuthGuard)
@Controller('v1/groups')
export class GroupsController {
    constructor(
        private readonly groupsService: GroupsService,
        private readonly usersService:  UsersService,
    ) {}

    @Get()
    async listGroups(@CurrentUser() caller: AuthenticatedUser) {
        const user = await this.usersService.getProfile(caller.uid);
        return this.groupsService.listForUser(user.id);
    }

    @Post()
    async create(
        @CurrentUser() caller: AuthenticatedUser,
        @Body() dto: CreateGroupDto,
    ) {
        const user = await this.usersService.getProfile(caller.uid);
        return this.groupsService.create(user.id, dto);
    }

    @Get(':id')
    async findOne(
        @CurrentUser() caller: AuthenticatedUser,
        @Param('id') id: string,
    ) {
        const user = await this.usersService.getProfile(caller.uid);
        return this.groupsService.findOne(user.id, id);
    }
}
