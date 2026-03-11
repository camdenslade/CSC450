// apps/api/src/database/migrations/004_CreateLedger.ts

import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateLedger0041700000004000 implements MigrationInterface {
    name = 'CreateLedger0041700000004000';

    async up(qr: QueryRunner): Promise<void> {
        await qr.createTable(new Table({
            name: 'ledger_entries',
            columns: [
                { name: 'id',          type: 'uuid',        isPrimary: true,  default: 'gen_random_uuid()' },
                { name: 'user_id',     type: 'uuid',        isNullable: false },
                { name: 'bill_id',     type: 'uuid',        isNullable: false },
                { name: 'delta_cents', type: 'int',         isNullable: false },
                { name: 'settled_at',  type: 'timestamptz', isNullable: true  },
                { name: 'created_at',  type: 'timestamptz', default: 'NOW()', isNullable: false },
                { name: 'updated_at',  type: 'timestamptz', default: 'NOW()', isNullable: false },
            ],
            foreignKeys: [
                {
                    columnNames:           ['user_id'],
                    referencedTableName:   'users',
                    referencedColumnNames: ['id'],
                    onDelete:              'CASCADE',
                },
                {
                    columnNames:           ['bill_id'],
                    referencedTableName:   'bills',
                    referencedColumnNames: ['id'],
                    onDelete:              'CASCADE',
                },
            ],
        }), true);

        await qr.createIndex('ledger_entries', new TableIndex({
            name:       'IDX_ledger_user_id',
            columnNames: ['user_id'],
        }));

        await qr.createIndex('ledger_entries', new TableIndex({
            name:       'IDX_ledger_bill_id',
            columnNames: ['bill_id'],
        }));
    }

    async down(qr: QueryRunner): Promise<void> {
        await qr.dropTable('ledger_entries', true);
    }
}
