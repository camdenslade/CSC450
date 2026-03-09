// apps/api/src/auth/auth.service.ts

import {
    Injectable,
    Logger,
    OnModuleInit,
    UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { getAuth, DecodedIdToken } from 'firebase-admin/auth';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { SecretsService } from '../secrets/secrets.service';
import { User } from '../users/user.entity';

@Injectable()
export class AuthService implements OnModuleInit {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private readonly secrets: SecretsService,
        @InjectRepository(User)
        private readonly users: Repository<User>,
    ) {}

    async onModuleInit(): Promise<void> {
        // Only initialize Firebase Admin once per process lifetime
        if (getApps().length > 0) return;

        try {
            const serviceAccountJson = await this.secrets.getSecret(
                'FIREBASE_SERVICE_ACCOUNT',
                'FIREBASE_SERVICE_ACCOUNT',
            );

            const serviceAccount = JSON.parse(serviceAccountJson) as Record<string, string>;
            initializeApp({ credential: cert(serviceAccount) });
            this.logger.log('Firebase Admin SDK initialized.');
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            this.logger.error(`Failed to initialize Firebase Admin: ${msg}`);
            throw err;
        }
    }

    // Verifies the Firebase ID token and returns the User record.
    // Creates the record on first login.
    async exchangeToken(idToken: string): Promise<User> {
        let decoded: DecodedIdToken;

        try {
            decoded = await getAuth().verifyIdToken(idToken, /* checkRevoked */ true);
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            this.logger.warn(`Token exchange failed: ${msg}`);
            throw new UnauthorizedException('Invalid or expired Firebase token.');
        }

        const existing = await this.users.findOne({ where: { authProviderUid: decoded.uid } });
        if (existing) return existing;

        // First-time sign-in - create the user record
        const user = this.users.create({
            authProviderUid: decoded.uid,
            displayName:     decoded.name ?? decoded.email ?? 'TabUp User',
        });

        return this.users.save(user);
    }
}
