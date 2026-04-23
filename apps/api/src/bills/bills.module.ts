// apps/api/src/bills/bills.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillsService } from './bills.service';
import { BillsController } from './bills.controller';
import { Bill } from './bill.entity';
import { BillParticipant } from './bill-participant.entity';
import { LedgerEntry } from '../ledger/ledger-entry.entity';
import { User } from '../users/user.entity';
import { UsersModule } from '../users/users.module';
import { PaymentsModule } from '../payments/payments.module';
import { S3Module } from '../s3/s3.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RemindersScheduler } from './reminders.scheduler';

@Module({
    imports: [
        TypeOrmModule.forFeature([Bill, BillParticipant, LedgerEntry, User]),
        UsersModule,
        PaymentsModule,
        S3Module,
        NotificationsModule,
    ],
    providers:   [BillsService, RemindersScheduler],
    controllers: [BillsController],
    exports:     [BillsService],
})
export class BillsModule {}
