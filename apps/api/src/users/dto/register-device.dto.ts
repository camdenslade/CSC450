// apps/api/src/users/dto/register-device.dto.ts

import { IsIn, IsString, MaxLength, IsNotEmpty } from 'class-validator';

export class RegisterDeviceDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(512)
    pushToken: string;

    @IsIn(['ios', 'android', 'web'])
    platform: 'ios' | 'android' | 'web';
}
