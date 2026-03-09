// apps/api/src/ledger/ledger.controller.ts

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/guards/firebase-auth.guard';
import { LedgerService } from './ledger.service';
import { UsersService } from '../users/users.service';

@UseGuards(FirebaseAuthGuard)
@Controller('v1/ledger')
export class LedgerController {
    constructor(
        private readonly ledgerService: LedgerService,
        private readonly usersService:  UsersService,
    ) {}

    @Get()
    async getLedger(
        @CurrentUser() caller: AuthenticatedUser,
        @Query('cursor') cursor?: string,
        @Query('limit') limit?: string,
    ) {
        const user = await this.usersService.getProfile(caller.uid);
        return this.ledgerService.getLedger(
            user.id,
            cursor,
            limit ? parseInt(limit, 10) : 20,
        );
    }
}
