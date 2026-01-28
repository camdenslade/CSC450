// apps/api/src/secrets/secrets.service.ts

// ---------------------------------------------------------
// DO NOT TOUCH THIS FILE UNLESS YOU KNOW WHAT YOU ARE DOING
// ---------------------------------------------------------
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

@Injectable()
export class SecretsService implements OnModuleInit {
    private readonly logger = new Logger(SecretsService.name);
    private secretsCache = new Map<string, string>();


    private client: SecretsManagerClient | null = null;
    private readonly region = process.env.AWS_REGION || 'us-east-1';
    private readonly secretsPrefix = process.env.SECRETS_PREFIX || 'tabup';

    // This method is called once the module has been initialized
    onModuleInit(): void {
        try {
            this.client = new SecretsManagerClient({
                region: this.region,
            });
            this.logger.log('SecretsManagerClient initialized successfully.');
        } catch (error) {
            this.logger.warn(
                `Failed to initialize SecretsManagerClient. Secrets will not be retrievable. Error: ${error}`,
            )
        }
    }

    /**
     * @param secretName The name of the secret to retrieve.
     * @param envName Optional environment variable name to override the secret.
     * @returns The secret value as a string.
     */
    async getSecret(secretName: string, envName: string): Promise<string> {
        const cacheKey = `${secretName}:${envName}`;
        if (this.secretsCache.has(cacheKey)) {
            return this.secretsCache.get(cacheKey)!;
        }

        if (this.client) {
            try {
                const fullSecretName = `${this.secretsPrefix}/${secretName}`;

                const response = await this.client.send(
                    new GetSecretValueCommand({ SecretId: fullSecretName, VersionStage: 'AWSCURRENT' }),
                );

                if (response.SecretString) {
                    const value: string = response.SecretString;
                    this.secretsCache.set(cacheKey, value);
                    return value;
                }
            } catch (error) {
                this.logger.warn(
                    `Failed to retrieve secret "${secretName}" from Secrets Manager. Error: ${error}`,
                );
            }
        }

        const envValue = process.env[envName];
        if (envValue) {
            this.secretsCache.set(cacheKey, envValue);
            this.logger.log(`Using env variables: ${envName} for secret ${secretName}`);
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