// apps/api/src/common/guards/firebase-auth.guard.ts

import {
    CanActivate,
    ExecutionContext,
    Injectable,
    Logger,
    UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { getAuth } from 'firebase-admin/auth';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

// Attached to the request after successful verification
export interface AuthenticatedUser {
    uid:          string;
    email?:       string;
    phone?:       string;
    displayName?: string;
}

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
    private readonly logger = new Logger(FirebaseAuthGuard.name);

    constructor(private readonly reflector: Reflector) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        // Routes decorated with @Public() skip auth entirely
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (isPublic) {
            return true;
        }

        const request = context.switchToHttp().getRequest<Request>();
        const token   = this.extractBearer(request);

        if (!token) {
            throw new UnauthorizedException('Missing or malformed Authorization header.');
        }

        try {
            const decoded = await getAuth().verifyIdToken(token, /* checkRevoked */ true);

            // Surface only what downstream services need; never store the raw token
            const user: AuthenticatedUser = {
                uid:         decoded.uid,
                email:       decoded.email,
                phone:       decoded.phone_number,
                displayName: decoded.name,
            };

            (request as unknown as Record<string, unknown>)['user'] = user;
            return true;
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            this.logger.warn(`Token verification failed: ${msg}`);
            throw new UnauthorizedException('Invalid or expired token.');
        }
    }

    private extractBearer(request: Request): string | null {
        const authHeader = request.headers['authorization'];
        if (typeof authHeader !== 'string') return null;

        const parts = authHeader.split(' ');
        // Require exactly "Bearer <token>" - reject anything else to avoid type confusion
        if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') return null;

        return parts[1] ?? null;
    }
}
