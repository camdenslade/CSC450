// apps/api/src/payments/payments.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PaymentHandle } from './payment-handle.entity';
import { UsersModule } from '../users/users.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([PaymentHandle]),
        UsersModule,
    ],
    providers:   [PaymentsService],
    controllers: [PaymentsController],
    exports:     [PaymentsService],
})
export class PaymentsModule {}
