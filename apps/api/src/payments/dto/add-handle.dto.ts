// apps/api/src/payments/dto/add-handle.dto.ts

import { IsEnum, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { Platform } from '../../common/enums';

// Each platform has its own handle format. Validation is enforced by the service
// in addition to the regex guards here to prevent SSRF or injection via handle values.
export class AddHandleDto {
    @IsEnum(Platform)
    platform: Platform;

    // Stored without any prefix (@, $). Allowed chars are intentionally narrow.
    @IsString()
    @MinLength(1)
    @MaxLength(64)
    @Matches(/^[a-zA-Z0-9._-]+$/, {
        message: 'Handle may only contain letters, numbers, dots, hyphens, and underscores.',
    })
    handle: string;
}
