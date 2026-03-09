// apps/api/src/uploads/uploads.service.ts

import { Injectable } from '@nestjs/common';
import { S3Service } from '../s3/s3.service';
import { PresignDto } from './dto/presign.dto';

export interface PresignResult {
    uploadUrl: string;
    key:       string;
    fileUrl:   string | null;
}

@Injectable()
export class UploadsService {
    constructor(private readonly s3: S3Service) {}

    // Mobile client uploads directly to S3 using this URL.
    // The returned key should be sent back to the API to associate with a record.
    async presign(dto: PresignDto): Promise<PresignResult> {
        const { uploadUrl, key } = await this.s3.createUploadUrl(dto.mime, dto.size);
        return { uploadUrl, key, fileUrl: null };
    }
}
