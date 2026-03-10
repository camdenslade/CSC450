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
import { User } from './user.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { RegisterDeviceDto } from './dto/register-device.dto';

@Injectable()
export class UsersService implements OnModuleInit {
    private readonly logger = new Logger(UsersService.name);
    private hashSalt        = '';

    constructor(
        @InjectRepository(User)
        private readonly users: Repository<User>,
        private readonly secrets: SecretsService,
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

    async getProfile(uid: string): Promise<User> {
        const user = await this.findByFirebaseUid(uid);
        if (!user) throw new NotFoundException('User profile not found.');
        return user;
    }

    async updateProfile(uid: string, dto: UpdateUserDto): Promise<User> {
        const user = await this.getProfile(uid);
        if (dto.displayName !== undefined)     user.displayName     = dto.displayName;
        if (dto.defaultPlatform !== undefined) user.defaultPlatform = dto.defaultPlatform;
        return this.users.save(user);
    }

    async registerDevice(uid: string, dto: RegisterDeviceDto): Promise<void> {
        const user = await this.getProfile(uid);
        user.pushToken    = dto.pushToken;
        user.pushPlatform = dto.platform;
        await this.users.save(user);
    }

    async updateAvatarKey(uid: string, s3Key: string): Promise<void> {
        const user = await this.getProfile(uid);
        user.avatarS3Key = s3Key;
        await this.users.save(user);
    }

    // HMAC-SHA256 with a per-deployment salt. Used before storing phone/email
    // so raw PII never hits the database.
    hashContact(value: string): string {
        if (!this.hashSalt) throw new BadRequestException('Hash salt not initialized.');
        const normalized = value.toLowerCase().replace(/\s+/g, '');
        return createHmac('sha256', this.hashSalt).update(normalized).digest('hex');
    }
}
