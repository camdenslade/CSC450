// apps/api/src/uploads/uploads.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { TextractClient, DetectDocumentTextCommand } from '@aws-sdk/client-textract';
import { S3Service } from '../s3/s3.service';
import { PresignDto } from './dto/presign.dto';

export interface PresignResult {
    uploadUrl: string;
    key:       string;
    fileUrl:   string | null;
}

const AWS_REGION = process.env.AWS_REGION || 'us-east-1';

@Injectable()
export class UploadsService {
    private readonly logger = new Logger(UploadsService.name);
    private readonly textract = new TextractClient({ region: AWS_REGION });

    constructor(private readonly s3: S3Service) {}

    // Mobile client uploads directly to S3 using this URL.
    // The returned key should be sent back to the API to associate with a record.
    async presign(dto: PresignDto): Promise<PresignResult> {
        const { uploadUrl, key } = await this.s3.createUploadUrl(dto.mime, dto.size);
        return { uploadUrl, key, fileUrl: null };
    }

    // Accepts a base64-encoded JPEG, uploads to S3, runs Textract, returns the
    // bill total (not tendered/change amounts) and the S3 key.
    async ocrBillTotal(base64Image: string): Promise<{ amount: string | null; receiptKey: string }> {
        this.logger.log(`OCR request received — base64 length: ${base64Image?.length ?? 0}`);

        const imageBytes = Buffer.from(base64Image, 'base64');
        this.logger.log(`Decoded image bytes: ${imageBytes.length}`);

        // Generate a key directly — skip createUploadUrl (presigned URL not needed server-side)
        const receiptKey = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;

        try {
            this.logger.log(`Uploading to S3 key: ${receiptKey}`);
            await this.s3.putObject(receiptKey, imageBytes, 'image/jpeg');
            this.logger.log('S3 upload complete');
        } catch (err) {
            this.logger.error('S3 upload failed', err instanceof Error ? err.stack : String(err));
            throw err;
        }

        let text = '';
        try {
            this.logger.log('Sending to Textract...');
            const result = await this.textract.send(
                new DetectDocumentTextCommand({
                    Document: { Bytes: imageBytes },
                }),
            );
            text = (result.Blocks ?? [])
                .filter((b) => b.BlockType === 'LINE' && b.Text)
                .map((b) => b.Text!)
                .join('\n');
            this.logger.log(`Textract returned ${result.Blocks?.length ?? 0} blocks`);
            this.logger.log(`Textract text (first 500): ${text.slice(0, 500)}`);
        } catch (err) {
            this.logger.error('Textract failed', err instanceof Error ? err.stack : String(err));
            throw err;
        }

        const amount = extractBillTotal(text);
        this.logger.log(`Extracted amount: ${amount}`);
        return { amount, receiptKey };
    }
}

// Lines whose labels strongly indicate "amount due" — ordered by specificity.
// We scan lines top-to-bottom and return the first dollar amount on or after
// a matching label line. Tendered / change lines are explicitly excluded.
const TOTAL_LABELS = /\b(total due|amount due|balance due|grand total|total)\b/i;
const EXCLUDE_LABELS = /\b(cash|change|tendered|paid|tip|gratuity|tax|subtotal|sub total)\b/i;
const AMOUNT_RE = /\$?\d{1,4}[.,]\d{2}/;

function extractBillTotal(text: string): string | null {
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

    // Pass 1: find a line matching a total label and grab the amount from that
    // line or the very next one (some receipts put label and amount on separate lines).
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!TOTAL_LABELS.test(line) || EXCLUDE_LABELS.test(line)) continue;

        // Try current line first, then next
        for (const candidate of [line, lines[i + 1] ?? '']) {
            const m = candidate.match(AMOUNT_RE);
            if (m) return parseFloat(m[0].replace(/[$,]/g, '')).toFixed(2);
        }
    }

    // Pass 2: fall back to the largest amount that isn't on an excluded line.
    const amounts: number[] = [];
    for (const line of lines) {
        if (EXCLUDE_LABELS.test(line)) continue;
        const m = line.match(AMOUNT_RE);
        if (m) amounts.push(parseFloat(m[0].replace(/[$,]/g, '')));
    }

    if (!amounts.length) return null;
    return Math.max(...amounts).toFixed(2);
}
