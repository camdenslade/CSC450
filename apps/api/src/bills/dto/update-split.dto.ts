// apps/api/src/bills/dto/update-split.dto.ts

import {
    IsArray,
    IsInt,
    IsUUID,
    Max,
    Min,
    ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class SplitItemDto {
    @IsUUID(4)
    participantId: string;

    @IsInt()
    @Min(0)
    @Max(999_999_99)
    share: number;
}

export class UpdateSplitDto {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => SplitItemDto)
    splits: SplitItemDto[];
}
