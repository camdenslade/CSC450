// apps/api/src/friends/dto/invite-by-id.dto.ts

import { IsUUID } from 'class-validator';

export class InviteByIdDto {
    @IsUUID(4)
    targetUserId: string;
}
