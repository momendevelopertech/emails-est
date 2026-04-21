import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../notifications/email.service';
import { WhatsAppService } from '../notifications/whatsapp.service';
import { CreateRecipientDto } from './dto/create-recipient.dto';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { SendCampaignDto } from './dto/send-campaign.dto';
import { RetryRecipientsDto } from './dto/retry-recipients.dto';
import { RecipientFilterDto } from './dto/recipient-filter.dto';
import { ImportRecipientsDto } from './dto/import-recipients.dto';
import { Prisma, RecipientSheet, RecipientStatus, TemplateType } from '@prisma/client';
import { format } from 'date-fns';
import { randomUUID } from 'crypto';
import {
    buildRecipientDuplicateKey,
    isValidEmail,
    normalizeImportValue,
    normalizeRecipientImport,
    RECIPIENT_TEXT_FILTER_FIELDS,
} from './recipient-import';
import {
    buildExamAssignmentWhatsAppBody,
    EXAM_ASSIGNMENT_TEMPLATE_PRESETS,
    isRichHtmlEmailTemplate,
    parseExamAssignmentTemplateMeta,
} from './exam-assignment-template-presets';
import { normalizeEgyptMobilePhone } from '../shared/egypt-phone';

type SendResult = { recipientId: string; status: RecipientStatus; error?: string };
type RecipientResponseStatus = 'PENDING' | 'CONFIRMED' | 'DECLINED';
type WhatsAppReplyAction = 'CONFIRM' | 'DECLINE' | 'UNKNOWN';
type HierarchyRole = 'HEAD' | 'SENIOR' | 'INVIGILATOR';

@Injectable()
export class MessagingService {
    private readonly logger = new Logger(MessagingService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly emailService: EmailService,
        private readonly whatsAppService: WhatsAppService,
    ) {}

