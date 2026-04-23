import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UpdateGroupDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(80)
    name: string;
}
