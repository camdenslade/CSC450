// apps/ap/src/app.module.ts

import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
// Will add back APP_GUARD when global guards are needed
import { APP_GUARD } from '@nestjs/core';

import { ConfigModule } from '@nestjs/config';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
        }),
    ],
    providers: [
        // Global guards can be added here
    ],
})

export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        // Apply middleware here if needed
    }
}