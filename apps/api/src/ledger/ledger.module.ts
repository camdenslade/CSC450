// apps/api/src/ledger/ledger.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LedgerService } from './ledger.service';
import { LedgerController } from './ledger.controller';
import { LedgerEntry } from './ledger-entry.entity';
import { UsersModule } from '../users/users.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([LedgerEntry]),
        UsersModule,
    ],
    providers:   [LedgerService],
    controllers: [LedgerController],
    exports:     [LedgerService],
})
export class LedgerModule {}
