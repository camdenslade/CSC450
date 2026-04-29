import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateGroupDto {
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    @MaxLength(80)
    name?: string;

    @IsOptional()
    @IsString()
    avatarS3Key?: string;
}
