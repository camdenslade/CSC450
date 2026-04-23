// apps/api/src/groups/groups.controller.ts

import {
    Body, Controller, Delete, Get, HttpCode, HttpStatus,
    Param, Patch, Post, UseGuards,
} from '@nestjs/common';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/guards/firebase-auth.guard';
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { AddMemberDto } from './dto/add-member.dto';
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
        const userId = await this.usersService.getUserDbId(caller.uid);
        return this.groupsService.listForUser(userId);
    }

    @Post()
    async create(
        @CurrentUser() caller: AuthenticatedUser,
        @Body() dto: CreateGroupDto,
    ) {
        const userId = await this.usersService.getUserDbId(caller.uid);
        return this.groupsService.create(userId, dto);
    }

    @Get(':id')
    async findOne(
        @CurrentUser() caller: AuthenticatedUser,
        @Param('id') id: string,
    ) {
        const userId = await this.usersService.getUserDbId(caller.uid);
        return this.groupsService.findOne(userId, id);
    }

    @Patch(':id')
    async update(
        @CurrentUser() caller: AuthenticatedUser,
        @Param('id') id: string,
        @Body() dto: UpdateGroupDto,
    ) {
        const userId = await this.usersService.getUserDbId(caller.uid);
        return this.groupsService.update(userId, id, dto);
    }

    @Post(':id/members')
    async addMember(
        @CurrentUser() caller: AuthenticatedUser,
        @Param('id') id: string,
        @Body() dto: AddMemberDto,
    ) {
        const userId = await this.usersService.getUserDbId(caller.uid);
        return this.groupsService.addMember(userId, id, dto.userId);
    }

    @Delete(':id/members/:memberId')
    async removeMember(
        @CurrentUser() caller: AuthenticatedUser,
        @Param('id') id: string,
        @Param('memberId') memberId: string,
    ) {
        const userId = await this.usersService.getUserDbId(caller.uid);
        return this.groupsService.removeMember(userId, id, memberId);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async deleteGroup(
        @CurrentUser() caller: AuthenticatedUser,
        @Param('id') id: string,
    ) {
        const userId = await this.usersService.getUserDbId(caller.uid);
        return this.groupsService.deleteGroup(userId, id);
    }
}