    async findRecipients(filter: RecipientFilterDto) {
        const page = Math.max(filter.page ?? 1, 1);
        const limit = Math.min(Math.max(filter.limit ?? 100, 1), 1500);
        const where = this.buildRecipientWhere(filter);

        const [items, total] = await Promise.all([
            this.prisma.recipient.findMany({
                where,
                orderBy: [
                    { cycle: { created_at: 'desc' } },
                    { created_at: 'desc' },
                ],
                include: {
                    cycle: {
                        select: {
                            id: true,
                            name: true,
                            source_file_name: true,
                        },
                    },
                },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.recipient.count({ where }),
        ]);

        return { items, total, page, limit };
    }

    async getCycles() {
        const cycles = await this.prisma.recipientCycle.findMany({
            orderBy: { created_at: 'desc' },
            include: {
                _count: {
                    select: {
                        recipients: true,
                    },
                },
            },
        });

        if (!cycles.length) {
            return [];
        }

        const groupedStatuses = await this.prisma.recipient.groupBy({
            by: ['cycleId', 'status'],
            where: {
                cycleId: { in: cycles.map((cycle) => cycle.id) },
            },
            _count: {
                _all: true,
            },
        });

        const countsByCycle = new Map<string, Record<RecipientStatus, number>>();
        for (const row of groupedStatuses) {
            if (!row.cycleId) {
                continue;
            }

            const current = countsByCycle.get(row.cycleId) ?? {
                PENDING: 0,
                PROCESSING: 0,
                SENT: 0,
                FAILED: 0,
            };
            current[row.status] = row._count._all;
            countsByCycle.set(row.cycleId, current);
        }

        return cycles.map((cycle) => {
            const counts = countsByCycle.get(cycle.id) ?? {
                PENDING: 0,
                PROCESSING: 0,
                SENT: 0,
                FAILED: 0,
            };

            return {
                id: cycle.id,
                name: cycle.name,
                slug: cycle.slug,
                source_file_name: cycle.source_file_name,
                imported_count: cycle.imported_count,
                skipped_count: cycle.skipped_count,
                created_at: cycle.created_at,
                updated_at: cycle.updated_at,
                recipients_count: cycle._count.recipients,
                pending_count: counts.PENDING,
                processing_count: counts.PROCESSING,
                sent_count: counts.SENT,
                failed_count: counts.FAILED,
            };
        });
    }

    async deleteCycle(cycleId: string) {
        const cycle = await this.prisma.recipientCycle.findUnique({
            where: { id: cycleId },
            select: { id: true },
        });

        if (!cycle) {
            throw new BadRequestException('Cycle not found.');
        }

        return this.prisma.$transaction(async (tx) => {
            const cycleRecipients = await tx.recipient.findMany({
                where: { cycleId },
                select: { id: true },
            });

            const recipientIds = cycleRecipients.map((recipient) => recipient.id);

            if (recipientIds.length) {
                await tx.log.deleteMany({
                    where: {
                        recipientId: { in: recipientIds },
                    },
                });

                await tx.recipient.deleteMany({
                    where: {
                        id: { in: recipientIds },
                    },
                });
            }

            await tx.recipientCycle.delete({
                where: { id: cycleId },
            });

            return {
                success: true,
                deletedRecipients: recipientIds.length,
            };
        });
    }

    async getRecipientFilterOptions(cycleId?: string) {
        const scopedWhere = cycleId ? { cycleId } : {};

        const [roles, types, governorates, sheets] = await Promise.all([
            this.prisma.recipient.findMany({
                where: {
                    ...scopedWhere,
                    role: { not: null },
                },
                select: { role: true },
                distinct: ['role'],
                orderBy: { role: 'asc' },
            }),
            this.prisma.recipient.findMany({
                where: {
                    ...scopedWhere,
                    type: { not: null },
                },
                select: { type: true },
                distinct: ['type'],
                orderBy: { type: 'asc' },
            }),
            this.prisma.recipient.findMany({
                where: {
                    ...scopedWhere,
                    governorate: { not: null },
                },
                select: { governorate: true },
                distinct: ['governorate'],
                orderBy: { governorate: 'asc' },
            }),
            this.prisma.recipient.groupBy({
                by: ['sheet'],
                where: scopedWhere,
                _count: {
                    _all: true,
                },
                orderBy: {
                    sheet: 'asc',
                },
            }),
        ]);

        return {
            roles: roles.map((item) => item.role).filter(Boolean),
            types: types.map((item) => item.type).filter(Boolean),
            governorates: governorates.map((item) => item.governorate).filter(Boolean),
            sheets: sheets.map((item) => ({
                value: item.sheet,
                count: item._count._all,
            })),
        };
    }

    async createRecipient(dto: CreateRecipientDto) {
        const normalized = normalizeRecipientImport(dto);
        if (!normalized.name) {
            throw new BadRequestException('Recipient name is required.');
        }
        if (!normalized.room_est1) {
            throw new BadRequestException('Recipient ROOM is required.');
        }
        if (!normalized.email) {
            throw new BadRequestException('Recipient email is required.');
        }
        if (normalized.sheet === RecipientSheet.LEGACY) {
            throw new BadRequestException('Recipient sheet must be EST1 or EST2.');
        }

        if (!isValidEmail(normalized.email)) {
            throw new BadRequestException('Recipient email is invalid.');
        }

        return this.prisma.recipient.create({
            data: {
                ...normalized,
                status: RecipientStatus.PENDING,
                confirmation_token: randomUUID(),
            },
        });
    }

    async updateRecipient(id: string, dto: CreateRecipientDto) {
        const normalized = normalizeRecipientImport(dto);
        if (!normalized.name) {
            throw new BadRequestException('Recipient name is required.');
        }
        if (!normalized.room_est1) {
            throw new BadRequestException('Recipient ROOM is required.');
        }
        if (!normalized.email) {
            throw new BadRequestException('Recipient email is required.');
        }
        if (normalized.sheet === RecipientSheet.LEGACY) {
            throw new BadRequestException('Recipient sheet must be EST1 or EST2.');
        }

        if (!isValidEmail(normalized.email)) {
            throw new BadRequestException('Recipient email is invalid.');
        }

        return this.prisma.recipient.update({
            where: { id },
            data: {
                ...normalized,
                cycleId: normalized.cycleId ?? undefined,
            },
        });
    }

    async deleteRecipient(id: string) {
        return this.prisma.recipient.delete({ where: { id } });
    }

    async importRecipients(dto: ImportRecipientsDto) {
        const skippedRows: Array<{ row: number; reason: string }> = [];
        const seenRows = new Set<string>();
        

        const normalizedRecipients = dto.recipients.flatMap((recipient, index) => {
            const normalized = normalizeRecipientImport(recipient);
            const reasons: string[] = [];

            const duplicateKey = buildRecipientDuplicateKey(normalized);
            if (!reasons.length && seenRows.has(duplicateKey)) {
                reasons.push('Duplicate row inside the same cycle upload');
            }

            if (reasons.length) {
                skippedRows.push({
                    row: index + 2,
                    reason: reasons.join(', '),
                });
                return [];
            }

            seenRows.add(duplicateKey);
            return [{
                ...normalized,
                status: RecipientStatus.PENDING,
                confirmation_token: randomUUID(),
            }];
        });

        if (!normalizedRecipients.length) {
            this.logger.warn(`Import skipped بالكامل. Invalid rows: ${skippedRows.length}`);
            return {
                imported: 0,
                skipped: skippedRows.length,
                cycle: null,
                skipped_rows: skippedRows,
            };
        }

        const cycleName = this.buildCycleName(dto.cycle_name, dto.source_file_name);
        const createdAt = new Date();
        const cycleId = randomUUID();
        const cycleData = {
            id: cycleId,
            name: cycleName,
            slug: this.buildCycleSlug(cycleName, createdAt),
            source_file_name: normalizeImportValue(dto.source_file_name),
            imported_count: normalizedRecipients.length,
            skipped_count: skippedRows.length,
        };

        await this.prisma.$transaction([
            this.prisma.recipientCycle.create({
                data: {
                    ...cycleData,
                },
            }),
            this.prisma.recipient.createMany({
                data: normalizedRecipients.map((recipient) => {
                    const { cycleId: _ignored, ...rest } = recipient;
                    return {
                        ...rest,
                        cycleId,
                    };
                }),
            }),
        ]);

        const cycle = await this.prisma.recipientCycle.findUniqueOrThrow({
            where: { id: cycleId },
        });

        this.logger.log(
            `Imported ${normalizedRecipients.length} recipients into cycle ${createdCycleLabel(cycle)}. Skipped ${skippedRows.length} rows.`,
        );

        return {
            imported: normalizedRecipients.length,
            skipped: skippedRows.length,
            cycle,
            skipped_rows: skippedRows,
        };
    }

    async confirmRecipient(token: string) {
        if (!token?.trim()) {
            throw new BadRequestException('Confirmation token is required.');
        }

        const recipient = await this.prisma.recipient.findUnique({
            where: { confirmation_token: token.trim() },
            select: {
                id: true,
                confirmed_at: true,
                declined_at: true,
                name: true,
                email: true,
            },
        });

        if (!recipient) {
            throw new BadRequestException('Invalid or expired confirmation link.');
        }

        if (recipient.declined_at) {
            return {
                confirmed: false,
                status: 'DECLINED' as RecipientResponseStatus,
                message: 'You already sent an apology for this assignment.',
            };
        }

        if (recipient.confirmed_at && !recipient.declined_at) {
            return {
                confirmed: true,
                status: 'CONFIRMED' as RecipientResponseStatus,
                message: 'This assignment has already been confirmed.',
            };
        }

        await this.prisma.recipient.update({
            where: { id: recipient.id },
            data: {
                confirmed_at: new Date(),
                declined_at: null,
            },
        });

        return {
            confirmed: true,
            status: 'CONFIRMED' as RecipientResponseStatus,
            message: 'Your assignment has been confirmed successfully.',
        };
    }

    async declineRecipient(token: string) {
        if (!token?.trim()) {
            throw new BadRequestException('Confirmation token is required.');
        }

        const recipient = await this.prisma.recipient.findUnique({
            where: { confirmation_token: token.trim() },
            select: {
                id: true,
                confirmed_at: true,
                declined_at: true,
                name: true,
                email: true,
            },
        });

        if (!recipient) {
            throw new BadRequestException('Invalid or expired confirmation link.');
        }

        if (recipient.confirmed_at) {
            return {
                declined: false,
                status: 'CONFIRMED' as RecipientResponseStatus,
                message: 'You already confirmed attendance for this assignment.',
            };
        }

        if (recipient.declined_at && !recipient.confirmed_at) {
            return {
                declined: true,
                status: 'DECLINED' as RecipientResponseStatus,
                message: 'This assignment has already been declined.',
            };
        }

        await this.prisma.recipient.update({
            where: { id: recipient.id },
            data: {
                confirmed_at: null,
                declined_at: new Date(),
            },
        });

        return {
            declined: true,
            status: 'DECLINED' as RecipientResponseStatus,
            message: 'Your apology has been recorded successfully.',
        };
    }

    async getRecipientResponse(token: string) {
        if (!token?.trim()) {
            throw new BadRequestException('Confirmation token is required.');
        }

        const recipient = await this.prisma.recipient.findUnique({
            where: { confirmation_token: token.trim() },
            select: {
                id: true,
                name: true,
                arabic_name: true,
                email: true,
                phone: true,
                role: true,
                type: true,
                room_est1: true,
                governorate: true,
                building: true,
                address: true,
                location: true,
                confirmed_at: true,
                declined_at: true,
            },
        });

        if (!recipient) {
            throw new BadRequestException('Invalid or expired confirmation link.');
        }

        return {
            status: this.resolveRecipientResponseStatus(recipient),
            recipient,
        };
    }

    async processWhatsAppReply(phone: string, message: string) {
        const normalizedPhone = normalizeEgyptMobilePhone(phone);
        if (!normalizedPhone) {
            throw new BadRequestException('WhatsApp phone number is required.');
        }

        const rawMessage = String(message || '').trim();
        if (!rawMessage) {
            throw new BadRequestException('WhatsApp message is required.');
        }

        const replyAction = this.resolveWhatsAppReplyAction(rawMessage);
        if (replyAction === 'UNKNOWN') {
            const helpMessage = 'للتأكيد اكتب confirm. للاعتذار اكتب apology.';
            await this.whatsAppService.sendWhatsApp(normalizedPhone, helpMessage);
            return { matched: false, status: 'PENDING' as RecipientResponseStatus, message: helpMessage };
        }

        const recipients = await this.prisma.recipient.findMany({
            where: {
                phone: { in: this.buildPhoneCandidates(normalizedPhone) },
                confirmation_token: { not: null },
            },
            orderBy: [{ created_at: 'desc' }],
            take: 1,
            select: { confirmation_token: true },
        });

        const token = recipients[0]?.confirmation_token;
        if (!token) {
            const notFoundMessage = 'لا يوجد تكليف نشط مرتبط برقم واتساب هذا.';
            await this.whatsAppService.sendWhatsApp(normalizedPhone, notFoundMessage);
            return { matched: false, status: 'PENDING' as RecipientResponseStatus, message: notFoundMessage };
        }

        const response = replyAction === 'CONFIRM'
            ? await this.confirmRecipient(token)
            : await this.declineRecipient(token);

        const outgoingMessage = this.resolveWhatsAppStatusReply(replyAction, response.status as RecipientResponseStatus);
        await this.whatsAppService.sendWhatsApp(normalizedPhone, outgoingMessage);
        return { matched: true, status: response.status as RecipientResponseStatus, message: outgoingMessage };
    }

    async processWhatsAppWebhook(payload: unknown) {
        const incoming = this.extractIncomingWhatsAppText(payload);
        if (!incoming) {
            return { processed: false, ignored: true, reason: 'No incoming text message payload detected.' };
        }

        const result = await this.processWhatsAppReply(incoming.phone, incoming.message);
        return {
            processed: true,
            ignored: false,
            ...result,
            source_phone: incoming.phone,
            source_message: incoming.message,
        };
    }

    async sendHierarchyWhatsAppBriefs(options?: { cycleId?: string; sheet?: RecipientSheet; dry_run?: boolean }) {
        const cycleId = String(options?.cycleId || '').trim();
        const dryRun = Boolean(options?.dry_run);
        const where: Prisma.RecipientWhereInput = {};

        if (cycleId) {
            where.cycleId = cycleId;
        }

        if (options?.sheet) {
            where.sheet = options.sheet;
        }

        const recipients = await this.prisma.recipient.findMany({
            where,
            select: {
                id: true,
                name: true,
                phone: true,
                role: true,
                building: true,
                test_center: true,
                division: true,
                room_est1: true,
            },
        });

        const byBuilding = new Map<string, typeof recipients>();
        for (const recipient of recipients) {
            const building = this.resolveHierarchyBuilding(recipient);
            const bucket = byBuilding.get(building) ?? [];
            bucket.push(recipient);
            byBuilding.set(building, bucket);
        }

        const details: Array<{
            recipient_id: string;
            recipient_name: string;
            role: 'HEAD' | 'SENIOR';
            phone: string | null;
            building: string;
            floor: string | null;
            status: 'SENT' | 'FAILED' | 'SKIPPED';
            reason?: string;
            message_preview: string;
        }> = [];

        let targetedHeads = 0;
        let sentHeads = 0;
        let failedHeads = 0;
        let skippedHeads = 0;
        let targetedSeniors = 0;
        let sentSeniors = 0;
        let failedSeniors = 0;
        let skippedSeniors = 0;
        let floorCount = 0;

        for (const [building, buildingRecipients] of byBuilding.entries()) {
            const heads = this.deduplicateHierarchyRecipients(
                buildingRecipients.filter((recipient) => this.resolveHierarchyRole(recipient.role) === 'HEAD'),
            );
            const seniors = this.deduplicateHierarchyRecipients(
                buildingRecipients.filter((recipient) => this.resolveHierarchyRole(recipient.role) === 'SENIOR'),
            );
            const invigilators = buildingRecipients.filter((recipient) => this.resolveHierarchyRole(recipient.role) === 'INVIGILATOR');

            const seniorsByFloor = new Map<string, typeof seniors>();
            for (const senior of seniors) {
                const floor = this.resolveHierarchyFloor(senior);
                const list = seniorsByFloor.get(floor) ?? [];
                list.push(senior);
                seniorsByFloor.set(floor, list);
            }

            const invigilatorsByFloor = new Map<string, typeof invigilators>();
            for (const invigilator of invigilators) {
                const floor = this.resolveHierarchyFloor(invigilator);
                const list = invigilatorsByFloor.get(floor) ?? [];
                list.push(invigilator);
                invigilatorsByFloor.set(floor, list);
            }

            floorCount += new Set<string>([
                ...Array.from(seniorsByFloor.keys()),
                ...Array.from(invigilatorsByFloor.keys()),
            ]).size;

            for (const head of heads) {
                targetedHeads += 1;
                const message = this.buildHeadBriefMessage(building, seniorsByFloor);

                if (!head.phone) {
                    skippedHeads += 1;
                    details.push({
                        recipient_id: head.id,
                        recipient_name: head.name || 'Unknown',
                        role: 'HEAD',
                        phone: null,
                        building,
                        floor: null,
                        status: 'SKIPPED',
                        reason: 'Missing phone number',
                        message_preview: message,
                    });
                    continue;
                }

                if (dryRun) {
                    sentHeads += 1;
                    details.push({
                        recipient_id: head.id,
                        recipient_name: head.name || 'Unknown',
                        role: 'HEAD',
                        phone: head.phone,
                        building,
                        floor: null,
                        status: 'SENT',
                        reason: 'Dry run preview',
                        message_preview: message,
                    });
                    continue;
                }

                const delivery = await this.whatsAppService.sendWhatsApp(head.phone, message);
                if (delivery.ok) {
                    sentHeads += 1;
                    details.push({
                        recipient_id: head.id,
                        recipient_name: head.name || 'Unknown',
                        role: 'HEAD',
                        phone: head.phone,
                        building,
                        floor: null,
                        status: 'SENT',
                        message_preview: message,
                    });
                    continue;
                }

                failedHeads += 1;
                details.push({
                    recipient_id: head.id,
                    recipient_name: head.name || 'Unknown',
                    role: 'HEAD',
                    phone: head.phone,
                    building,
                    floor: null,
                    status: 'FAILED',
                    reason: delivery.error || 'Unknown WhatsApp delivery error',
                    message_preview: message,
                });
            }

            for (const senior of seniors) {
                targetedSeniors += 1;
                const floor = this.resolveHierarchyFloor(senior);
                const floorInvigilators = this.deduplicateHierarchyRecipients(
                    (invigilatorsByFloor.get(floor) ?? []).filter((item) => item.id !== senior.id),
                );
                const message = this.buildSeniorBriefMessage(building, floor, floorInvigilators);

                if (!senior.phone) {
                    skippedSeniors += 1;
                    details.push({
                        recipient_id: senior.id,
                        recipient_name: senior.name || 'Unknown',
                        role: 'SENIOR',
                        phone: null,
                        building,
                        floor,
                        status: 'SKIPPED',
                        reason: 'Missing phone number',
                        message_preview: message,
                    });
                    continue;
                }

                if (dryRun) {
                    sentSeniors += 1;
                    details.push({
                        recipient_id: senior.id,
                        recipient_name: senior.name || 'Unknown',
                        role: 'SENIOR',
                        phone: senior.phone,
                        building,
                        floor,
                        status: 'SENT',
                        reason: 'Dry run preview',
                        message_preview: message,
                    });
                    continue;
                }

                const delivery = await this.whatsAppService.sendWhatsApp(senior.phone, message);
                if (delivery.ok) {
                    sentSeniors += 1;
                    details.push({
                        recipient_id: senior.id,
                        recipient_name: senior.name || 'Unknown',
                        role: 'SENIOR',
                        phone: senior.phone,
                        building,
                        floor,
                        status: 'SENT',
                        message_preview: message,
                    });
                    continue;
                }

                failedSeniors += 1;
                details.push({
                    recipient_id: senior.id,
                    recipient_name: senior.name || 'Unknown',
                    role: 'SENIOR',
                    phone: senior.phone,
                    building,
                    floor,
                    status: 'FAILED',
                    reason: delivery.error || 'Unknown WhatsApp delivery error',
                    message_preview: message,
                });
            }
        }

        return {
            dry_run: dryRun,
            cycle_id: cycleId || null,
            sheet: options?.sheet || null,
            summary: {
                buildings: byBuilding.size,
                floors: floorCount,
                heads: {
                    targeted: targetedHeads,
                    sent: sentHeads,
                    failed: failedHeads,
                    skipped: skippedHeads,
                },
                seniors: {
                    targeted: targetedSeniors,
                    sent: sentSeniors,
                    failed: failedSeniors,
                    skipped: skippedSeniors,
                },
            },
            details,
        };
    }

    async getTemplates() {
        await this.ensureExamAssignmentTemplates();
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

    async getLogs(page = 1, limit = 100, cycleId?: string) {
        const effectivePage = Math.max(page, 1);
        const effectiveLimit = Math.min(Math.max(limit, 1), 500);
        const where = cycleId
            ? {
                recipient: {
                    cycleId,
                },
            }
            : undefined;

        const [items, total] = await Promise.all([
            this.prisma.log.findMany({
                where,
                orderBy: { created_at: 'desc' },
                include: {
                    recipient: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            phone: true,
                            status: true,
                            cycleId: true,
                            sheet: true,
                            cycle: {
                                select: {
                                    id: true,
                                    name: true,
                                },
                            },
                        },
                    },
                },
                skip: (effectivePage - 1) * effectiveLimit,
                take: effectiveLimit,
            }),
            this.prisma.log.count({ where }),
        ]);

        return { items, total, page: effectivePage, limit: effectiveLimit };
    }

    async sendCampaign(dto: SendCampaignDto) {
        const template = await this.prisma.template.findUnique({ where: { id: dto.templateId } });
        if (!template) {
            throw new BadRequestException('Template not found');
        }

        const recipients = await this.findRecipientsForSend(dto);
        const results = await this.processRecipients(recipients, template);

        return {
            template: { id: template.id, name: template.name },
            cycleId: dto.cycleId ?? dto.filter?.cycleId ?? null,
            total: results.length,
            processed: results.filter((item) => item.status === RecipientStatus.SENT).length,
            failed: results.filter((item) => item.status === RecipientStatus.FAILED).length,
            results,
        };
    }

    async retryRecipients(dto: RetryRecipientsDto) {
        const template = await this.prisma.template.findUnique({ where: { id: dto.templateId } });
        if (!template) {
            throw new BadRequestException('Template not found');
        }

        const recipients = dto.ids && dto.ids.length > 0
            ? await this.prisma.recipient.findMany({
                where: {
                    id: { in: dto.ids },
                    ...(dto.cycleId ? { cycleId: dto.cycleId } : {}),
                },
            })
            : await this.prisma.recipient.findMany({
                where: {
                    status: RecipientStatus.FAILED,
                    ...(dto.cycleId ? { cycleId: dto.cycleId } : {}),
                },
            });

        const results = await this.processRecipients(recipients, template);

        return {
            template: { id: template.id, name: template.name },
            cycleId: dto.cycleId ?? null,
            total: results.length,
            processed: results.filter((item) => item.status === RecipientStatus.SENT).length,
            failed: results.filter((item) => item.status === RecipientStatus.FAILED).length,
            results,
        };
    }

    private async findRecipientsForSend(dto: SendCampaignDto) {
        const where: Prisma.RecipientWhereInput = {};
        if (dto.cycleId) {
            where.cycleId = dto.cycleId;
        }

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
            Object.assign(where, this.buildRecipientWhere(dto.filter));
        }

        return this.prisma.recipient.findMany({ where });
    }

