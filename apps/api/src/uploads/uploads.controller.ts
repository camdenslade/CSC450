// apps/api/src/uploads/uploads.controller.ts

import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
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

    /** POST /v1/uploads/ocr — body: { image: "<base64 jpeg>" } */
    @Post('ocr')
    @HttpCode(HttpStatus.OK)
    @Throttle({ default: { ttl: 60_000, limit: 5 } })
    ocrBill(@Body() body: { image: string }) {
        return this.uploadsService.ocrBillTotal(body.image);
    }
}
