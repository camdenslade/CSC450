// apps/api/src/users/dto/update-user.dto.ts

import {
    IsEmail,
    IsEnum,
    IsOptional,
    IsString,
    Matches,
    MaxLength,
    MinLength,
} from 'class-validator';
import { Platform } from '../../common/enums';

export class UpdateUserDto {
    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(80)
    displayName?: string;

    @IsOptional()
    @IsEnum(Platform)
    defaultPlatform?: Platform;

    // Raw phone - normalized and hashed before storage; never persisted in clear text.
    // E.164 format recommended but any non-empty string up to 20 chars is accepted.
    @IsOptional()
    @IsString()
    @MaxLength(20)
    phone?: string;

    // Raw email - normalized and hashed before storage; never persisted in clear text.
    @IsOptional()
    @IsEmail()
    @MaxLength(254)
    email?: string;
}
