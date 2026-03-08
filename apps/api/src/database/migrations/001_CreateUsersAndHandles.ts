// apps/api/src/database/migrations/001_CreateUsersAndHandles.ts

import {
    MigrationInterface,
    QueryRunner,
    Table,
    TableIndex,
} from 'typeorm';

export class CreateUsersAndHandles001 implements MigrationInterface {
    name = 'CreateUsersAndHandles001';

    async up(qr: QueryRunner): Promise<void> {
        await qr.createTable(new Table({
            name: 'users',
            columns: [
                { name: 'id',                  type: 'uuid',        isPrimary: true,   default: 'gen_random_uuid()' },
                { name: 'auth_provider_uid',   type: 'varchar',     length: '128',     isNullable: false },
                { name: 'display_name',        type: 'varchar',     length: '80',      isNullable: false },
                { name: 'avatar_s3_key',       type: 'varchar',     length: '512',     isNullable: true  },
                { name: 'phone_hash',          type: 'varchar',     length: '64',      isNullable: true  },
                { name: 'email_hash',          type: 'varchar',     length: '64',      isNullable: true  },
                { name: 'default_platform',    type: 'varchar',     length: '16',      isNullable: true  },
                { name: 'push_token',          type: 'varchar',     length: '512',     isNullable: true  },
                { name: 'push_platform',       type: 'varchar',     length: '16',      isNullable: true  },
                { name: 'created_at',          type: 'timestamptz', default: 'NOW()',  isNullable: false },
                { name: 'updated_at',          type: 'timestamptz', default: 'NOW()',  isNullable: false },
            ],
        }), true);

        await qr.createIndex('users', new TableIndex({
            name:       'UQ_users_auth_provider_uid',
            columnNames: ['auth_provider_uid'],
            isUnique:   true,
        }));

        await qr.createIndex('users', new TableIndex({
            name:       'IDX_users_phone_hash',
            columnNames: ['phone_hash'],
        }));

        await qr.createIndex('users', new TableIndex({
            name:       'IDX_users_email_hash',
            columnNames: ['email_hash'],
        }));

        // payment_handles
        await qr.createTable(new Table({
            name: 'payment_handles',
            columns: [
                { name: 'id',          type: 'uuid',        isPrimary: true,  default: 'gen_random_uuid()' },
                { name: 'user_id',     type: 'uuid',        isNullable: false },
                { name: 'platform',    type: 'varchar',     length: '16',     isNullable: false },
                { name: 'handle',      type: 'varchar',     length: '64',     isNullable: false },
                { name: 'verified_at', type: 'timestamptz', isNullable: true  },
                { name: 'created_at',  type: 'timestamptz', default: 'NOW()', isNullable: false },
                { name: 'updated_at',  type: 'timestamptz', default: 'NOW()', isNullable: false },
            ],
            foreignKeys: [{
                columnNames:            ['user_id'],
                referencedTableName:    'users',
                referencedColumnNames:  ['id'],
                onDelete:               'CASCADE',
            }],
        }), true);

        await qr.createIndex('payment_handles', new TableIndex({
            name:       'UQ_payment_handles_user_platform',
            columnNames: ['user_id', 'platform'],
            isUnique:   true,
        }));
    }

    async down(qr: QueryRunner): Promise<void> {
        await qr.dropTable('payment_handles', true);
        await qr.dropTable('users', true);
    }
}
