// apps/api/src/s3/s3.service.ts

import {
    Injectable,
    BadRequestException,
    OnModuleInit,
    Logger,
} from '@nestjs/common';
import {
    S3Client,
    PutObjectCommand,
    DeleteObjectCommand,
    GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { SecretsService } from '../secrets/secrets.service';

const ALLOWED_MIMES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
] as const;

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_PREFIX = 'uploads/';
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';

@Injectable()
export class S3Service implements OnModuleInit {
    private readonly logger = new Logger(S3Service.name);
    private s3!: S3Client;
    private bucket!: string;

    constructor(private readonly secretsService: SecretsService) {}

    async onModuleInit(): Promise<void> {
        const bucket =
            process.env.AWS_S3_BUCKET ??
            (await this.secretsService.getSecret('s3-bucket', 'AWS_S3_BUCKET'));

        if (!bucket) {
            throw new Error('Missing required configuration: AWS_S3_BUCKET');
        }

        this.bucket = bucket;

        // Use IAM role authentication (no access keys)
        this.s3 = new S3Client({
            region: AWS_REGION,
            forcePathStyle: false,
            tls: true,
        });

        this.logger.log(`S3Service initialized for bucket "${this.bucket}"`);
    }

    private ensureKeySafe(key: string): void {
        if (!key || typeof key !== 'string') {
            throw new BadRequestException('Missing S3 object key');
        }

        if (
            key.includes('..') ||
            key.includes('\\') ||
            key.startsWith('/') ||
            key.startsWith('s3://') ||
            key.length > 512
        ) {
            throw new BadRequestException('Invalid S3 object key');
        }

        if (!key.startsWith(ALLOWED_PREFIX)) {
            throw new BadRequestException('Invalid S3 key prefix');
        }
    }

    async createUploadUrl(
        contentType?: string | null,
        fileSize?: number | null,
    ): Promise<{ uploadUrl: string; key: string }> {
        const mimeType = contentType ?? 'image/jpeg';

        if (!ALLOWED_MIMES.includes(mimeType as (typeof ALLOWED_MIMES)[number])) {
            throw new BadRequestException(`Unsupported content type: ${mimeType}`);
        }

        if (fileSize !== undefined && fileSize !== null) {
            if (fileSize <= 0) {
                throw new BadRequestException('File size must be greater than 0');
            }
            if (fileSize > MAX_FILE_SIZE) {
                throw new BadRequestException(
                    `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024} MB`,
                );
            }
        }

        const extMap: Record<string, string> = {
            'image/jpeg': 'jpg',
            'image/jpg': 'jpg',
            'image/png': 'png',
            'image/webp': 'webp',
        };

        const ext = extMap[mimeType] ?? 'jpg';

        const key = `${ALLOWED_PREFIX}${Date.now()}-${Math.random()
            .toString(36)
            .slice(2)}.${ext}`;

        const command = new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            ContentType: mimeType,
            ACL: 'private',
            ServerSideEncryption: 'AES256',
        });

        const uploadUrl = await getSignedUrl(this.s3, command, {
            expiresIn: 300, // 5 minutes
        });

        const secureUploadUrl = uploadUrl.replace(/^http:/, 'https:');

        this.logger.log(`Generated presigned upload URL (${mimeType})`);

        return {
            uploadUrl: secureUploadUrl,
            key,
        };
    }

    async createReadUrl(key: string, expiresInSeconds = 900): Promise<string> {
        this.ensureKeySafe(key);

        const command = new GetObjectCommand({
            Bucket: this.bucket,
            Key: key,
        });

        try {
            const url = await getSignedUrl(this.s3, command, {
                expiresIn: expiresInSeconds,
            });

            return url.replace(/^http:/, 'https:');
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            this.logger.error(`Failed to generate presigned GET URL for ${key}: ${msg}`);
            throw new Error('Failed to generate image URL');
        }
    }

    async deleteObject(key: string): Promise<void> {
        try {
            this.ensureKeySafe(key);
        } catch {
            return; // ignore invalid keys
        }

        const command = new DeleteObjectCommand({
            Bucket: this.bucket,
            Key: key,
        });

        try {
            await this.s3.send(command);
            this.logger.log(`Deleted S3 object: ${key}`);
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            this.logger.error(`Failed to delete S3 object ${key}: ${msg}`);
        }
    }
}
