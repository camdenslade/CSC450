// apps/api/src/uploads/uploads.controller.ts

import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard';
import { UploadsService } from './uploads.service';
import { PresignDto } from './dto/presign.dto';

@UseGuards(FirebaseAuthGuard)
@Controller('v1/uploads')
export class UploadsController {
    constructor(private readonly uploadsService: UploadsService) {}

    @Post('presign')
    presign(@Body() dto: PresignDto) {
        return this.uploadsService.presign(dto);
    }
}
