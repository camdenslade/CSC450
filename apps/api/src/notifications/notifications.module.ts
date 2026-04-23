// apps/api/src/notifications/notifications.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/user.entity';
import { NotificationsService } from './notifications.service';

@Module({
    imports:   [TypeOrmModule.forFeature([User])],
    providers: [NotificationsService],
    exports:   [NotificationsService],
})
export class NotificationsModule {}
