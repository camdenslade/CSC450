// apps/api/src/common/filters/http-exception.filter.ts

import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { randomUUID } from 'crypto';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(GlobalExceptionFilter.name);

    catch(exception: unknown, host: ArgumentsHost): void {
        const ctx       = host.switchToHttp();
        const response  = ctx.getResponse<Response>();
        const request   = ctx.getRequest<Request>();
        const requestId = randomUUID();

        let status  = HttpStatus.INTERNAL_SERVER_ERROR;
        let code    = 'internal_server_error';
        let message = 'An unexpected error occurred.';

        if (exception instanceof HttpException) {
            status = exception.getStatus();
            const body = exception.getResponse();

            if (typeof body === 'string') {
                message = body;
            } else if (typeof body === 'object' && body !== null) {
                const b = body as Record<string, unknown>;
                message = typeof b['message'] === 'string'
                    ? b['message']
                    : Array.isArray(b['message'])
                        ? (b['message'] as string[]).join('; ')
                        : message;
            }

            // Map status codes to semantic error codes
            code = HTTP_STATUS_TO_CODE[status] ?? 'http_error';
        } else if (exception instanceof Error) {
            // Log full detail for unexpected errors but never expose internals
            this.logger.error(
                `Unhandled exception on ${request.method} ${request.url} [${requestId}]: ${exception.message}`,
                exception.stack,
            );
        }

        // Avoid leaking stack traces or internal messages in production
        response.status(status).json({
            error:     code,
            message,
            requestId,
        });
    }
}

const HTTP_STATUS_TO_CODE: Record<number, string> = {
    400: 'validation_failed',
    401: 'unauthorized',
    403: 'forbidden',
    404: 'not_found',
    409: 'conflict',
    422: 'unprocessable',
    429: 'rate_limited',
    500: 'internal_server_error',
};
