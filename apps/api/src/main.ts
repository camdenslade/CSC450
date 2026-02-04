// apps/api/src/main.ts

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { config } from 'dotenv';
import 'reflect-metadata';

config(); // Load environment variables from .env file

const AWS_REGION_PATTERN = /^[a-z]{2}(-[a-z]+){1,3}-\d+$/;

function sanitizeAwsRegion(value: string): string {
    const normalized = value.trim().toLowerCase();
    if (!AWS_REGION_PATTERN.test(normalized)) {
        throw new Error(`Invalid AWS region format: ${value}`);
    }
    return normalized;
}

function validateEnvironment(): void {
    const requiredVars = [
        'PHONE_HASH_SALT',
        'DB_HOST',
        'DB_PORT',
        'DB_USER',
        'DB_PASS',
        'DB_NAME',
    ]; 
}

async function bootstrap() {
    validateEnvironment();
    const app = await NestFactory.create(AppModule, {
        logger: ['error', 'warn', 'log']
    });

    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));

    const frontendOrigins = process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
        : [];

    const defaultOrigins = [
        'http://localhost:3000',
        'http://localhost:5173',
        'http://localhost:4200',
        'https://ec2-3-80-28-75.compute-1.amazonaws.com/',
    ];

    const allowedOrigins = [...new Set([...frontendOrigins, ...defaultOrigins])];

    app.enableCors({
        origin: (
            origin: string | undefined,
            callback: (err: Error | null, allow?: boolean) => void,
        ) => {
        if (!origin) {
            return callback(null, true);
        }

        const normalizedOrigin = origin.replace(/\/$/, '');
        const isAllowed = allowedOrigins.some(
            (allowed) => allowed === normalizedOrigin || allowed === origin,
        );

        if (isAllowed) {
        callback(null, true);
      } else {
        if (process.env.NODE_ENV !== 'production') {
          console.warn(`CORS blocked origin: ${origin}`);
          console.warn(`Normalized: ${normalizedOrigin}`);
          console.warn(`Allowed origins: ${allowedOrigins.join(', ')}`);
        }
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH','OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
    ],
    maxAge: 86400,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  await app.listen(process.env.PORT || 3000);
}

void bootstrap();
        