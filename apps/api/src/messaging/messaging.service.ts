import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../notifications/email.service';
import { WhatsAppService } from '../notifications/whatsapp.service';
import { CreateRecipientDto } from './dto/create-recipient.dto';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { SendCampaignDto } from './dto/send-campaign.dto';
import { RetryRecipientsDto } from './dto/retry-recipients.dto';
import { RecipientFilterDto } from './dto/recipient-filter.dto';
import { RecipientStatus, TemplateType } from '@prisma/client';

@Injectable()
export class MessagingService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly emailService: EmailService,
        private readonly whatsAppService: WhatsAppService,
    ) {}

    async findRecipients(filter: RecipientFilterDto) {
        const page = Math.max(filter.page ?? 1, 1);
        const limit = Math.min(Math.max(filter.limit ?? 100, 1), 500);
        const where: any = {};

        if (filter.exam_type) where.exam_type = filter.exam_type;
        if (filter.role) where.role = filter.role;
        if (filter.day) where.day = filter.day;
        if (filter.status) where.status = filter.status;
        if (filter.search) {
            where.OR = [
                { name: { contains: filter.search, mode: 'insensitive' } },
                { email: { contains: filter.search, mode: 'insensitive' } },
                { phone: { contains: filter.search, mode: 'insensitive' } },
            ];
        }

        const [items, total] = await Promise.all([
            this.prisma.recipient.findMany({
                where,
                orderBy: { created_at: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.recipient.count({ where }),
        ]);

        return { items, total, page, limit };
    }

    async createRecipient(dto: CreateRecipientDto) {
        return this.prisma.recipient.create({ data: { ...dto, status: RecipientStatus.PENDING } });
    }

    async importRecipients(recipients: CreateRecipientDto[]) {
        const normalized = recipients
            .map((recipient) => ({
                name: this.normalizeImportValue(recipient.name),
                email: this.normalizeImportValue(recipient.email),
                phone: this.normalizeImportValue(recipient.phone),
                exam_type: this.normalizeImportValue(recipient.exam_type),
                role: this.normalizeImportValue(recipient.role),
                day: this.normalizeImportValue(recipient.day),
                date: this.normalizeImportValue(recipient.date),
                test_center: this.normalizeImportValue(recipient.test_center),
                faculty: this.normalizeImportValue(recipient.faculty),
                room: this.normalizeImportValue(recipient.room),
                address: this.normalizeImportValue(recipient.address),
                map_link: this.normalizeImportValue(recipient.map_link),
                arrival_time: this.normalizeImportValue(recipient.arrival_time),
                status: RecipientStatus.PENDING,
            }))
            .filter((item) => item.name);

        if (!normalized.length) {
            return { imported: 0, skipped: recipients.length };
        }

        await this.prisma.recipient.createMany({ data: normalized });
        return {
            imported: normalized.length,
            skipped: recipients.length - normalized.length,
        };
    }

    async getTemplates() {
        return this.prisma.template.findMany({ orderBy: { created_at: 'desc' } });
    }

    async createTemplate(dto: CreateTemplateDto) {
        return this.prisma.template.create({ data: dto });
    }

    async updateTemplate(id: string, dto: UpdateTemplateDto) {
        return this.prisma.template.update({ where: { id }, data: dto });
    }

    async deleteTemplate(id: string) {
        return this.prisma.template.delete({ where: { id } });
    }

    async getLogs(page = 1, limit = 100) {
        const effectivePage = Math.max(page, 1);
        const effectiveLimit = Math.min(Math.max(limit, 1), 500);
        const items = await this.prisma.log.findMany({
            orderBy: { created_at: 'desc' },
            include: {
                recipient: {
                    select: { id: true, name: true, email: true, phone: true, status: true },
                },
            },
            skip: (effectivePage - 1) * effectiveLimit,
            take: effectiveLimit,
        });
        const total = await this.prisma.log.count();
        return { items, total, page: effectivePage, limit: effectiveLimit };
    }

    async sendCampaign(dto: SendCampaignDto) {
        const template = await this.prisma.template.findUnique({ where: { id: dto.templateId } });
        if (!template) {
            throw new Error('Template not found');
        }

        const recipients = await this.findRecipientsForSend(dto);
        const results = [] as Array<{ recipientId: string; status: string; error?: string }>;

        for (const recipient of recipients) {
            const result = await this.sendToRecipient(recipient, template);
            results.push(result);
        }

        return {
            template: { id: template.id, name: template.name },
            total: results.length,
            processed: results.filter((item) => item.status === 'SENT').length,
            failed: results.filter((item) => item.status === 'FAILED').length,
            results,
        };
    }

    async retryRecipients(dto: RetryRecipientsDto) {
        const template = await this.prisma.template.findUnique({ where: { id: dto.templateId } });
        if (!template) {
            throw new Error('Template not found');
        }

        const recipients = dto.ids && dto.ids.length > 0
            ? await this.prisma.recipient.findMany({ where: { id: { in: dto.ids } } })
            : await this.prisma.recipient.findMany({ where: { status: RecipientStatus.FAILED } });

        const results = [] as Array<{ recipientId: string; status: string; error?: string }>;

        for (const recipient of recipients) {
            const result = await this.sendToRecipient(recipient, template);
            results.push(result);
        }

        return {
            template: { id: template.id, name: template.name },
            total: results.length,
            processed: results.filter((item) => item.status === 'SENT').length,
            failed: results.filter((item) => item.status === 'FAILED').length,
            results,
        };
    }

    private async findRecipientsForSend(dto: SendCampaignDto) {
        const where: any = {};
        if (dto.mode === 'selected') {
            where.id = { in: dto.ids || [] };
        }
        if (dto.mode === 'all_pending') {
            where.status = RecipientStatus.PENDING;
        }
        if (dto.mode === 'failed') {
            where.status = RecipientStatus.FAILED;
        }
        if (dto.mode === 'filtered' && dto.filter) {
            if (dto.filter.exam_type) where.exam_type = dto.filter.exam_type;
            if (dto.filter.role) where.role = dto.filter.role;
            if (dto.filter.day) where.day = dto.filter.day;
            if (dto.filter.status) where.status = dto.filter.status as RecipientStatus;
        }
        if (dto.mode === 'filtered' && !dto.filter?.status) {
            // allow any filtered status if status is not explicitly provided
        }

        return this.prisma.recipient.findMany({ where });
    }

    private async sendToRecipient(recipient: any, template: any) {
        const now = new Date();
        await this.prisma.recipient.update({
            where: { id: recipient.id },
            data: {
                status: RecipientStatus.PROCESSING,
                attempts_count: { increment: 1 },
                last_attempt_at: now,
            },
        });

        const results = [] as Array<{ ok: boolean; error?: string }>;

        if (template.type !== TemplateType.WHATSAPP) {
            if (recipient.email) {
                const subject = this.renderTemplate(template.subject, recipient);
                const html = this.renderTemplate(template.body, recipient).replace(/\n/g, '<br />');
                const emailResult = await this.emailService.sendEmail({
                    to: recipient.email,
                    subject,
                    html,
                });
                results.push({ ok: emailResult.ok, error: emailResult.ok ? undefined : emailResult.error });
            } else {
                results.push({ ok: false, error: 'Email address missing for recipient' });
            }
        }

        if (template.type !== TemplateType.EMAIL) {
            if (recipient.phone) {
                const message = this.renderTemplate(template.body, recipient);
                const whatsAppResult = await this.whatsAppService.sendWhatsApp(recipient.phone, message);
                results.push({ ok: whatsAppResult.ok, error: whatsAppResult.ok ? undefined : whatsAppResult.error });
            } else {
                results.push({ ok: false, error: 'WhatsApp phone number missing for recipient' });
            }
        }

        const failedErrors = results.filter((item) => !item.ok).map((item) => item.error).filter(Boolean) as string[];
        const status = failedErrors.length ? 'FAILED' : 'SENT';
        const errorMessage = failedErrors.length ? failedErrors.join(' | ') : null;

        await this.prisma.recipient.update({
            where: { id: recipient.id },
            data: {
                status,
                error_message: errorMessage,
            },
        });

        await this.prisma.log.create({
            data: {
                recipientId: recipient.id,
                status,
                error: errorMessage,
            },
        });

        return { recipientId: recipient.id, status, error: errorMessage || undefined };
    }

    private renderTemplate(template: string, data: Record<string, any>) {
        return String(template || '').replace(/{{\s*([^}\s]+)\s*}}/g, (_, key) => {
            const value = data[key] ?? data[key.replace(/_/g, '')] ?? '';
            return String(value ?? '');
        });
    }

    private normalizeImportValue(value: unknown): string | null {
        if (value === null || value === undefined) {
            return null;
        }
        const normalized = String(value).trim();
        return normalized.length ? normalized : null;
    }
}
