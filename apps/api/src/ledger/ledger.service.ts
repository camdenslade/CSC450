// apps/api/src/ledger/ledger.service.ts

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { LedgerEntry } from './ledger-entry.entity';

export interface LedgerPage {
    items:      LedgerEntryView[];
    nextCursor: string | null;
}

export interface LedgerEntryView {
    tabId:     string;
    tabName:   string;
    delta:     number;
    settled:   boolean;
    createdAt: Date;
}

@Injectable()
export class LedgerService {
    constructor(
        @InjectRepository(LedgerEntry)
        private readonly ledger: Repository<LedgerEntry>,
    ) {}

    // Cursor-paginated ledger history. Cursor is an ISO timestamp.
    // Positive delta = owed money, negative = owes money.
    async getLedger(userDbId: string, cursor?: string, limit = 20): Promise<LedgerPage> {
        const safeLimit = Math.min(limit, 100);
        const where: Record<string, unknown> = { userId: userDbId };

        if (cursor) where['createdAt'] = LessThan(new Date(cursor));

        const entries = await this.ledger.find({
            where,
            relations: ['bill'],
            order:     { createdAt: 'DESC' },
            take:      safeLimit + 1,
        });

        const hasMore = entries.length > safeLimit;
        const page    = hasMore ? entries.slice(0, safeLimit) : entries;

        const items: LedgerEntryView[] = page.map((e) => ({
            tabId:     e.billId,
            tabName:   e.bill?.name ?? 'Tab',
            delta:     e.deltaCents,
            settled:   e.settledAt !== null,
            createdAt: e.createdAt,
        }));

        return {
            items,
            nextCursor: hasMore ? page[page.length - 1].createdAt.toISOString() : null,
        };
    }
}
