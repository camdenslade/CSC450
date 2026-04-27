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

export type OcrConfidence = "high" | "low";

export interface OcrResult {
    amount:      string | null;       // best single pick (high confidence), null if ambiguous or not found
    candidates:  string[];            // all plausible totals, ordered by confidence desc
    confidence:  OcrConfidence | null;
    receiptKey:  string;
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
    async ocrBillTotal(base64Image: string): Promise<OcrResult> {
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

        const result = extractBillTotal(text);
        this.logger.log(`Extracted: amount=${result.amount} confidence=${result.confidence} candidates=${result.candidates.join(',')}`);
        return { ...result, receiptKey };
    }
}

// Lines whose labels strongly indicate "amount due" — ordered by specificity.
const STRONG_LABELS = /\b(total due|amount due|balance due|grand total)\b/i;
const WEAK_LABELS   = /\b(total)\b/i;
const EXCLUDE_LABELS = /\b(cash|change|tendered|paid|tip|gratuity|tax|subtotal|sub.?total|discount|savings|reward)\b/i;
const AMOUNT_RE = /\$?\d{1,4}[.,]\d{2}/g;

function parseAmount(s: string): number {
    return parseFloat(s.replace(/[$,]/g, ''));
}

interface ExtractResult {
    amount:     string | null;
    candidates: string[];
    confidence: OcrConfidence | null;
}

function extractBillTotal(text: string): ExtractResult {
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

    // Pass 1: strong label match — very high confidence
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!STRONG_LABELS.test(line) || EXCLUDE_LABELS.test(line)) continue;
        for (const candidate of [line, lines[i + 1] ?? '']) {
            const matches = [...candidate.matchAll(AMOUNT_RE)];
            if (matches.length) {
                const val = parseAmount(matches[matches.length - 1][0]).toFixed(2);
                return { amount: val, candidates: [val], confidence: 'high' };
            }
        }
    }

    // Pass 2: weak label match (just "total") — collect all such amounts
    const weakMatches: number[] = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!WEAK_LABELS.test(line) || EXCLUDE_LABELS.test(line)) continue;
        for (const candidate of [line, lines[i + 1] ?? '']) {
            const matches = [...candidate.matchAll(AMOUNT_RE)];
            if (matches.length) {
                weakMatches.push(parseAmount(matches[matches.length - 1][0]));
            }
        }
    }

    if (weakMatches.length === 1) {
        const val = weakMatches[0].toFixed(2);
        return { amount: val, candidates: [val], confidence: 'high' };
    }
    if (weakMatches.length > 1) {
        // Deduplicate and sort descending — largest is most likely the grand total
        const deduped = [...new Set(weakMatches.map((n) => n.toFixed(2)))].sort(
            (a, b) => parseFloat(b) - parseFloat(a),
        );
        // If the top two are within 5% of each other we're not confident
        const top = parseFloat(deduped[0]);
        const second = parseFloat(deduped[1]);
        const confident = (top - second) / top > 0.05;
        return {
            amount:     confident ? deduped[0] : null,
            candidates: deduped,
            confidence: confident ? 'high' : 'low',
        };
    }

    // Pass 3: no label found — collect all dollar amounts not on excluded lines
    const fallback: number[] = [];
    for (const line of lines) {
        if (EXCLUDE_LABELS.test(line)) continue;
        const matches = [...line.matchAll(AMOUNT_RE)];
        for (const m of matches) fallback.push(parseAmount(m[0]));
    }

    if (!fallback.length) {
        return { amount: null, candidates: [], confidence: null };
    }

    // Deduplicate, filter out suspiciously small amounts (< $1), sort descending
    const deduped = [...new Set(
        fallback.filter((n) => n >= 1).map((n) => n.toFixed(2)),
    )].sort((a, b) => parseFloat(b) - parseFloat(a));

    if (!deduped.length) {
        return { amount: null, candidates: [], confidence: null };
    }

    // Single candidate or clear winner (>20% gap) gets low confidence auto-fill
    if (deduped.length === 1) {
        return { amount: deduped[0], candidates: deduped, confidence: 'low' };
    }

    const top = parseFloat(deduped[0]);
    const second = parseFloat(deduped[1]);
    const clearWinner = (top - second) / top > 0.20;

    return {
        amount:     clearWinner ? deduped[0] : null,
        candidates: deduped.slice(0, 5), // cap at 5 choices
        confidence: 'low',
    };
}
