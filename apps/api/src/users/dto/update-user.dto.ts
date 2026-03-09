// apps/api/src/users/dto/update-user.dto.ts

import {
    IsEnum,
    IsOptional,
    IsString,
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
}
