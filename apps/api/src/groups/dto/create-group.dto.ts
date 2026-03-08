// apps/api/src/groups/dto/create-group.dto.ts

import { IsArray, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateGroupDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(80)
    name: string;

    @IsOptional()
    @IsArray()
    @IsUUID(4, { each: true })
    memberIds?: string[];
}
