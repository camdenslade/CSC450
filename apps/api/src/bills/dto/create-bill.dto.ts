// apps/api/src/bills/dto/create-bill.dto.ts

import {
    IsArray,
    IsEnum,
    IsInt,
    IsISO4217CurrencyCode,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUUID,
    Max,
    MaxLength,
    Min,
    ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Platform } from '../../common/enums';

class ExternalContactDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(80)
    name: string;

    // Raw phone - hashed on arrival; never logged or persisted in clear text
    @IsOptional()
    @IsString()
    @MaxLength(20)
    phone?: string;
}

class ParticipantDto {
    // Either a registered user ID or an external contact - not both
    @IsOptional()
    @IsUUID(4)
    userId?: string;

    @IsOptional()
    @ValidateNested()
    @Type(() => ExternalContactDto)
    contact?: ExternalContactDto;

    @IsEnum(Platform)
    platform: Platform;

    // Share in cents; server re-validates totals against bill.totalCents
    @IsInt()
    @Min(1)
    @Max(999_999_99)
    share: number;
}

export class CreateBillDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(120)
    name: string;

    @IsOptional()
    @IsString()
    @MaxLength(160)
    location?: string;

    @IsInt()
    @Min(1)
    @Max(999_999_99)
    total: number;

    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(999_999_99)
    tax?: number;

    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(999_999_99)
    tip?: number;

    @IsOptional()
    @IsISO4217CurrencyCode()
    currency?: string;

    @IsOptional()
    @IsString()
    @MaxLength(500)
    notes?: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ParticipantDto)
    participants: ParticipantDto[];
}
