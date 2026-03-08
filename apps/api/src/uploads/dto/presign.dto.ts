// apps/api/src/uploads/dto/presign.dto.ts

import { IsIn, IsInt, IsNotEmpty, IsString, Max, Min } from 'class-validator';

export class PresignDto {
    @IsIn(['receipt', 'avatar'])
    purpose: 'receipt' | 'avatar';

    @IsIn(['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])
    mime: string;

    @IsInt()
    @Min(1)
    @Max(10 * 1024 * 1024) // 10 MB
    size: number;
}
