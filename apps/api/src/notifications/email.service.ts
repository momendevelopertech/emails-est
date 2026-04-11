import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import SMTPPool from 'nodemailer/lib/smtp-pool';
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

const DEFAULT_RETRY_ATTEMPTS = 3;
const DEFAULT_RETRY_DELAY_MS = 500;
const EMAIL_SETTINGS_CACHE_MS = 60_000;
const SIMPLE_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Injectable()
export class EmailService {
    private readonly logger = new Logger(EmailService.name);
    private transporter?: nodemailer.Transporter;
    private cachedMailFrom?: { value: string; expiresAt: number };

    constructor(private readonly prisma: PrismaService) {}

    clearMailFromCache() {
        this.cachedMailFrom = undefined;
    }

    hasConfig() {
        return Boolean(this.getMailHost() && this.getMailUser() && this.getMailPass());
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

        if (!this.hasConfig()) {
            this.logger.warn('Email not configured');
            return { ok: false, recipient: options.to, attempts: 0, error: 'Email not configured' };
        }

        let lastError = 'Unknown email delivery failure';

        for (let attempt = 1; attempt <= DEFAULT_RETRY_ATTEMPTS; attempt += 1) {
            try {
                const info = await this.getTransporter().sendMail({
                    from: await this.getMailFrom(),
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

    private getTransporter() {
        if (!this.transporter) {
            const options = this.buildTransportOptions();
            this.transporter = nodemailer.createTransport(options);
        }

        return this.transporter;
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

    private async getMailFrom() {
        if (this.cachedMailFrom && this.cachedMailFrom.expiresAt > Date.now()) {
            return this.cachedMailFrom.value;
        }

        try {
            const record = await this.prisma.emailSettings.findUnique({
                where: { id: 'default' },
                select: {
                    sender_name: true,
                    sender_email: true,
                },
            });

            const mailFrom = record
                ? this.buildMailFrom(
                    record.sender_name?.trim() || this.getDefaultSenderName(),
                    record.sender_email?.trim() || this.getDefaultSenderEmail(),
                )
                : this.getEnvMailFrom();

            this.cachedMailFrom = {
                value: mailFrom,
                expiresAt: Date.now() + EMAIL_SETTINGS_CACHE_MS,
            };

            return mailFrom;
        } catch (error: any) {
            this.logger.warn(`Failed to load email identity from database. Falling back to env values: ${error?.message || 'unknown error'}`);
            return this.getEnvMailFrom();
        }
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
        return 'SPHINX HR <noreply@sphinx.com>';
    }

    private getDefaultSenderName() {
        return (process.env.SENDER_NAME || 'SPHINX HR').trim() || 'SPHINX HR';
    }

    private getDefaultSenderEmail() {
        return (process.env.SENDER_EMAIL || '').trim();
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

    private buildTransportOptions(): SMTPTransport.Options | SMTPPool.Options {
        const common: SMTPTransport.Options = {
            host: this.getMailHost(),
            port: this.getMailPort(),
            secure: this.isSecure(),
            auth: {
                user: this.getMailUser(),
                pass: this.getMailPass(),
            },
            requireTLS: this.getRequireTls(),
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
        return new Promise((resolve) => setTimeout(resolve, DEFAULT_RETRY_DELAY_MS));
    }
}
