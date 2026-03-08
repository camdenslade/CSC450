// apps/api/src/common/decorators/current-user.decorator.ts

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { AuthenticatedUser } from '../guards/firebase-auth.guard';

// Pulls the verified Firebase user off the request - use on controller params.
// FirebaseAuthGuard must run before this decorator is evaluated.
export const CurrentUser = createParamDecorator(
    (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
        const request = ctx.switchToHttp().getRequest<Request>();
        return ((request as unknown) as Record<string, unknown>)['user'] as AuthenticatedUser;
    },
);
