// apps/api/src/secrets/secrets.service.ts

// ---------------------------------------------------------
// DO NOT TOUCH THIS FILE UNLESS YOU KNOW WHAT YOU ARE DOING
// ---------------------------------------------------------
import { Injectable, Logger } from '@nestjs/common';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

@Injectable()
export class SecretsService {
    private readonly logger = new Logger(SecretsService.name);
    private secretsCache = new Map<string, string>();

    private readonly region = process.env.AWS_REGION || 'us-east-1';
    private readonly secretsPrefix = process.env.SECRETS_PREFIX || 'tabup';

    // Client is initialized eagerly so it is available before lifecycle hooks run.
    private readonly client: SecretsManagerClient | null = (() => {
        try {
            const c = new SecretsManagerClient({ region: this.region });
            this.logger.log('SecretsManagerClient initialized successfully.');
            return c;
        } catch (error) {
            this.logger.warn(`Failed to initialize SecretsManagerClient. Falling back to env vars. Error: ${error}`);
            return null;
        }
    })();

    // Lazily fetches the JSON blob from `secretsPrefix` on the first getSecret() call
    // and populates the cache. Subsequent calls resolve from cache.
    private blobLoadPromise: Promise<void> | null = null;

    private loadBlob(): Promise<void> {
        if (!this.blobLoadPromise) {
            this.blobLoadPromise = (async () => {
                if (!this.client) return;
                try {
                    const response = await this.client.send(
                        new GetSecretValueCommand({ SecretId: this.secretsPrefix, VersionStage: 'AWSCURRENT' }),
                    );
                    if (response.SecretString) {
                        const blob = JSON.parse(response.SecretString) as Record<string, string>;
                        for (const [key, value] of Object.entries(blob)) {
                            this.secretsCache.set(`${key}:${key}`, value);
                        }
                        this.logger.log(`Pre-loaded ${Object.keys(blob).length} secrets from "${this.secretsPrefix}".`);
                    }
                } catch (error) {
                    this.logger.warn(`Failed to load secrets blob from "${this.secretsPrefix}". Falling back to env vars. Error: ${error}`);
                }
            })();
        }
        return this.blobLoadPromise;
    }

    /**
     * @param secretName The name of the secret to retrieve.
     * @param envName Optional environment variable name to override the secret.
     * @returns The secret value as a string.
     */
    async getSecret(secretName: string, envName: string): Promise<string> {
        await this.loadBlob();

        const cacheKey = `${secretName}:${envName}`;
        if (this.secretsCache.has(cacheKey)) {
            return this.secretsCache.get(cacheKey)!;
        }

        const envValue = process.env[envName];
        if (envValue) {
            this.secretsCache.set(cacheKey, envValue);
            this.logger.log(`Using env variable: ${envName} for secret ${secretName}`);
            return envValue;
        }

        throw new Error(
            `Secret "${secretName}" not found in Secrets Manager and environment variable "${envName}" is not set.`,
        );
    }

    /**
     * @param envName The environment variable name to check.
     * @returns True if the environment variable is set, false otherwise.
     */
    getSecretSync(envName: string): string | undefined {
        return process.env[envName];
    }
}
