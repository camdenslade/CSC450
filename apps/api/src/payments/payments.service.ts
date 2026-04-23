// apps/api/src/payments/payments.service.ts

import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentHandle } from './payment-handle.entity';
import { Platform } from '../common/enums';
import { AddHandleDto } from './dto/add-handle.dto';

// Strict handle rules per platform - prevents SSRF and injection via crafted values
const HANDLE_RULES: Record<Platform, { pattern: RegExp; maxLen: number; label: string }> = {
    [Platform.PAYPAL]:  { pattern: /^[a-zA-Z0-9._-]{1,40}$/, maxLen: 40, label: 'PayPal username'  },
    [Platform.VENMO]:   { pattern: /^[a-zA-Z0-9._-]{1,30}$/, maxLen: 30, label: 'Venmo username'   },
    [Platform.CASHAPP]: { pattern: /^[a-zA-Z0-9]{1,20}$/,    maxLen: 20, label: 'CashApp cashtag'  },
};

export interface GeneratedLink {
    platform:    Platform;
    paymentUrl:  string;
    webFallback: string;
}

@Injectable()
export class PaymentsService {
    private readonly logger = new Logger(PaymentsService.name);

    constructor(
        @InjectRepository(PaymentHandle)
        private readonly handles: Repository<PaymentHandle>,
    ) {}

    // Register or update a handle. Validates format before storing.
    async upsertHandle(userId: string, dto: AddHandleDto): Promise<PaymentHandle> {
        this.validateHandle(dto.platform, dto.handle);

        const existing = await this.handles.findOne({
            where: { userId, platform: dto.platform },
        });

        if (existing) {
            existing.handle     = dto.handle;
            existing.verifiedAt = null; // reset verification on handle change
            return this.handles.save(existing);
        }

        const record = this.handles.create({ userId, platform: dto.platform, handle: dto.handle });
        return this.handles.save(record);
    }

    async removeHandle(userId: string, platform: Platform): Promise<void> {
        const handle = await this.handles.findOne({ where: { userId, platform } });
        if (!handle) throw new NotFoundException(`No ${platform} handle found for this user.`);
        if (handle.userId !== userId) throw new ForbiddenException();
        await this.handles.remove(handle);
    }

    async listHandles(userId: string): Promise<PaymentHandle[]> {
        return this.handles.find({ where: { userId } });
    }

    // Generate a payment deep link so the participant can pay the tab owner directly.
    // TabUp never touches the money - we just produce the URL.
    //
    // PayPal  - https://paypal.me/{handle}/{amount}
    // Venmo   - venmo://paycharge deep link + https web fallback
    // CashApp - https://cash.app/${handle}/{amount}
    async generateLink(
        payeeUserId: string,
        platform:    Platform,
        amountCents: number,
        note?:       string,
    ): Promise<GeneratedLink> {
        if (amountCents <= 0) {
            throw new BadRequestException('Amount must be greater than zero.');
        }

        const handle = await this.handles.findOne({
            where: { userId: payeeUserId, platform },
        });

        if (!handle) {
            throw new NotFoundException(`The bill owner has not registered a ${platform} handle.`);
        }

        // Re-validate before embedding in a URL - defense in depth
        this.validateHandle(platform, handle.handle);

        const amountStr = this.centsToDecimalString(amountCents);
        const safeMemo  = this.sanitizeMemo(note ?? 'TabUp');

        return this.buildLink(platform, handle.handle, amountStr, safeMemo);
    }

    // Public so BillsService can call it after pre-fetching handles, avoiding per-participant DB queries.
    buildLinkFromHandle(handle: string, platform: Platform, amountCents: number, note?: string): GeneratedLink {
        this.validateHandle(platform, handle);
        const amountStr = this.centsToDecimalString(amountCents);
        const safeMemo  = this.sanitizeMemo(note ?? 'TabUp');
        return this.buildLink(platform, handle, amountStr, safeMemo);
    }

    private buildLink(platform: Platform, handle: string, amount: string, memo: string): GeneratedLink {
        switch (platform) {
            case Platform.PAYPAL: {
                const url = `https://paypal.me/${encodeURIComponent(handle)}/${amount}`;
                return { platform, paymentUrl: url, webFallback: url };
            }

            case Platform.VENMO: {
                // txn=pay - the person who clicks the link is paying the recipient
                const params = new URLSearchParams({ txn: 'pay', recipients: handle, amount, note: memo });
                const deepLink    = `venmo://paycharge?${params.toString()}`;
                const webFallback = `https://venmo.com/api/v5/paycharge?${params.toString()}`;
                return { platform, paymentUrl: deepLink, webFallback };
            }

            case Platform.CASHAPP: {
                const url = `https://cash.app/%24${encodeURIComponent(handle)}/${amount}`;
                return { platform, paymentUrl: url, webFallback: url };
            }

            default: {
                const exhaustive: never = platform;
                throw new BadRequestException(`Unsupported platform: ${String(exhaustive)}`);
            }
        }
    }

    private validateHandle(platform: Platform, handle: string): void {
        const rule = HANDLE_RULES[platform];
        if (!rule) throw new BadRequestException(`Unknown platform: ${platform}`);
        if (!rule.pattern.test(handle)) {
            throw new BadRequestException(
                `Invalid ${rule.label}. Allowed: letters, numbers, dots, hyphens, underscores. Max ${rule.maxLen} chars.`,
            );
        }
    }

    // Integer arithmetic to avoid floating-point rounding errors
    private centsToDecimalString(cents: number): string {
        const whole    = Math.floor(cents / 100);
        const fraction = cents % 100;
        return `${whole}.${String(fraction).padStart(2, '0')}`;
    }

    // Strips chars that could break URL construction or enable injection
    private sanitizeMemo(raw: string): string {
        return raw.replace(/[^a-zA-Z0-9 .,!?()-]/g, '').slice(0, 128).trim();
    }
}
