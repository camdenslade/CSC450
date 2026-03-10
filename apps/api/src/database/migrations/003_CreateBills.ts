// apps/api/src/database/migrations/003_CreateBills.ts

import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateBills0031700000003000 implements MigrationInterface {
    name = 'CreateBills0031700000003000';

    async up(qr: QueryRunner): Promise<void> {
        await qr.createTable(new Table({
            name: 'bills',
            columns: [
                { name: 'id',              type: 'uuid',        isPrimary: true,  default: 'gen_random_uuid()' },
                { name: 'owner_id',        type: 'uuid',        isNullable: false },
                { name: 'name',            type: 'varchar',     length: '120',    isNullable: false },
                { name: 'location',        type: 'varchar',     length: '160',    isNullable: true  },
                { name: 'total_cents',     type: 'int',         isNullable: false },
                { name: 'tax_cents',       type: 'int',         isNullable: false, default: '0'       },
                { name: 'tip_cents',       type: 'int',         isNullable: false, default: '0'       },
                { name: 'currency',        type: 'varchar',     length: '3',      isNullable: false, default: "'USD'" },
                { name: 'notes',           type: 'varchar',     length: '500',    isNullable: true  },
                { name: 'receipt_s3_key',  type: 'varchar',     length: '512',    isNullable: true  },
                { name: 'status',          type: 'varchar',     length: '16',     isNullable: false, default: "'open'" },
                { name: 'created_at',      type: 'timestamptz', default: 'NOW()', isNullable: false },
                { name: 'updated_at',      type: 'timestamptz', default: 'NOW()', isNullable: false },
            ],
            foreignKeys: [{
                columnNames:           ['owner_id'],
                referencedTableName:   'users',
                referencedColumnNames: ['id'],
                onDelete:              'RESTRICT',
            }],
        }), true);

        await qr.createIndex('bills', new TableIndex({
            name:       'IDX_bills_owner_id',
            columnNames: ['owner_id'],
        }));

        await qr.createTable(new Table({
            name: 'bill_participants',
            columns: [
                { name: 'id',                   type: 'uuid',        isPrimary: true,  default: 'gen_random_uuid()' },
                { name: 'bill_id',              type: 'uuid',        isNullable: false },
                { name: 'user_id',              type: 'uuid',        isNullable: true  },
                { name: 'contact_name',         type: 'varchar',     length: '80',     isNullable: true  },
                { name: 'contact_phone_hash',   type: 'varchar',     length: '64',     isNullable: true  },
                { name: 'platform',             type: 'varchar',     length: '16',     isNullable: false },
                { name: 'share_cents',          type: 'int',         isNullable: false },
                { name: 'paid_cents',           type: 'int',         isNullable: false, default: '0'          },
                { name: 'state',                type: 'varchar',     length: '16',     isNullable: false, default: "'pending'" },
                { name: 'payment_link',         type: 'varchar',     length: '1024',   isNullable: true  },
                { name: 'reminders_sent',       type: 'int',         isNullable: false, default: '0'          },
                { name: 'settled_at',           type: 'timestamptz', isNullable: true  },
                { name: 'created_at',           type: 'timestamptz', default: 'NOW()', isNullable: false },
                { name: 'updated_at',           type: 'timestamptz', default: 'NOW()', isNullable: false },
            ],
            foreignKeys: [
                {
                    columnNames:           ['bill_id'],
                    referencedTableName:   'bills',
                    referencedColumnNames: ['id'],
                    onDelete:              'CASCADE',
                },
                {
                    columnNames:           ['user_id'],
                    referencedTableName:   'users',
                    referencedColumnNames: ['id'],
                    onDelete:              'SET NULL',
                },
            ],
        }), true);

        await qr.createIndex('bill_participants', new TableIndex({
            name:       'IDX_bill_participants_bill_id',
            columnNames: ['bill_id'],
        }));

        await qr.createIndex('bill_participants', new TableIndex({
            name:       'IDX_bill_participants_user_id',
            columnNames: ['user_id'],
        }));
    }

    async down(qr: QueryRunner): Promise<void> {
        await qr.dropTable('bill_participants', true);
        await qr.dropTable('bills', true);
    }
}
