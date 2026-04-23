import { IsUUID, IsInt, Min, Max, IsOptional } from 'class-validator';

export class RemindParticipantDto {
    @IsUUID()
    participantId: string;

    // If provided, schedule the reminder this many days from now instead of sending immediately.
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(30)
    delayDays?: number;
}
