import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BillsService } from './bills.service';

@Injectable()
export class RemindersScheduler {
    private readonly logger = new Logger(RemindersScheduler.name);

    constructor(private readonly billsService: BillsService) {}

    @Cron(CronExpression.EVERY_30_MINUTES)
    async fireScheduledReminders(): Promise<void> {
        try {
            await this.billsService.fireScheduledReminders();
        } catch (err) {
            this.logger.error('Scheduled reminders job failed', err instanceof Error ? err.stack : String(err));
        }
    }
}
