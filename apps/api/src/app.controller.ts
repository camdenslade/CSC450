// apps/api/src/app.controller.ts

import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('status')
  getStatus(): { status: string } {
    return { status: 'API is running' };
  }
}