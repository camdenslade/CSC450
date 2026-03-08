// apps/api/src/friends/dto/invite-friend.dto.ts

import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';

export class InviteFriendDto {
    @IsIn(['phone', 'email'])
    target: 'phone' | 'email';

    // The raw value is never stored; it is hashed immediately on receipt
    @IsString()
    @MinLength(3)
    @MaxLength(254)
    value: string;
}
