// apps/api/src/database/typeorm.config.ts
// Async factory so SecretsService can resolve credentials before the connection opens.

import { Injectable, Logger } from '@nestjs/common';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';
import { SecretsService } from '../secrets/secrets.service';

@Injectable()
export class TypeOrmConfigService implements TypeOrmOptionsFactory {
    private readonly logger = new Logger(TypeOrmConfigService.name);

    constructor(private readonly secrets: SecretsService) {}

    async createTypeOrmOptions(): Promise<TypeOrmModuleOptions> {
        const host     = await this.secrets.getSecret('DB_HOST', 'DB_HOST');
        const port     = await this.secrets.getSecret('DB_PORT', 'DB_PORT');
        const username = await this.secrets.getSecret('DB_USER', 'DB_USER');
        const password = await this.secrets.getSecret('DB_PASS', 'DB_PASS');
        const database = await this.secrets.getSecret('DB_NAME', 'DB_NAME');

        this.logger.log(`Connecting to Postgres at ${host}:${port}/${database}`);

        return {
            type:        'postgres',
            host,
            port:        parseInt(port, 10),
            username,
            password,
            database,
            entities:    [__dirname + '/../**/*.entity.{ts,js}'],
            migrations:  [__dirname + '/migrations/*.{ts,js}'],
            synchronize: false, // always use migrations, never auto-sync
            ssl:         process.env.NODE_ENV === 'production'
                ? { rejectUnauthorized: true }
                : false,
            logging:       process.env.NODE_ENV !== 'production',
            migrationsRun: false,
        };
    }
}
