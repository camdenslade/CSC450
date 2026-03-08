// apps/api/src/payments/dto/generate-link.dto.ts

import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { Platform } from '../../common/enums';

export class GenerateLinkDto {
    // The user whose payment handle will receive the funds
    @IsUUID(4)
    payeeUserId: string;

    @IsEnum(Platform)
    platform: Platform;

    // Amount in cents - validated server-side, never trusted from client
    @IsInt()
    @Min(1)
    @Max(999_999_99) // $999,999.99 upper bound
    amountCents: number;

    @IsOptional()
    @IsString()
    @MaxLength(256)
    note?: string;
}
