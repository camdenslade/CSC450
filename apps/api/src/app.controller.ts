// apps/api/src/app.controller.ts

import { Controller, Get } from '@nestjs/common';
import { Public } from './common/decorators/public.decorator';

@Controller()
export class AppController {
  @Public()
  @Get('status')
  getStatus(): { status: string } {
    return { status: 'ok' };
  }
}