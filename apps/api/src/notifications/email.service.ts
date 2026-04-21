import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import SMTPPool from 'nodemailer/lib/smtp-pool';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import { PrismaService } from '../prisma/prisma.service';

export type EmailDeliveryResult = {
    ok: boolean;
    recipient: string;
    attempts: number;
    messageId?: string;
    response?: string;
    error?: string;
};

type SendEmailOptions = {
    to: string;
    subject: string;
    html: string;
};

type ResolvedSenderConfig = {
    key: string;
    mailFrom: string;
    host: string;
    port: number;
    secure: boolean;
    requireTLS: boolean;
    user: string;
    pass: string;
};

const DEFAULT_RETRY_ATTEMPTS = 3;
const DEFAULT_RETRY_DELAY_MS = 500;
const EMAIL_SETTINGS_CACHE_MS = 60_000;
const SIMPLE_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Injectable()
export class EmailService {
    private readonly logger = new Logger(EmailService.name);
    private transporter?: nodemailer.Transporter;
    private transporterKey?: string;
    private cachedSenderConfig?: { value: ResolvedSenderConfig | null; expiresAt: number };

    constructor(private readonly prisma: PrismaService) {}

    clearMailFromCache() {
        this.cachedSenderConfig = undefined;
        this.transporter = undefined;
        this.transporterKey = undefined;
    }

    async sendEmail(options: SendEmailOptions): Promise<EmailDeliveryResult> {
        if (!options.to?.trim()) {
            this.logger.warn('Email recipient is missing');
            return { ok: false, recipient: '', attempts: 0, error: 'Email recipient is missing' };
        }
        if (!SIMPLE_EMAIL_REGEX.test(options.to.trim())) {
            this.logger.warn(`Email recipient is invalid: ${options.to}`);
            return { ok: false, recipient: options.to, attempts: 0, error: 'Email address format is invalid' };
        }

        if (!options.subject?.trim()) {
            this.logger.warn(`Email subject is missing for ${options.to}`);
            return { ok: false, recipient: options.to, attempts: 0, error: 'Email subject is missing' };
        }

        if (!options.html?.trim()) {
            this.logger.warn(`Email HTML body is missing for ${options.to}`);
            return { ok: false, recipient: options.to, attempts: 0, error: 'Email HTML body is missing' };
        }

        const senderConfig = await this.getSenderConfig();
        if (!senderConfig) {
            this.logger.warn('Email not configured');
            return { ok: false, recipient: options.to, attempts: 0, error: 'Email not configured' };
        }

        let lastError = 'Unknown email delivery failure';

        for (let attempt = 1; attempt <= DEFAULT_RETRY_ATTEMPTS; attempt += 1) {
            try {
                const info = await this.getTransporter(senderConfig).sendMail({
                    from: senderConfig.mailFrom,
                    to: options.to,
                    subject: options.subject,
                    html: options.html,
                });

                this.logger.log(`Email sent to ${options.to} on attempt ${attempt}`);
                return {
                    ok: true,
                    recipient: options.to,
                    attempts: attempt,
                    messageId: info.messageId,
                    response: typeof info.response === 'string' ? info.response : undefined,
                };
            } catch (error: any) {
                lastError = error?.message || 'Unknown email delivery failure';

                if (attempt < DEFAULT_RETRY_ATTEMPTS) {
                    this.logger.warn(`Email send failed (attempt ${attempt}/${DEFAULT_RETRY_ATTEMPTS}) for ${options.to}: ${lastError}. Retrying.`);
                    await this.waitBeforeRetry();
                    continue;
                }

                this.logger.error(`Email send failed for ${options.to}: ${lastError}`);
            }
        }

        return {
            ok: false,
            recipient: options.to,
            attempts: DEFAULT_RETRY_ATTEMPTS,
            error: lastError,
        };
    }

    private getTransporter(config: ResolvedSenderConfig) {
        if (!this.transporter || this.transporterKey !== config.key) {
            this.transporter = nodemailer.createTransport(this.buildTransportOptions(config));
            this.transporterKey = config.key;
        }

        return this.transporter;
    }

