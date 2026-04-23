import { IsUUID } from 'class-validator';

export class AddMemberDto {
    @IsUUID(4)
    userId: string;
}
