// apps/api/src/database/data-source.ts
// Standalone DataSource for the TypeORM migration CLI.
// Env vars must be present before running migrations.
// On EC2 these come from the shell env populated via Secrets Manager.
// Locally, source a .env file (never commit it) before running.

import 'reflect-metadata';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';

config();

const {
    DB_HOST  = 'localhost',
    DB_PORT  = '5432',
    DB_USER  = 'postgres',
    DB_PASS  = '',
    DB_NAME  = 'tabup',
    NODE_ENV = 'development',
} = process.env;

export const AppDataSource = new DataSource({
    type:        'postgres',
    host:        DB_HOST,
    port:        parseInt(DB_PORT, 10),
    username:    DB_USER,
    password:    DB_PASS,
    database:    DB_NAME,
    entities:    [__dirname + '/../**/*.entity.{ts,js}'],
    migrations:  [__dirname + '/migrations/*.{ts,js}'],
    synchronize: false,
    ssl:         NODE_ENV === 'production' ? { rejectUnauthorized: true } : false,
    logging:     NODE_ENV !== 'production',
});
