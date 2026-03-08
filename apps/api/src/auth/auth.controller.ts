// apps/api/src/auth/auth.controller.ts

import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { ExchangeTokenDto } from './dto/exchange-token.dto';
import { Public } from '../common/decorators/public.decorator';

@Controller('v1/auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    // Tighter rate limit here to slow down token-stuffing attempts
    @Public()
    @Post('exchange')
    @HttpCode(HttpStatus.OK)
    @Throttle({ default: { limit: 10, ttl: 60_000 } })
    async exchange(@Body() dto: ExchangeTokenDto) {
        const user = await this.authService.exchangeToken(dto.idToken);
        return { userId: user.id, displayName: user.displayName };
    }
}
