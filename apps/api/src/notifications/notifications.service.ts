// apps/api/src/notifications/notifications.service.ts
// Delivery: Expo Push API (tier 1). No external SDK needed — Expo's push service
// handles APNs/FCM routing. SMS fallback (Twilio) left for a future pass.

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User } from '../users/user.entity';

interface ExpoPushMessage {
    to: string;
    title: string;
    body: string;
    data?: Record<string, unknown>;
    sound?: 'default';
    badge?: number;
}

interface ExpoPushTicket {
    status: 'ok' | 'error';
    id?: string;
    message?: string;
    details?: { error?: string };
}

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

@Injectable()
export class NotificationsService {
    private readonly logger = new Logger(NotificationsService.name);

    constructor(
        @InjectRepository(User)
        private readonly users: Repository<User>,
    ) {}

    // Send to one or more user DB IDs. Silently skips users without push tokens.
    async sendToUsers(
        userIds: string[],
        title: string,
        body: string,
        data?: Record<string, unknown>,
    ): Promise<void> {
        if (userIds.length === 0) return;

        const targets = await this.users.find({
            where: { id: In(userIds) },
            select: ['id', 'pushToken'],
        });

        const messages: ExpoPushMessage[] = targets
            .filter((u) => u.pushToken && u.pushToken.startsWith('ExponentPushToken['))
            .map((u) => ({
                to:    u.pushToken!,
                title,
                body,
                sound: 'default',
                ...(data ? { data } : {}),
            }));

        if (messages.length === 0) return;

        // Expo recommends batches of ≤100
        for (let i = 0; i < messages.length; i += 100) {
            const batch = messages.slice(i, i + 100);
            try {
                const res = await fetch(EXPO_PUSH_URL, {
                    method:  'POST',
                    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                    body:    JSON.stringify(batch),
                });

                if (!res.ok) {
                    this.logger.warn(`Expo push batch failed: ${res.status} ${await res.text()}`);
                    continue;
                }

                const json = (await res.json()) as { data: ExpoPushTicket[] };
                for (const ticket of json.data ?? []) {
                    if (ticket.status === 'error') {
                        this.logger.warn(`Push ticket error: ${ticket.message} (${ticket.details?.error})`);
                    }
                }
            } catch (err) {
                this.logger.error('Expo push request threw', err);
            }
        }
    }

    // Convenience: notify participants on a bill that a reminder was sent.
    async sendReminder(participantUserId: string, billName: string): Promise<void> {
        await this.sendToUsers(
            [participantUserId],
            'Payment reminder',
            `You have an outstanding balance on "${billName}". Tap to review.`,
            { type: 'reminder' },
        );
    }
}
