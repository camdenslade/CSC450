// apps/api/src/common/decorators/public.decorator.ts

import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

// Mark a route as publicly accessible (no Firebase token required).
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
