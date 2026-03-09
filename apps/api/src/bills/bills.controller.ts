// apps/api/src/bills/bills.controller.ts

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
import { BillsService } from './bills.service';
import { CreateBillDto } from './dto/create-bill.dto';
import { UpdateSplitDto } from './dto/update-split.dto';
import { SettleParticipantDto } from './dto/settle-participant.dto';
import { UsersService } from '../users/users.service';

@UseGuards(FirebaseAuthGuard)
@Controller('v1/tabs')
export class BillsController {
    constructor(
        private readonly billsService: BillsService,
        private readonly usersService: UsersService,
    ) {}

    @Post()
    async create(
        @CurrentUser() caller: AuthenticatedUser,
        @Body() dto: CreateBillDto,
    ) {
        return this.billsService.create(caller.uid, dto);
    }

    @Get(':id')
    async findOne(
        @CurrentUser() caller: AuthenticatedUser,
        @Param('id') id: string,
    ) {
        const user = await this.usersService.getProfile(caller.uid);
        return this.billsService.findOne(user.id, id);
    }

    @Post(':id/split')
    async updateSplit(
        @CurrentUser() caller: AuthenticatedUser,
        @Param('id') id: string,
        @Body() dto: UpdateSplitDto,
    ) {
        const user = await this.usersService.getProfile(caller.uid);
        return this.billsService.updateSplit(user.id, id, dto);
    }

    @Post(':id/settle')
    async settle(
        @CurrentUser() caller: AuthenticatedUser,
        @Param('id') id: string,
        @Body() dto: SettleParticipantDto,
    ) {
        const user = await this.usersService.getProfile(caller.uid);
        return this.billsService.settleParticipant(user.id, id, dto.participantId);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async cancel(
        @CurrentUser() caller: AuthenticatedUser,
        @Param('id') id: string,
    ) {
        const user = await this.usersService.getProfile(caller.uid);
        return this.billsService.cancel(user.id, id);
    }
}
