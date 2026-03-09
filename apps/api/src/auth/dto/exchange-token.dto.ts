// apps/api/src/auth/dto/exchange-token.dto.ts

import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class ExchangeTokenDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(4096)
    idToken: string;
}
