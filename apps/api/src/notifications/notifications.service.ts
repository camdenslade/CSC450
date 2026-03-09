// apps/api/src/notifications/notifications.service.ts
// Stub - push and Twilio SMS delivery to be wired in a follow-up.
// Delivery tiers: push (Expo/APNs/FCM) then SMS fallback via Twilio.

import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class NotificationsService {
    private readonly logger = new Logger(NotificationsService.name);

    async sendReminder(participantId: string): Promise<void> {
        // TODO: push via Expo SDK / APNs / FCM, then Twilio SMS fallback
        this.logger.log(`Reminder queued for participant ${participantId} (not yet implemented).`);
    }
}
