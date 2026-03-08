// apps/api/src/notifications/notifications.module.ts

import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

@Module({
    providers: [NotificationsService],
    exports:   [NotificationsService],
})
export class NotificationsModule {}