    private buildFrontendUrl() {
        return String(process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
    }

    private buildResponseUrl(recipient: Record<string, any>, action?: 'confirm' | 'decline') {
        const token = recipient.confirmation_token;
        if (!token) {
            return '';
        }

        const params = new URLSearchParams({ token: String(token) });
        if (action) {
            params.set('action', action);
        }

        return `${this.buildFrontendUrl()}/messaging/confirm?${params.toString()}`;
    }

    private async processRecipients(recipients: Array<{ id: string }>, template: { subject: string; body: string; type: TemplateType }) {
        if (!recipients.length) {
            return [] as SendResult[];
        }

        const concurrency = this.getSendConcurrency();
        const results: SendResult[] = [];

        for (let index = 0; index < recipients.length; index += concurrency) {
            const chunk = recipients.slice(index, index + concurrency);
            const chunkResults = await Promise.all(
                chunk.map((recipient) => this.sendToRecipient(recipient, template)),
            );
            results.push(...chunkResults);
        }

        this.logger.log(`Processed ${results.length} recipients with concurrency ${concurrency}.`);
        return results;
    }

    private async sendToRecipient(recipient: any, template: any): Promise<SendResult> {
        const now = new Date();
        await this.prisma.recipient.update({
            where: { id: recipient.id },
            data: {
                status: RecipientStatus.PROCESSING,
                attempts_count: { increment: 1 },
                last_attempt_at: now,
                error_message: null,
            },
        });

        const results = [] as Array<{ ok: boolean; error?: string }>;

        const recipientWithActionUrls = {
            ...recipient,
            confirm_url: this.buildResponseUrl(recipient, 'confirm'),
            decline_url: this.buildResponseUrl(recipient, 'decline'),
            response_url: this.buildResponseUrl(recipient),
        };

        if (template.type !== TemplateType.WHATSAPP) {
            if (recipient.email) {
                const subject = this.renderTemplate(template.subject, recipientWithActionUrls);
                const html = this.renderEmailBody(template.body, recipientWithActionUrls);
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
                const message = this.renderWhatsAppBody(template.body, recipientWithActionUrls);
                const whatsAppResult = await this.whatsAppService.sendWhatsApp(recipient.phone, message);
                results.push({ ok: whatsAppResult.ok, error: whatsAppResult.ok ? undefined : whatsAppResult.error });
            } else {
                results.push({ ok: false, error: 'WhatsApp phone number missing for recipient' });
            }
        }

        const failedErrors = results.filter((item) => !item.ok).map((item) => item.error).filter(Boolean) as string[];
        const status = failedErrors.length ? RecipientStatus.FAILED : RecipientStatus.SENT;
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

    private renderTemplate(template: string, data: Record<string, any>, options?: { escapeHtmlValues?: boolean }) {
        return String(template || '').replace(/{{\s*([^}\s]+)\s*}}/g, (_, key) => {
            const value = data[key] ?? data[key.replace(/_/g, '')] ?? '';
            const normalized = String(value ?? '');
            return options?.escapeHtmlValues ? this.escapeHtml(normalized) : normalized;
        });
    }

    private renderEmailBody(templateBody: string, recipient: Record<string, any>) {
        if (isRichHtmlEmailTemplate(templateBody)) {
            return this.renderTemplate(templateBody, recipient, { escapeHtmlValues: true });
        }

        const plainText = this.renderTemplate(templateBody, recipient);
        return this.escapeHtml(plainText).replace(/\n/g, '<br />');
    }

    private renderWhatsAppBody(templateBody: string, recipient: Record<string, any>) {
        if (isRichHtmlEmailTemplate(templateBody)) {
            const guidedTemplateMeta = parseExamAssignmentTemplateMeta(templateBody);
            if (guidedTemplateMeta) {
                return buildExamAssignmentWhatsAppBody(guidedTemplateMeta, recipient);
            }

            const renderedHtml = this.renderTemplate(templateBody, recipient, { escapeHtmlValues: true });
            return this.htmlToPlainText(renderedHtml);
        }

        return this.renderTemplate(templateBody, recipient);
    }

    private escapeHtml(value: string) {
        return value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    private decodeHtmlEntities(value: string) {
        return value
            .replace(/&nbsp;/gi, ' ')
            .replace(/&amp;/gi, '&')
            .replace(/&quot;/gi, '"')
            .replace(/&#39;/gi, "'")
            .replace(/&lt;/gi, '<')
            .replace(/&gt;/gi, '>')
            .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)));
    }

