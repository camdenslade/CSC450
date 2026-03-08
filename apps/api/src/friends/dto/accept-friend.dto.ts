// apps/api/src/friends/dto/accept-friend.dto.ts

import { IsUUID } from 'class-validator';

export class AcceptFriendDto {
    @IsUUID(4)
    friendId: string;
}
