// apps/api/src/app.module.ts

import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';

import { SecretsModule } from './secrets/secrets.module';
import { TypeOrmConfigService } from './database/typeorm.config';

import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PaymentsModule } from './payments/payments.module';
import { FriendsModule } from './friends/friends.module';
import { BillsModule } from './bills/bills.module';
import { LedgerModule } from './ledger/ledger.module';
import { GroupsModule } from './groups/groups.module';
import { UploadsModule } from './uploads/uploads.module';
import { NotificationsModule } from './notifications/notifications.module';
import { S3Module } from './s3/s3.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),

        // Global - all modules can inject SecretsService without importing SecretsModule
        SecretsModule,

        // Async factory resolves DB credentials from SecretsService before opening the connection
        TypeOrmModule.forRootAsync({
            imports:  [SecretsModule],
            useClass: TypeOrmConfigService,
        }),

        // 100 req/min per IP globally; tighten per route with @Throttle()
        ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 100 }]),
        ScheduleModule.forRoot(),

        AuthModule,
        UsersModule,
        PaymentsModule,
        FriendsModule,
        BillsModule,
        LedgerModule,
        GroupsModule,
        UploadsModule,
        NotificationsModule,
        S3Module,
    ],
    controllers: [AppController],
    providers:   [AppService],
})
export class AppModule implements NestModule {
    configure(_consumer: MiddlewareConsumer): void {
        // Per-route middleware goes here when needed
    }
}
