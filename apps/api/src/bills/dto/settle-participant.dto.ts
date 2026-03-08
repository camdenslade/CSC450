// apps/api/src/bills/dto/settle-participant.dto.ts

import { IsUUID } from 'class-validator';

export class SettleParticipantDto {
    @IsUUID(4)
    participantId: string;
}
