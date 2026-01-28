// apps/api/src/app.service.ts

import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getStatus(): { status: string } {
    return { status: 'API is running' };
  }
}