    private async getSenderConfig() {
        if (this.cachedSenderConfig && this.cachedSenderConfig.expiresAt > Date.now()) {
            return this.cachedSenderConfig.value;
        }

        let value: ResolvedSenderConfig | null = null;

        try {
            const settings = await this.prisma.emailSettings.findUnique({
                where: { id: 'default' },
                select: {
                    active_sender_account: {
                        select: {
                            id: true,
                            updated_at: true,
                            sender_name: true,
                            sender_email: true,
                            mail_from: true,
                            smtp_host: true,
                            smtp_port: true,
                            smtp_secure: true,
                            smtp_require_tls: true,
                            smtp_username: true,
                            smtp_password: true,
                        },
                    },
                    sender_name: true,
                    sender_email: true,
                },
            });

            const account = settings?.active_sender_account;
            if (account && account.smtp_host?.trim() && account.smtp_username?.trim() && account.smtp_password) {
                value = {
                    key: `db:${account.id}:${account.updated_at.toISOString()}`,
                    mailFrom: account.mail_from?.trim() || this.buildMailFrom(account.sender_name, account.sender_email),
                    host: account.smtp_host.trim(),
                    port: account.smtp_port,
                    secure: account.smtp_secure,
                    requireTLS: account.smtp_require_tls,
                    user: account.smtp_username.trim(),
                    pass: account.smtp_password,
                };
            } else {
                const envConfig = this.getEnvConfig();
                if (envConfig) {
                    const senderName = settings?.sender_name?.trim() || this.getDefaultSenderName();
                    const senderEmail = settings?.sender_email?.trim() || this.getDefaultSenderEmail();
                    value = {
                        ...envConfig,
                        mailFrom: this.buildMailFrom(senderName, senderEmail),
                    };
                }
            }
        } catch (error: any) {
            this.logger.warn(`Failed to load email sender configuration from database. Falling back to env values: ${error?.message || 'unknown error'}`);
            value = this.getEnvConfig();
        }

        this.cachedSenderConfig = {
            value,
            expiresAt: Date.now() + EMAIL_SETTINGS_CACHE_MS,
        };

        return value;
    }

    private getEnvConfig(): ResolvedSenderConfig | null {
        const host = this.getMailHost();
        const user = this.getMailUser();
        const pass = this.getMailPass();

        if (!host || !user || !pass) {
            return null;
        }

        return {
            key: `env:${host}:${this.getMailPort()}:${user}`,
            mailFrom: this.getEnvMailFrom(),
            host,
            port: this.getMailPort(),
            secure: this.isSecure(),
            requireTLS: this.getRequireTls(),
            user,
            pass,
        };
    }

    private getMailHost() {
        return (process.env.MAIL_HOST || '').trim();
    }

    private getMailPort() {
        const parsed = parseInt(process.env.MAIL_PORT || '', 10);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : 587;
    }

    private getMailUser() {
        return (process.env.MAIL_USER || '').trim();
    }

    private getMailPass() {
        return process.env.MAIL_PASS || '';
    }

    private getEnvMailFrom() {
        return this.buildMailFrom(
            this.getDefaultSenderName(),
            this.getDefaultSenderEmail(),
        );
    }

    private buildMailFrom(senderName: string, senderEmail: string) {
        if (senderEmail) {
            return `${senderName} <${senderEmail}>`;
        }
        if (this.getMailUser()) {
            return `${senderName} <${this.getMailUser()}>`;
        }
        return 'EST <noreply@est.com>';
    }

    private getDefaultSenderName() {
        return (process.env.SENDER_NAME || 'EST').trim() || 'EST';
    }

    private getDefaultSenderEmail() {
        return (process.env.SENDER_EMAIL || this.getMailUser() || '').trim();
    }

    private isSecure() {
        const configured = this.parseBoolean(process.env.MAIL_SECURE);
        if (configured !== null) {
            return configured;
        }
        return this.getMailPort() === 465;
    }

    private getRequireTls() {
        const configured = this.parseBoolean(process.env.MAIL_REQUIRE_TLS);
        if (configured !== null) {
            return configured;
        }
        return !this.isSecure();
    }

    private getRejectUnauthorized() {
        const configured = this.parseBoolean(process.env.MAIL_TLS_REJECT_UNAUTHORIZED);
        return configured ?? true;
    }

    private getMaxConnections() {
        const parsed = parseInt(process.env.MAIL_POOL_MAX_CONNECTIONS || '', 10);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : 5;
    }

    private getMaxMessages() {
        const parsed = parseInt(process.env.MAIL_POOL_MAX_MESSAGES || '', 10);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : 100;
    }

    private shouldUsePool() {
        const configured = this.parseBoolean(process.env.MAIL_USE_POOL);
        return configured ?? true;
    }

    private buildTransportOptions(config: ResolvedSenderConfig): SMTPTransport.Options | SMTPPool.Options {
        const common: SMTPTransport.Options = {
            host: config.host,
            port: config.port,
            secure: config.secure,
            auth: {
                user: config.user,
                pass: config.pass,
            },
            requireTLS: config.requireTLS,
            tls: {
                rejectUnauthorized: this.getRejectUnauthorized(),
            },
        };

        if (this.shouldUsePool()) {
            return {
                ...common,
                pool: true,
                maxConnections: this.getMaxConnections(),
                maxMessages: this.getMaxMessages(),
            } as SMTPPool.Options;
        }

        return common;
    }

    private parseBoolean(value?: string | null) {
        const normalized = (value || '').trim().toLowerCase();
        if (!normalized) return null;
        if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
        if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
        return null;
    }

    private waitBeforeRetry() {
        return new Promise((resolve) => {
            setTimeout(resolve, DEFAULT_RETRY_DELAY_MS);
        });
    }
}
