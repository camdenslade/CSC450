// apps/api/src/s3/s3.module.ts

import { Module } from '@nestjs/common';
import { S3Service } from './s3.service';

@Module({
    providers: [S3Service],
    exports: [S3Service],
})
export class S3Module {}
