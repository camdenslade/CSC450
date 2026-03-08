// apps/api/src/payments/payments.controller.ts

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
import { PaymentsService } from './payments.service';
import { AddHandleDto } from './dto/add-handle.dto';
import { GenerateLinkDto } from './dto/generate-link.dto';
import { Platform } from '../common/enums';
import { UsersService } from '../users/users.service';

@UseGuards(FirebaseAuthGuard)
@Controller('v1/payments')
export class PaymentsController {
    constructor(
        private readonly paymentsService: PaymentsService,
        private readonly usersService:    UsersService,
    ) {}

    @Get('handles')
    async listHandles(@CurrentUser() caller: AuthenticatedUser) {
        const user = await this.usersService.getProfile(caller.uid);
        return this.paymentsService.listHandles(user.id);
    }

    @Post('handles')
    async upsertHandle(@CurrentUser() caller: AuthenticatedUser, @Body() dto: AddHandleDto) {
        const user = await this.usersService.getProfile(caller.uid);
        return this.paymentsService.upsertHandle(user.id, dto);
    }

    @Delete('handles/:platform')
    @HttpCode(HttpStatus.NO_CONTENT)
    async removeHandle(@CurrentUser() caller: AuthenticatedUser, @Param('platform') platform: Platform) {
        const user = await this.usersService.getProfile(caller.uid);
        return this.paymentsService.removeHandle(user.id, platform);
    }

    // Generates a link using the payee's registered handle on the given platform.
    @Post('link')
    async generateLink(@CurrentUser() caller: AuthenticatedUser, @Body() dto: GenerateLinkDto) {
        const payeeUser = await this.usersService.findByDbId(dto.payeeUserId);
        if (!payeeUser) return { error: 'not_found', message: 'Payee user not found.' };

        return this.paymentsService.generateLink(
            payeeUser.id,
            dto.platform,
            dto.amountCents,
            dto.note,
        );
    }
}
