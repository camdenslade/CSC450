import { MigrationInterface, QueryRunner } from 'typeorm';

export class BillShareToken1776990000000 implements MigrationInterface {
    async up(qr: QueryRunner): Promise<void> {
        await qr.query(`
            ALTER TABLE bills
            ADD COLUMN IF NOT EXISTS share_token UUID NULL;
        `);
        await qr.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS IDX_bills_share_token
            ON bills (share_token)
            WHERE share_token IS NOT NULL;
        `);
    }

    async down(qr: QueryRunner): Promise<void> {
        await qr.query(`DROP INDEX IF EXISTS IDX_bills_share_token;`);
        await qr.query(`ALTER TABLE bills DROP COLUMN IF EXISTS share_token;`);
    }
}
