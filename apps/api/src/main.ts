// apps/api/src/main.ts

import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { config } from 'dotenv';
import 'reflect-metadata';
import helmet from 'helmet';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { FirebaseAuthGuard } from './common/guards/firebase-auth.guard';

// Load .env for local dev - Secrets Manager takes precedence on EC2
config();

const AWS_REGION_PATTERN = /^[a-z]{2}(-[a-z]+){1,3}-\d+$/;

function sanitizeAwsRegion(value: string): string {
    const normalized = value.trim().toLowerCase();
    if (!AWS_REGION_PATTERN.test(normalized)) {
        throw new Error(`Invalid AWS region format: ${value}`);
    }
    return normalized;
}

async function bootstrap(): Promise<void> {
    const app = await NestFactory.create(AppModule, {
        logger:     ['error', 'warn', 'log'],
        bodyParser: true,
    });

    // Security headers - applied first so every response is covered
    app.use(
        helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc:     ["'none'"],
                    frameAncestors: ["'none'"],
                },
            },
            noSniff:        true,
            frameguard:     { action: 'deny' },
            hidePoweredBy:  true,
            hsts: process.env.NODE_ENV === 'production'
                ? { maxAge: 31_536_000, includeSubDomains: true, preload: true }
                : false,
            referrerPolicy: { policy: 'no-referrer' },
        }),
    );

    // Controllers use /v1/* so final paths resolve to /api/v1/*
    app.setGlobalPrefix('api');

    app.useGlobalPipes(new ValidationPipe({
        whitelist:            true,
        forbidNonWhitelisted: true,
        transform:            true,
        transformOptions:     { enableImplicitConversion: false },
    }));

    app.useGlobalFilters(new GlobalExceptionFilter());
    app.useGlobalInterceptors(new LoggingInterceptor());

    // Global Firebase auth guard - routes decorated with @Public() skip it
    const reflector = app.get(Reflector);
    app.useGlobalGuards(new FirebaseAuthGuard(reflector));

    const frontendOrigins = process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
        : [];

    const defaultOrigins = [
        'http://localhost:3000',
        'http://localhost:5173',
        'http://localhost:4200',
    ];

    const allowedOrigins = [...new Set([...frontendOrigins, ...defaultOrigins])];

    app.enableCors({
        origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
            // No Origin header means mobile app, Postman, or server-to-server
            if (!origin) return callback(null, true);

            const normalized = origin.replace(/\/$/, '');
            const allowed    = allowedOrigins.some((o) => o === normalized || o === origin);

            if (allowed) {
                callback(null, true);
            } else {
                if (process.env.NODE_ENV !== 'production') {
                    console.warn(`CORS blocked: ${origin}`);
                }
                callback(new Error('Not allowed by CORS'));
            }
        },
        credentials:          true,
        methods:              ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders:       ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
        maxAge:               86400,
        preflightContinue:    false,
        optionsSuccessStatus: 204,
    });

    const port = parseInt(process.env.PORT ?? '3000', 10);
    await app.listen(port);
    console.log(`TabUp API listening on port ${port}`);
}

void bootstrap();