    private htmlToPlainText(value: string) {
        return this.decodeHtmlEntities(
            String(value || '')
                .replace(/<style[\s\S]*?<\/style>/gi, ' ')
                .replace(/<script[\s\S]*?<\/script>/gi, ' ')
                .replace(/<a\b[^>]*href=(['"])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi, (_, _quote, href, label) => {
                    const cleanLabel = this.decodeHtmlEntities(String(label || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
                    const cleanHref = this.decodeHtmlEntities(String(href || '').trim());
                    if (!cleanHref) {
                        return cleanLabel;
                    }

                    if (!cleanLabel || cleanLabel === cleanHref) {
                        return cleanHref;
                    }

                    return `${cleanLabel}: ${cleanHref}`;
                })
                .replace(/<(br|\/p|\/div|\/tr|\/table|\/h[1-6]|\/li|li|\/ul|\/ol)\b[^>]*>/gi, '\n')
                .replace(/<[^>]+>/g, ' ')
                .replace(/\s+\n/g, '\n')
                .replace(/\n{3,}/g, '\n\n')
                .replace(/[ \t]{2,}/g, ' ')
                .trim(),
        );
    }

    private async ensureExamAssignmentTemplates() {
        const existingTemplates = await this.prisma.template.findMany({
            where: {
                name: {
                    in: EXAM_ASSIGNMENT_TEMPLATE_PRESETS.map((template) => template.name),
                },
            },
            select: {
                id: true,
                name: true,
                type: true,
                subject: true,
                body: true,
                include_confirmation_button: true,
            },
        });

        const existingByName = new Map(existingTemplates.map((template) => [template.name, template]));

        await Promise.all(EXAM_ASSIGNMENT_TEMPLATE_PRESETS.map(async (preset) => {
            const existing = existingByName.get(preset.name);

            if (!existing) {
                await this.prisma.template.create({
                    data: {
                        name: preset.name,
                        type: preset.type,
                        subject: preset.subject,
                        body: preset.body,
                        include_confirmation_button: preset.include_confirmation_button || false,
                    },
                });
                return;
            }

            if (
                existing.type !== preset.type
                || existing.subject !== preset.subject
                || existing.body !== preset.body
                || existing.include_confirmation_button !== (preset.include_confirmation_button || false)
            ) {
                await this.prisma.template.update({
                    where: { id: existing.id },
                    data: {
                        type: preset.type,
                        subject: preset.subject,
                        body: preset.body,
                        include_confirmation_button: preset.include_confirmation_button || false,
                    },
                });
            }
        }));
    }

    private buildRecipientWhere(filter: RecipientFilterDto): Prisma.RecipientWhereInput {
        const where: Prisma.RecipientWhereInput = {};
        const textFilters: Array<keyof RecipientFilterDto> = [
            'name',
            'email',
            'exam_type',
            'role',
            'day',
            'room',
            'room_est1',
            'type',
            'governorate',
            'address',
            'building',
            'location',
            'division',
            'phone',
            'employer',
            'arabic_name',
        ];

        if (filter.cycleId) {
            where.cycleId = filter.cycleId;
        }

        if (filter.sheet) {
            where.sheet = filter.sheet;
        }

        for (const field of textFilters) {
            const value = normalizeImportValue(filter[field]);
            if (!value) {
                continue;
            }

            where[field] = { contains: value, mode: 'insensitive' };
        }

        if (filter.status) {
            where.status = filter.status;
        }

        const searchValue = normalizeImportValue(filter.search);
        if (searchValue) {
            where.OR = RECIPIENT_TEXT_FILTER_FIELDS.map((field) => ({
                [field]: { contains: searchValue, mode: 'insensitive' },
            }));
        }

        return where;
    }

    private buildCycleName(cycleName?: string, sourceFileName?: string) {
        const explicitName = normalizeImportValue(cycleName);
        if (explicitName) {
            return explicitName;
        }

        const fileStem = normalizeImportValue(sourceFileName)
            ?.replace(/\.[^.]+$/, '')
            ?.replace(/[_-]+/g, ' ')
            ?.replace(/\s+/g, ' ')
            ?.trim();

        const label = fileStem || 'Exam cycle';
        return `${label} - ${format(new Date(), 'yyyy-MM-dd HH:mm')}`;
    }

    private buildCycleSlug(cycleName: string, createdAt: Date) {
        const base = cycleName
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            || 'exam-cycle';

        return `${base}-${format(createdAt, 'yyyyMMddHHmmss')}`;
    }

    private getSendConcurrency() {
        const parsed = parseInt(process.env.MESSAGING_SEND_CONCURRENCY || '', 10);
        return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 50) : 10;
    }

    private resolveRecipientResponseStatus(recipient: { confirmed_at?: Date | null; declined_at?: Date | null }): RecipientResponseStatus {
        if (recipient.declined_at) {
            return 'DECLINED';
        }

        if (recipient.confirmed_at) {
            return 'CONFIRMED';
        }

        return 'PENDING';
    }

    private resolveWhatsAppReplyAction(message: string): WhatsAppReplyAction {
        const normalized = String(message || '')
            .trim()
            .toLowerCase()
            .replace(/[^\p{L}\p{N}\s]/gu, ' ')
            .replace(/\s+/g, ' ');

        if (['confirm', 'confirmed', 'yes', 'ok', 'attend', 'حاضر', 'موافق', 'تاكيد', 'تأكيد'].includes(normalized)) {
            return 'CONFIRM';
        }

        if (['apology', 'apologize', 'apologise', 'decline', 'sorry', 'اعتذار', 'اعتذر'].includes(normalized)) {
            return 'DECLINE';
        }

        return 'UNKNOWN';
    }

    private extractIncomingWhatsAppText(payload: unknown) {
        const body = (payload && typeof payload === 'object') ? (payload as Record<string, any>) : {};
        const messageData = body.messageData || {};
        const senderData = body.senderData || {};
        const typeWebhook = String(body.typeWebhook || '').trim();
        if (typeWebhook && typeWebhook !== 'incomingMessageReceived') {
            return null;
        }

        const message = this.extractWebhookMessageText(messageData);
        if (!message) {
            return null;
        }

        const phone = this.extractWebhookMessagePhone(senderData, body);
        if (!phone) {
            return null;
        }

        return { phone, message };
    }

    private extractWebhookMessageText(messageData: Record<string, any>) {
        const text = String(
            messageData?.textMessageData?.textMessage
            ?? messageData?.extendedTextMessageData?.text
            ?? messageData?.buttonsResponseMessage?.selectedButtonId
            ?? messageData?.buttonsResponseMessage?.selectedDisplayText
            ?? messageData?.templateButtonReplyMessage?.selectedId
            ?? messageData?.templateButtonReplyMessage?.selectedDisplayText
            ?? '',
        ).trim();

        return text || null;
    }

    private extractWebhookMessagePhone(senderData: Record<string, any>, body: Record<string, any>) {
        const raw = String(
            senderData?.chatId
            ?? senderData?.sender
            ?? senderData?.senderId
            ?? body?.chatId
            ?? '',
        ).trim();

        if (!raw || raw.endsWith('@g.us')) {
            return null;
        }

        const normalizedChat = raw.replace(/@.+$/, '');
        return normalizeEgyptMobilePhone(normalizedChat);
    }

    private resolveWhatsAppStatusReply(action: WhatsAppReplyAction, status: RecipientResponseStatus) {
        if (action === 'CONFIRM') {
            if (status === 'CONFIRMED') {
                return 'تم تأكيد الحضور بنجاح.';
            }
            if (status === 'DECLINED') {
                return 'تم تسجيل اعتذارك مسبقًا لهذا التكليف.';
            }
            return 'لم يتم العثور على تكليف صالح للتأكيد.';
        }

        if (action === 'DECLINE') {
            if (status === 'DECLINED') {
                return 'تم قبول الاعتذار بنجاح.';
            }
            if (status === 'CONFIRMED') {
                return 'تم تأكيد الحضور مسبقًا لهذا التكليف.';
            }
            return 'لم يتم العثور على تكليف صالح للاعتذار.';
        }

        return 'يرجى الرد بكلمة confirm للتأكيد أو apology للاعتذار.';
    }

    private resolveHierarchyRole(role?: string | null): HierarchyRole {
        const normalized = String(role || '')
            .trim()
            .toLowerCase()
            .replace(/[^\p{L}\p{N}\s]/gu, ' ')
            .replace(/\s+/g, ' ');

        if (!normalized) {
            return 'INVIGILATOR';
        }

        if (
            normalized.includes('head')
            || normalized.includes('chief')
            || normalized.includes('lead')
            || normalized.includes('هيد')
            || normalized.includes('رئيس')
        ) {
            return 'HEAD';
        }

        if (
            normalized.includes('senior')
            || normalized.includes('سنيور')
        ) {
            return 'SENIOR';
        }

        return 'INVIGILATOR';
    }

    private resolveHierarchyBuilding(recipient: { building?: string | null; test_center?: string | null }) {
        return normalizeImportValue(recipient.building)
            ?? normalizeImportValue(recipient.test_center)
            ?? 'Unassigned Building';
    }

    private resolveHierarchyFloor(recipient: { division?: string | null }) {
        return normalizeImportValue(recipient.division) ?? 'General';
    }

    private deduplicateHierarchyRecipients<T extends { id: string; phone?: string | null; name?: string | null }>(items: T[]) {
        const seen = new Set<string>();
        const output: T[] = [];

        for (const item of items) {
            const key = normalizeImportValue(item.phone) || `${normalizeImportValue(item.name) || ''}:${item.id}`;
            if (seen.has(key)) {
                continue;
            }
            seen.add(key);
            output.push(item);
        }

        return output;
    }

    private buildHeadBriefMessage(
        building: string,
        seniorsByFloor: Map<string, Array<{ name: string | null; phone: string | null }>>,
    ) {
        const lines = [
            '*EST Building Brief*',
            `Building: ${building}`,
            '',
            '*Floors and assigned seniors*',
        ];

        const floorEntries = Array.from(seniorsByFloor.entries()).sort(([floorA], [floorB]) => floorA.localeCompare(floorB));
        if (!floorEntries.length) {
            lines.push('- No senior assignments available yet.');
        } else {
            for (const [floor, seniors] of floorEntries) {
                const people = seniors.length
                    ? seniors.map((senior) => {
                        const seniorName = normalizeImportValue(senior.name) ?? 'Unnamed Senior';
                        const seniorPhone = normalizeImportValue(senior.phone) ?? 'No phone';
                        return `${seniorName} (${seniorPhone})`;
                    }).join(', ')
                    : 'No senior assigned';
                lines.push(`- Floor ${floor}: ${people}`);
            }
        }

        lines.push('', 'Best regards,', 'EST Team');
        return lines.join('\n');
    }

    private buildSeniorBriefMessage(
        building: string,
        floor: string,
        invigilators: Array<{ name: string | null; phone: string | null; room_est1: string | null }>,
    ) {
        const lines = [
            '*EST Senior Brief*',
            `Building: ${building}`,
            `Floor: ${floor}`,
            '',
            '*Invigilators in this floor*',
        ];

        if (!invigilators.length) {
            lines.push('No invigilators assigned to this floor yet.');
        } else {
            invigilators
                .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')))
                .forEach((invigilator, index) => {
                    const name = normalizeImportValue(invigilator.name) ?? 'Unnamed Invigilator';
                    const phone = normalizeImportValue(invigilator.phone) ?? 'No phone';
                    const room = normalizeImportValue(invigilator.room_est1) ?? 'No room';
                    lines.push(`${index + 1}. ${name} | ${phone} | Room ${room}`);
                });
        }

        lines.push('', 'Best regards,', 'EST Team');
        return lines.join('\n');
    }

    private buildPhoneCandidates(normalizedLocalPhone: string) {
        const withCountryCode = `20${normalizedLocalPhone.slice(1)}`;
        return [
            normalizedLocalPhone,
            withCountryCode,
            `+${withCountryCode}`,
            `0${withCountryCode.slice(2)}`,
        ];
    }
}

function createdCycleLabel(cycle: { id: string; name: string }) {
    return `${cycle.name} (${cycle.id})`;
}
