import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { normalizeEgyptMobilePhone } from '../shared/egypt-phone';
import { DEFAULT_GREEN_API_SETTINGS, DEFAULT_WHATSAPP_SETTINGS_ID } from '../settings/whatsapp-settings.constants';

type WhatsAppConfig = {
    apiTokenInstance: string;
    apiUrl: string;
    idInstance: string;
    mediaUrl: string;
    source: 'database' | 'default';
};

export type WhatsAppDeliveryResult = {
    ok: boolean;
    chatId?: string;
    phone: string;
    attempts: number;
    source?: WhatsAppConfig['source'];
    status?: number;
    error?: string;
    response?: unknown;
};

const EGYPT_LOCAL_MOBILE = /^01\d{9}$/;
const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_RETRY_ATTEMPTS = 3;

@Injectable()
export class WhatsAppService {
    private readonly logger = new Logger(WhatsAppService.name);

    constructor(private readonly prisma: PrismaService) {}

    formatEgyptianNumber(phone?: string | null) {
        const normalized = normalizeEgyptMobilePhone(phone);
        if (!EGYPT_LOCAL_MOBILE.test(normalized)) {
            throw new Error('Phone number must be a valid Egyptian mobile number');
        }
        return `20${normalized.slice(1)}`;
    }

    async hasConfig() {
        return Boolean(await this.getConfig());
    }

    async sendWhatsApp(phone: string, message: string): Promise<WhatsAppDeliveryResult> {
        if (!phone) {
            this.logger.warn('WhatsApp phone is missing');
            return { ok: false, phone: '', attempts: 0, error: 'WhatsApp phone is missing' };
        }

        if (!message?.trim()) {
            this.logger.warn('WhatsApp message is empty');
            return { ok: false, phone, attempts: 0, error: 'WhatsApp message is empty' };
        }

        let formattedPhone = '';
        try {
            formattedPhone = this.formatEgyptianNumber(phone);
        } catch (error: any) {
            const errorMessage = error?.message || 'WhatsApp phone is invalid';
            this.logger.warn(`WhatsApp phone is invalid: ${phone}`);
            return { ok: false, phone, attempts: 0, error: errorMessage };
        }

        const config = await this.getConfig();
        if (!config) {
            this.logger.warn('Green API settings are incomplete');
            return { ok: false, phone: formattedPhone, attempts: 0, error: 'Green API settings are incomplete' };
        }

        const chatId = `${formattedPhone}@c.us`;
        let lastFailure: WhatsAppDeliveryResult = {
            ok: false,
            chatId,
            phone: formattedPhone,
            attempts: 0,
            error: 'Unknown WhatsApp delivery failure',
        };

        for (let attempt = 1; attempt <= DEFAULT_RETRY_ATTEMPTS; attempt += 1) {
            try {
                const response = await axios.post(
                    `${config.apiUrl}/waInstance${config.idInstance}/sendMessage/${config.apiTokenInstance}`,
                    {
                        chatId,
                        message,
                    },
                    {
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        timeout: this.getRequestTimeout(),
                        validateStatus: () => true,
                    },
                );

                this.logger.log(`Green API response for ${chatId}: ${JSON.stringify(response.data)}`);

                if (response.status >= 200 && response.status < 300) {
                    this.logger.log(`WhatsApp sent to ${formattedPhone} using ${config.source} Green API config`);
                    return {
                        ok: true,
                        chatId,
                        phone: formattedPhone,
                        attempts: attempt,
                        source: config.source,
                        status: response.status,
                        response: response.data,
                    };
                }

                const errorMessage = this.extractErrorMessage(response.data, response.status);
                lastFailure = {
                    ok: false,
                    chatId,
                    phone: formattedPhone,
                    attempts: attempt,
                    source: config.source,
                    status: response.status,
                    error: errorMessage,
                    response: response.data,
                };
                this.logger.warn(`WhatsApp send failed via ${config.source} Green API (attempt ${attempt}/${DEFAULT_RETRY_ATTEMPTS}): ${errorMessage}`);
            } catch (error: any) {
                const errorMessage = this.extractErrorMessage(error?.response?.data, error?.response?.status, error?.message);
                lastFailure = {
                    ok: false,
                    chatId,
                    phone: formattedPhone,
                    attempts: attempt,
                    source: config.source,
                    status: error?.response?.status,
                    error: errorMessage,
                    response: error?.response?.data,
                };
                this.logger.warn(`WhatsApp request error via ${config.source} Green API (attempt ${attempt}/${DEFAULT_RETRY_ATTEMPTS}): ${errorMessage}`);
            }

            if (attempt < DEFAULT_RETRY_ATTEMPTS) {
                await this.waitBeforeRetry();
            }
        }

        if (lastFailure.error) {
            this.logger.error(`WhatsApp delivery failed for ${formattedPhone}: ${lastFailure.error}`);
        }

        return lastFailure;
    }

    private async getConfig(): Promise<WhatsAppConfig | null> {
        const record = await this.prisma.whatsAppSettings.findUnique({
            where: { id: DEFAULT_WHATSAPP_SETTINGS_ID },
        });

        const config = record
            ? {
                apiUrl: this.normalizeUrl(record.api_url),
                mediaUrl: this.normalizeUrl(record.media_url),
                idInstance: record.id_instance?.trim() || '',
                apiTokenInstance: record.api_token_instance?.trim() || '',
                source: 'database' as const,
            }
            : {
                apiUrl: this.normalizeUrl(DEFAULT_GREEN_API_SETTINGS.api_url),
                mediaUrl: this.normalizeUrl(DEFAULT_GREEN_API_SETTINGS.media_url),
                idInstance: DEFAULT_GREEN_API_SETTINGS.id_instance,
                apiTokenInstance: DEFAULT_GREEN_API_SETTINGS.api_token_instance,
                source: 'default' as const,
            };

        if (!config.apiUrl || !config.mediaUrl || !config.idInstance || !config.apiTokenInstance) {
            return null;
        }

        return config;
    }

    private normalizeUrl(value?: string | null) {
        return (value || '').trim().replace(/\/+$/, '');
    }

    private getRequestTimeout() {
        const parsed = parseInt(process.env.GREEN_API_TIMEOUT_MS || '', 10);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MS;
    }

    private extractErrorMessage(payload: any, status?: number, fallback?: string) {
        const candidate = payload?.response?.message
            || payload?.message
            || payload?.errorMessage
            || payload?.error
            || fallback
            || (status ? `WhatsApp send failed with status ${status}` : 'Unknown WhatsApp error');

        if (typeof candidate === 'string') {
            return candidate;
        }

        if (Array.isArray(candidate)) {
            const first = candidate[0] as any;
            if (first && typeof first === 'object' && first.exists === false) {
                return `WhatsApp number is not registered (${first.number || 'unknown'}).`;
            }
            return JSON.stringify(candidate);
        }

        if (typeof candidate === 'object' && candidate !== null) {
            const details = candidate as any;
            if (details.exists === false) {
                return `WhatsApp number is not registered (${details.number || 'unknown'}).`;
            }
            return JSON.stringify(candidate);
        }

        return String(candidate);
    }

    private waitBeforeRetry() {
        return new Promise((resolve) => setTimeout(resolve, 500));
    }
}
