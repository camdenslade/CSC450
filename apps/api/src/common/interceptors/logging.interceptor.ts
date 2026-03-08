// apps/api/src/common/interceptors/logging.interceptor.ts

import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';
import { randomUUID } from 'crypto';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
    private readonly logger = new Logger('HTTP');

    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        const request   = context.switchToHttp().getRequest<Request>();
        const requestId = randomUUID();
        const startTime = Date.now();

        // Attach requestId to the request object so downstream services can use it
        (request as unknown as Record<string, unknown>)['requestId'] = requestId;

        const { method, url } = request;

        return next.handle().pipe(
            tap({
                next: () => {
                    const ms = Date.now() - startTime;
                    this.logger.log(`${method} ${url} [${requestId}] ${ms}ms`);
                },
                error: () => {
                    const ms = Date.now() - startTime;
                    this.logger.warn(`${method} ${url} [${requestId}] ${ms}ms ERROR`);
                },
            }),
        );
    }
}
