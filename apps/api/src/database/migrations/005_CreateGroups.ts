// apps/api/src/database/migrations/005_CreateGroups.ts

import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateGroups0051700000005000 implements MigrationInterface {
    name = 'CreateGroups0051700000005000';

    async up(qr: QueryRunner): Promise<void> {
        await qr.createTable(new Table({
            name: 'groups',
            columns: [
                { name: 'id',             type: 'uuid',        isPrimary: true,  default: 'gen_random_uuid()' },
                { name: 'owner_id',       type: 'uuid',        isNullable: false },
                { name: 'name',           type: 'varchar',     length: '80',     isNullable: false },
                { name: 'avatar_s3_key',  type: 'varchar',     length: '512',    isNullable: true  },
                { name: 'created_at',     type: 'timestamptz', default: 'NOW()', isNullable: false },
                { name: 'updated_at',     type: 'timestamptz', default: 'NOW()', isNullable: false },
            ],
            foreignKeys: [{
                columnNames:           ['owner_id'],
                referencedTableName:   'users',
                referencedColumnNames: ['id'],
                onDelete:              'RESTRICT',
            }],
        }), true);

        await qr.createIndex('groups', new TableIndex({
            name:       'IDX_groups_owner_id',
            columnNames: ['owner_id'],
        }));

        await qr.createTable(new Table({
            name: 'group_members',
            columns: [
                { name: 'group_id',   type: 'uuid',        isPrimary: true, isNullable: false },
                { name: 'user_id',    type: 'uuid',        isPrimary: true, isNullable: false },
                { name: 'joined_at',  type: 'timestamptz', default: 'NOW()', isNullable: false },
            ],
            foreignKeys: [
                {
                    columnNames:           ['group_id'],
                    referencedTableName:   'groups',
                    referencedColumnNames: ['id'],
                    onDelete:              'CASCADE',
                },
                {
                    columnNames:           ['user_id'],
                    referencedTableName:   'users',
                    referencedColumnNames: ['id'],
                    onDelete:              'CASCADE',
                },
            ],
        }), true);
    }

    async down(qr: QueryRunner): Promise<void> {
        await qr.dropTable('group_members', true);
        await qr.dropTable('groups', true);
    }
}
