// apps/api/src/users/users.service.ts

import {
    BadRequestException,
    Injectable,
    Logger,
    NotFoundException,
    OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHmac } from 'crypto';
import { SecretsService } from '../secrets/secrets.service';
import { S3Service } from '../s3/s3.service';
import { User } from './user.entity';
import { Platform } from '../common/enums';
import { UpdateUserDto } from './dto/update-user.dto';
import { RegisterDeviceDto } from './dto/register-device.dto';

export interface SearchUser {
    id: string;
    displayName: string;
    avatarUrl: string | null;
}

export interface SearchResult {
    user: SearchUser;
    matchedPlatform: Platform | null;
    matchedHandle: string | null;
}

// Dice-coefficient similarity — value in [0,1]. Fast enough for in-process filtering on small result sets.
function similarity(a: string, b: string): number {
    if (a === b) return 1;
    if (a.length < 2 || b.length < 2) return 0;
    const bigrams = new Map<string, number>();
    for (let i = 0; i < a.length - 1; i++) {
        const bg = a.slice(i, i + 2);
        bigrams.set(bg, (bigrams.get(bg) ?? 0) + 1);
    }
    let matches = 0;
    for (let i = 0; i < b.length - 1; i++) {
        const bg = b.slice(i, i + 2);
        const count = bigrams.get(bg) ?? 0;
        if (count > 0) {
            matches++;
            bigrams.set(bg, count - 1);
        }
    }
    return (2 * matches) / (a.length + b.length - 2);
}

@Injectable()
export class UsersService implements OnModuleInit {
    private readonly logger = new Logger(UsersService.name);
    private hashSalt        = '';

    constructor(
        @InjectRepository(User)
        private readonly users: Repository<User>,
        private readonly secrets: SecretsService,
        private readonly s3: S3Service,
    ) {}

    async onModuleInit(): Promise<void> {
        this.hashSalt = await this.secrets.getSecret('PHONE_HASH_SALT', 'PHONE_HASH_SALT');
        this.logger.log('UsersService initialized.');
    }

    async findByFirebaseUid(uid: string): Promise<User | null> {
        return this.users.findOne({ where: { authProviderUid: uid } });
    }

    async findByDbId(id: string): Promise<User | null> {
        return this.users.findOne({ where: { id } });
    }

    // Lightweight lookup used by controllers that only need the DB primary key.
    // Does NOT generate a presigned avatar URL — use getProfile() for that.
    async getUserDbId(uid: string): Promise<string> {
        const user = await this.users.findOne({
            where:  { authProviderUid: uid },
            select: ['id'],
        });
        if (!user) throw new NotFoundException('User profile not found.');
        return user.id;
    }

    async getProfile(uid: string): Promise<User & { avatarUrl: string | null }> {
        const user = await this.findByFirebaseUid(uid);
        if (!user) throw new NotFoundException('User profile not found.');
        const avatarUrl = user.avatarS3Key
            ? await this.s3.createReadUrl(user.avatarS3Key)
            : null;
        return { ...user, avatarUrl };
    }

    async updateProfile(uid: string, dto: UpdateUserDto): Promise<User> {
        const user = await this.findByFirebaseUid(uid);
        if (!user) throw new NotFoundException('User profile not found.');
        if (dto.displayName     !== undefined) user.displayName     = dto.displayName;
        if (dto.defaultPlatform !== undefined) user.defaultPlatform = dto.defaultPlatform;
        // Hash contact values before storing - raw PII must never reach the DB
        if (dto.phone     !== undefined) user.phoneHash   = this.hashContact(dto.phone);
        if (dto.email     !== undefined) user.emailHash   = this.hashContact(dto.email);
        if (dto.avatarKey !== undefined) user.avatarS3Key = dto.avatarKey;
        return this.users.save(user);
    }

    async registerDevice(uid: string, dto: RegisterDeviceDto): Promise<void> {
        const user = await this.findByFirebaseUid(uid);
        if (!user) throw new NotFoundException('User profile not found.');
        user.pushToken    = dto.pushToken;
        user.pushPlatform = dto.platform;
        await this.users.save(user);
    }

    async updateAvatarKey(uid: string, s3Key: string): Promise<void> {
        const user = await this.findByFirebaseUid(uid);
        if (!user) throw new NotFoundException('User profile not found.');
        user.avatarS3Key = s3Key;
        await this.users.save(user);
    }

    /**
     * Fuzzy search across display name and all payment handles.
     * Excludes the calling user. Returns up to 20 deduplicated results.
     */
    async search(callerUid: string, query: string): Promise<SearchResult[]> {
        const caller = await this.findByFirebaseUid(callerUid);
        if (!caller) throw new NotFoundException('User profile not found.');
        const q = query.toLowerCase().trim();

        const [nameMatches, handleMatches] = await Promise.all([
            this.users
                .createQueryBuilder('user')
                .where('LOWER(user.displayName) LIKE :q', { q: `%${q}%` })
                .andWhere('user.id != :callerId', { callerId: caller.id })
                .take(50)
                .getMany(),
            this.users
                .createQueryBuilder('user')
                .innerJoinAndSelect('user.paymentHandles', 'handle')
                .where('LOWER(handle.handle) LIKE :q', { q: `%${q}%` })
                .andWhere('user.id != :callerId', { callerId: caller.id })
                .take(50)
                .getMany(),
        ]);

        type RawResult = { user: User; matchedPlatform: Platform | null; matchedHandle: string | null };
        const seen = new Map<string, RawResult>();

        for (const user of nameMatches) {
            const score = similarity(q, user.displayName.toLowerCase());
            if (score >= 0.4 || user.displayName.toLowerCase().includes(q)) {
                seen.set(user.id, { user, matchedPlatform: null, matchedHandle: null });
            }
        }

        for (const user of handleMatches) {
            for (const ph of user.paymentHandles ?? []) {
                const handleLower = ph.handle.toLowerCase();
                const score = similarity(q, handleLower);
                if (score >= 0.4 || handleLower.includes(q)) {
                    if (!seen.has(user.id)) {
                        seen.set(user.id, { user, matchedPlatform: ph.platform, matchedHandle: ph.handle });
                    } else {
                        const existing = seen.get(user.id)!;
                        if (!existing.matchedPlatform) {
                            existing.matchedPlatform = ph.platform;
                            existing.matchedHandle = ph.handle;
                        }
                    }
                }
            }
        }

        const rawResults = [...seen.values()].slice(0, 20);

        // Resolve presigned avatar URLs in parallel
        return Promise.all(
            rawResults.map(async (r) => {
                const avatarUrl = r.user.avatarS3Key
                    ? await this.s3.createReadUrl(r.user.avatarS3Key)
                    : null;
                return {
                    user: { id: r.user.id, displayName: r.user.displayName, avatarUrl },
                    matchedPlatform: r.matchedPlatform,
                    matchedHandle: r.matchedHandle,
                };
            }),
        );
    }

    // ---------------------------------------------------------

    async deleteAccount(uid: string): Promise<void> {
        const user = await this.findByFirebaseUid(uid);
        if (!user) throw new NotFoundException('User not found.');
        await this.users.remove(user);
    }

    // HMAC-SHA256 with a per-deployment salt. Used before storing phone/email
    // so raw PII never hits the database.
    hashContact(value: string): string {
        if (!this.hashSalt) throw new BadRequestException('Hash salt not initialized.');
        const normalized = value.toLowerCase().replace(/\s+/g, '');
        return createHmac('sha256', this.hashSalt).update(normalized).digest('hex');
    }
}
