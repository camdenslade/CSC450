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
import { RemindParticipantDto } from './dto/remind-participant.dto';
import { UsersService } from '../users/users.service';

@Controller('v1/tabs')
export class BillsController {
    constructor(
        private readonly billsService: BillsService,
        private readonly usersService: UsersService,
    ) {}

    /** Public — no auth required. Returns a tab preview for the share link page. */
    @Get('preview/:token')
    async getPreview(@Param('token') token: string) {
        return this.billsService.getSharePreview(token);
    }

    @UseGuards(FirebaseAuthGuard)
    @Get()
    async findAll(@CurrentUser() caller: AuthenticatedUser) {
        const userId = await this.usersService.getUserDbId(caller.uid);
        return this.billsService.listForUser(userId);
    }

    @UseGuards(FirebaseAuthGuard)
    @Post()
    async create(
        @CurrentUser() caller: AuthenticatedUser,
        @Body() dto: CreateBillDto,
    ) {
        return this.billsService.create(caller.uid, dto);
    }

    @UseGuards(FirebaseAuthGuard)
    @Get(':id')
    async findOne(
        @CurrentUser() caller: AuthenticatedUser,
        @Param('id') id: string,
    ) {
        const userId = await this.usersService.getUserDbId(caller.uid);
        return this.billsService.findOne(userId, id);
    }

    @UseGuards(FirebaseAuthGuard)
    @Post(':id/split')
    async updateSplit(
        @CurrentUser() caller: AuthenticatedUser,
        @Param('id') id: string,
        @Body() dto: UpdateSplitDto,
    ) {
        const userId = await this.usersService.getUserDbId(caller.uid);
        return this.billsService.updateSplit(userId, id, dto);
    }

    @UseGuards(FirebaseAuthGuard)
    @Post(':id/settle')
    async settle(
        @CurrentUser() caller: AuthenticatedUser,
        @Param('id') id: string,
        @Body() dto: SettleParticipantDto,
    ) {
        const userId = await this.usersService.getUserDbId(caller.uid);
        return this.billsService.settleParticipant(userId, id, dto.participantId);
    }

    @UseGuards(FirebaseAuthGuard)
    @Post(':id/self-settle')
    @HttpCode(HttpStatus.NO_CONTENT)
    async selfSettle(
        @CurrentUser() caller: AuthenticatedUser,
        @Param('id') id: string,
    ) {
        const userId = await this.usersService.getUserDbId(caller.uid);
        return this.billsService.selfSettle(userId, id);
    }

    @UseGuards(FirebaseAuthGuard)
    @Post(':id/remind')
    @HttpCode(HttpStatus.NO_CONTENT)
    async remind(
        @CurrentUser() caller: AuthenticatedUser,
        @Param('id') id: string,
        @Body() dto: RemindParticipantDto,
    ) {
        const userId = await this.usersService.getUserDbId(caller.uid);
        return this.billsService.remindParticipant(userId, id, dto.participantId, dto.delayDays);
    }

    @UseGuards(FirebaseAuthGuard)
    @Post(':id/share')
    async share(
        @CurrentUser() caller: AuthenticatedUser,
        @Param('id') id: string,
    ) {
        const userId = await this.usersService.getUserDbId(caller.uid);
        return this.billsService.generateShareToken(userId, id);
    }

    @UseGuards(FirebaseAuthGuard)
    @Post('join/:token')
    async joinViaToken(
        @CurrentUser() caller: AuthenticatedUser,
        @Param('token') token: string,
    ) {
        const userId = await this.usersService.getUserDbId(caller.uid);
        return this.billsService.joinViaShareToken(userId, token);
    }

    @UseGuards(FirebaseAuthGuard)
    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async cancel(
        @CurrentUser() caller: AuthenticatedUser,
        @Param('id') id: string,
    ) {
        const userId = await this.usersService.getUserDbId(caller.uid);
        return this.billsService.cancel(userId, id);
    }
}
