import { MigrationInterface, QueryRunner } from 'typeorm';

export class ParticipantRemindAt1776980000000 implements MigrationInterface {
    async up(qr: QueryRunner): Promise<void> {
        await qr.query(`
            ALTER TABLE bill_participants
            ADD COLUMN IF NOT EXISTS remind_at TIMESTAMPTZ NULL;
        `);
        await qr.query(`
            CREATE INDEX IF NOT EXISTS IDX_participants_remind_at
            ON bill_participants (remind_at)
            WHERE remind_at IS NOT NULL AND state = 'pending';
        `);
    }

    async down(qr: QueryRunner): Promise<void> {
        await qr.query(`DROP INDEX IF EXISTS IDX_participants_remind_at;`);
        await qr.query(`ALTER TABLE bill_participants DROP COLUMN IF EXISTS remind_at;`);
    }
}
