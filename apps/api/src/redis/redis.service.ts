import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
    private readonly logger = new Logger(RedisService.name);
    private client: Redis;
    private connectPromise: Promise<void> | null = null;

    constructor() {
        this.client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
            lazyConnect: true,
            enableOfflineQueue: false,
            maxRetriesPerRequest: 1,
        });
        this.client.on('error', (err) => this.logger.error(`Redis error: ${err.message}`));
    }

    private async ensureConnected(): Promise<void> {
        if (this.client.status !== 'wait') return;
        if (!this.connectPromise) {
            this.connectPromise = this.client.connect().catch(() => undefined).finally(() => {
                this.connectPromise = null;
            });
        }
        await this.connectPromise;
    }

    getClient() {
        return this.client;
    }

    async getJSON<T>(key: string): Promise<T | null> {
        try {
            await this.ensureConnected();
            const value = await this.client.get(key);
            return value ? (JSON.parse(value) as T) : null;
        } catch {
            return null;
        }
    }

    async setJSON(key: string, value: any, ttlSeconds = 30) {
        try {
            await this.ensureConnected();
            await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
        } catch {
            return;
        }
    }

    async del(key: string) {
        try {
            await this.ensureConnected();
            await this.client.del(key);
        } catch {
            return;
        }
    }

    async onModuleDestroy() {
        await this.client.quit().catch(() => undefined);
    }
}
