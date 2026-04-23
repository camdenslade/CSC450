// apps/api/src/database/migrations/006_LedgerCompoundIndex.ts
// Adds a compound index on (user_id, created_at DESC) so the ledger query
// "WHERE user_id = X ORDER BY created_at DESC LIMIT N" uses an index-only scan.

import { MigrationInterface, QueryRunner, TableIndex } from 'typeorm';

export class LedgerCompoundIndex0061700000006000 implements MigrationInterface {
    name = 'LedgerCompoundIndex0061700000006000';

    async up(qr: QueryRunner): Promise<void> {
        // Drop the single-column user_id index — the compound one covers it.
        await qr.dropIndex('ledger_entries', 'IDX_ledger_user_id');

        await qr.createIndex('ledger_entries', new TableIndex({
            name:        'IDX_ledger_user_created',
            columnNames: ['user_id', 'created_at'],
        }));
    }

    async down(qr: QueryRunner): Promise<void> {
        await qr.dropIndex('ledger_entries', 'IDX_ledger_user_created');
        await qr.createIndex('ledger_entries', new TableIndex({
            name:        'IDX_ledger_user_id',
            columnNames: ['user_id'],
        }));
    }
}
