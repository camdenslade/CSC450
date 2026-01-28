// apps/api/src/secrets/secrets.module.ts

import { Module, Global } from '@nestjs/common';
import { SecretsService } from './secrets.service';

// The global decorator makes the module available across the entire application
@Global()
@Module({
    providers: [SecretsService],
    exports: [SecretsService],
})
export class SecretsModule {}