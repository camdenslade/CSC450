// apps/api/src/database/migrations/002_CreateFriends.ts

import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateFriends0021700000002000 implements MigrationInterface {
    name = 'CreateFriends0021700000002000';

    async up(qr: QueryRunner): Promise<void> {
        await qr.createTable(new Table({
            name: 'friends',
            columns: [
                { name: 'id',            type: 'uuid',        isPrimary: true,  default: 'gen_random_uuid()' },
                { name: 'requester_id',  type: 'uuid',        isNullable: false },
                { name: 'recipient_id',  type: 'uuid',        isNullable: false },
                { name: 'status',        type: 'varchar',     length: '16',     isNullable: false, default: "'pending'" },
                { name: 'source',        type: 'varchar',     length: '16',     isNullable: false, default: "'manual'"  },
                { name: 'created_at',    type: 'timestamptz', default: 'NOW()', isNullable: false },
                { name: 'updated_at',    type: 'timestamptz', default: 'NOW()', isNullable: false },
            ],
            foreignKeys: [
                {
                    columnNames:           ['requester_id'],
                    referencedTableName:   'users',
                    referencedColumnNames: ['id'],
                    onDelete:              'CASCADE',
                },
                {
                    columnNames:           ['recipient_id'],
                    referencedTableName:   'users',
                    referencedColumnNames: ['id'],
                    onDelete:              'CASCADE',
                },
            ],
        }), true);

        await qr.createIndex('friends', new TableIndex({
            name:       'UQ_friends_requester_recipient',
            columnNames: ['requester_id', 'recipient_id'],
            isUnique:   true,
        }));

        await qr.createIndex('friends', new TableIndex({
            name:       'IDX_friends_requester',
            columnNames: ['requester_id'],
        }));

        await qr.createIndex('friends', new TableIndex({
            name:       'IDX_friends_recipient',
            columnNames: ['recipient_id'],
        }));
    }

    async down(qr: QueryRunner): Promise<void> {
        await qr.dropTable('friends', true);
    }
}
