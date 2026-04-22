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
import { HierarchyBriefChannel, SendHierarchyBriefsDto } from './dto/send-hierarchy-briefs.dto';
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
type HierarchyTargetRole = 'HEAD' | 'SENIOR';

type HierarchyRecipientRow = {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    role: string | null;
    building: string | null;
    test_center: string | null;
    division: string | null;
    room_est1: string | null;
    created_at: Date;
};

type HierarchyRecipientWithOrder = HierarchyRecipientRow & {
    row_order: number;
    normalized_role: HierarchyRole;
    normalized_building: string;
};

type HierarchySeniorNode = {
    target: HierarchyRecipientWithOrder;
    floor: string;
    head_id: string | null;
    members: HierarchyRecipientWithOrder[];
};

type HierarchyHeadNode = {
    target: HierarchyRecipientWithOrder;
    seniors: HierarchySeniorNode[];
};

type HierarchyTargetPreview = {
    role: HierarchyTargetRole;
    recipient_id: string;
    recipient_name: string;
    row_order: number;
    building: string;
    floor: string | null;
    phone: string | null;
    email: string | null;
    whatsapp_message: string;
    email_subject: string;
    email_body_html: string;
    seniors: Array<{
        recipient_id: string;
        recipient_name: string;
        row_order: number;
        floor: string;
        phone: string | null;
        email: string | null;
        invigilators_count: number;
    }>;
    members: Array<{
        recipient_id: string;
        recipient_name: string;
        row_order: number;
        role: string | null;
        room: string | null;
        phone: string | null;
        email: string | null;
    }>;
};

type ChannelDeliveryState = 'SENT' | 'FAILED' | 'SKIPPED';

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

    async updateRecipientResponse(id: string, status: RecipientResponseStatus) {
        const recipient = await this.prisma.recipient.findUnique({
            where: { id },
            select: { id: true },
        });

        if (!recipient) {
            throw new BadRequestException('Recipient not found.');
        }

        const now = new Date();
        const responseData = status === 'CONFIRMED'
            ? { confirmed_at: now, declined_at: null }
            : status === 'DECLINED'
                ? { confirmed_at: null, declined_at: now }
                : { confirmed_at: null, declined_at: null };

        return this.prisma.recipient.update({
            where: { id },
            data: responseData,
            select: {
                id: true,
                confirmed_at: true,
                declined_at: true,
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
                data: normalizedRecipients.map((recipient, index) => {
                    const { cycleId: _ignored, ...rest } = recipient;
                    return {
                        ...rest,
                        cycleId,
                        // Preserve Excel row order deterministically for preview/send sequencing.
                        created_at: new Date(createdAt.getTime() + index),
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

    async previewHierarchyBriefs(options?: SendHierarchyBriefsDto) {
        return this.buildAndMaybeSendHierarchyBriefs({
            ...options,
            dry_run: true,
        });
    }

    async sendHierarchyBriefs(options?: SendHierarchyBriefsDto) {
        return this.buildAndMaybeSendHierarchyBriefs({
            ...options,
            dry_run: false,
        });
    }

    async sendHierarchyWhatsAppBriefs(options?: Partial<SendHierarchyBriefsDto>) {
        return this.buildAndMaybeSendHierarchyBriefs({
            ...options,
            channels: [HierarchyBriefChannel.WHATSAPP],
            dry_run: Boolean(options?.dry_run),
        });
    }

    private async buildAndMaybeSendHierarchyBriefs(options: Partial<SendHierarchyBriefsDto>) {
        const cycleId = normalizeImportValue(options.cycleId);
        const includeHeads = options.include_heads !== false;
        const includeSeniors = options.include_seniors !== false;
        const dryRun = Boolean(options.dry_run);

        if (!includeHeads && !includeSeniors) {
            throw new BadRequestException('At least one target type (heads or seniors) must be enabled.');
        }

        const requestedChannels = (options.channels?.length
            ? options.channels
            : [HierarchyBriefChannel.WHATSAPP, HierarchyBriefChannel.EMAIL]
        ).filter((channel) => channel === HierarchyBriefChannel.WHATSAPP || channel === HierarchyBriefChannel.EMAIL);

        const channels = Array.from(new Set(requestedChannels));
        if (!channels.length) {
            throw new BadRequestException('At least one delivery channel is required.');
        }

        const where: Prisma.RecipientWhereInput = {};
        if (cycleId) {
            where.cycleId = cycleId;
        }
        if (options.sheet) {
            where.sheet = options.sheet;
        }

        const recipients = await this.prisma.recipient.findMany({
            where,
            orderBy: [
                { created_at: 'asc' },
                { id: 'asc' },
            ],
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                role: true,
                building: true,
                test_center: true,
                division: true,
                room_est1: true,
                created_at: true,
            },
        });

        const normalizedRows: HierarchyRecipientWithOrder[] = recipients.map((recipient, index) => ({
            ...recipient,
            row_order: index + 1,
            normalized_role: this.resolveHierarchyRole(recipient.role),
            normalized_building: this.resolveHierarchyBuilding(recipient),
        }));

        const headsOrdered: HierarchyHeadNode[] = [];
        const seniorsOrdered: HierarchySeniorNode[] = [];
        const headById = new Map<string, HierarchyHeadNode>();
        const seniorById = new Map<string, HierarchySeniorNode>();
        let currentHeadId: string | null = null;
        let currentSeniorId: string | null = null;

        for (const row of normalizedRows) {
            if (row.normalized_role === 'HEAD') {
                const node: HierarchyHeadNode = { target: row, seniors: [] };
                headsOrdered.push(node);
                headById.set(row.id, node);
                currentHeadId = row.id;
                currentSeniorId = null;
                continue;
            }

            if (row.normalized_role === 'SENIOR') {
                const headId = currentHeadId;
                const node: HierarchySeniorNode = {
                    target: row,
                    floor: this.resolveHierarchyFloor(row),
                    head_id: headId,
                    members: [],
                };

                seniorsOrdered.push(node);
                seniorById.set(row.id, node);
                currentSeniorId = row.id;

                if (headId && headById.has(headId)) {
                    headById.get(headId)!.seniors.push(node);
                }
                continue;
            }

            if (!currentSeniorId || !seniorById.has(currentSeniorId)) {
                continue;
            }

            seniorById.get(currentSeniorId)!.members.push(row);
        }

        const selectedHeadIds = options.head_ids?.length ? new Set(options.head_ids) : null;
        const selectedSeniorIds = options.senior_ids?.length ? new Set(options.senior_ids) : null;

        const selectedHeadNodes = includeHeads
            ? headsOrdered.filter((node) => !selectedHeadIds || selectedHeadIds.has(node.target.id))
            : [];
        const selectedSeniorNodes = includeSeniors
            ? seniorsOrdered.filter((node) => !selectedSeniorIds || selectedSeniorIds.has(node.target.id))
            : [];

        const headTargets = selectedHeadNodes.map((node) => this.buildHeadTargetPreview(node));
        const seniorTargets = selectedSeniorNodes.map((node) => this.buildSeniorTargetPreview(node));
        const orderedTargets = [...headTargets, ...seniorTargets].sort((a, b) => a.row_order - b.row_order);

        const buildingsCount = new Set([
            ...headsOrdered.map((node) => node.target.normalized_building),
            ...seniorsOrdered.map((node) => node.target.normalized_building),
        ]).size;
        const floorsCount = new Set(seniorsOrdered.map((node) => node.floor)).size;

        const summary = {
            buildings: buildingsCount,
            floors: floorsCount,
            heads: {
                targeted: headTargets.length,
                sent: 0,
                failed: 0,
                skipped: 0,
            },
            seniors: {
                targeted: seniorTargets.length,
                sent: 0,
                failed: 0,
                skipped: 0,
            },
            channels: {
                whatsapp: {
                    requested: channels.includes(HierarchyBriefChannel.WHATSAPP),
                    ready: orderedTargets.filter((target) => Boolean(target.phone)).length,
                    missing: orderedTargets.filter((target) => !target.phone).length,
                    sent: 0,
                    failed: 0,
                    skipped: 0,
                },
                email: {
                    requested: channels.includes(HierarchyBriefChannel.EMAIL),
                    ready: orderedTargets.filter((target) => Boolean(target.email)).length,
                    missing: orderedTargets.filter((target) => !target.email).length,
                    sent: 0,
                    failed: 0,
                    skipped: 0,
                },
            },
        };

        const responseBase = {
            dry_run: dryRun,
            cycle_id: cycleId || null,
            sheet: options.sheet || null,
            channels,
            filters: {
                include_heads: includeHeads,
                include_seniors: includeSeniors,
                selected_head_ids: Array.from(selectedHeadIds ?? []),
                selected_senior_ids: Array.from(selectedSeniorIds ?? []),
            },
            summary,
            available_targets: {
                heads: headsOrdered.map((node) => ({
                    recipient_id: node.target.id,
                    recipient_name: normalizeImportValue(node.target.name) || 'Unknown',
                    row_order: node.target.row_order,
                    building: node.target.normalized_building,
                    phone: normalizeImportValue(node.target.phone),
                    email: normalizeImportValue(node.target.email),
                    seniors_count: node.seniors.length,
                })),
                seniors: seniorsOrdered.map((node) => ({
                    recipient_id: node.target.id,
                    recipient_name: normalizeImportValue(node.target.name) || 'Unknown',
                    row_order: node.target.row_order,
                    building: node.target.normalized_building,
                    floor: node.floor,
                    phone: normalizeImportValue(node.target.phone),
                    email: normalizeImportValue(node.target.email),
                    members_count: node.members.length,
                    head_id: node.head_id,
                })),
            },
            preview: {
                heads: headTargets,
                seniors: seniorTargets,
                ordered: orderedTargets,
            },
        };

        if (dryRun) {
            return responseBase;
        }

        const delivery: Array<{
            recipient_id: string;
            recipient_name: string;
            role: HierarchyTargetRole;
            row_order: number;
            channels: Array<{
                channel: HierarchyBriefChannel;
                status: ChannelDeliveryState;
                reason?: string;
            }>;
        }> = [];

        for (const target of orderedTargets) {
            const roleSummary = target.role === 'HEAD' ? summary.heads : summary.seniors;
            let hasSent = false;
            let hasFailure = false;

            const channelResults: Array<{
                channel: HierarchyBriefChannel;
                status: ChannelDeliveryState;
                reason?: string;
            }> = [];

            for (const channel of channels) {
                if (channel === HierarchyBriefChannel.WHATSAPP) {
                    if (!target.phone) {
                        summary.channels.whatsapp.skipped += 1;
                        channelResults.push({
                            channel,
                            status: 'SKIPPED',
                            reason: 'Missing WhatsApp phone number',
                        });
                        continue;
                    }

                    const result = await this.whatsAppService.sendWhatsApp(target.phone, target.whatsapp_message);
                    if (result.ok) {
                        hasSent = true;
                        summary.channels.whatsapp.sent += 1;
                        channelResults.push({ channel, status: 'SENT' });
                    } else {
                        hasFailure = true;
                        summary.channels.whatsapp.failed += 1;
                        channelResults.push({
                            channel,
                            status: 'FAILED',
                            reason: result.error || 'Unknown WhatsApp error',
                        });
                    }
                    continue;
                }

                if (!target.email) {
                    summary.channels.email.skipped += 1;
                    channelResults.push({
                        channel,
                        status: 'SKIPPED',
                        reason: 'Missing email address',
                    });
                    continue;
                }

                const result = await this.emailService.sendEmail({
                    to: target.email,
                    subject: target.email_subject,
                    html: target.email_body_html,
                });

                if (result.ok) {
                    hasSent = true;
                    summary.channels.email.sent += 1;
                    channelResults.push({ channel, status: 'SENT' });
                } else {
                    hasFailure = true;
                    summary.channels.email.failed += 1;
                    channelResults.push({
                        channel,
                        status: 'FAILED',
                        reason: result.error || 'Unknown email error',
                    });
                }
            }

            if (hasSent) {
                roleSummary.sent += 1;
            } else if (hasFailure) {
                roleSummary.failed += 1;
            } else {
                roleSummary.skipped += 1;
            }

            delivery.push({
                recipient_id: target.recipient_id,
                recipient_name: target.recipient_name,
                role: target.role,
                row_order: target.row_order,
                channels: channelResults,
            });
        }

        return {
            ...responseBase,
            delivery,
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

    private buildResponsePath(token: string, action?: 'confirm' | 'decline') {
        const encodedToken = encodeURIComponent(token);
        return action ? `/r/${encodedToken}/${action}` : `/r/${encodedToken}`;
    }

    private buildResponseUrl(recipient: Record<string, any>, action?: 'confirm' | 'decline') {
        const token = recipient.confirmation_token;
        if (!token) {
            return '';
        }

        return `${this.buildFrontendUrl()}${this.buildResponsePath(String(token), action)}`;
    }

    private resolveAssignmentRoleLabel(role?: string | null) {
        return normalizeImportValue(role) || 'team member';
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
            assignment_role: this.resolveAssignmentRoleLabel(recipient.role),
            brand_logo_url: `${this.buildFrontendUrl()}/brand/est-logo.jpg`,
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

    private resolveHierarchyFloor(recipient: { room_est1?: string | null; division?: string | null }) {
        const room = normalizeImportValue(recipient.room_est1);
        const division = normalizeImportValue(recipient.division);

        if (room && /floor|دور/i.test(room)) {
            return room;
        }

        if (division && /floor|دور/i.test(division)) {
            return division;
        }

        if (room && !/^\d+[a-z0-9-]*$/i.test(room)) {
            return room;
        }

        return division ?? room ?? 'General';
    }

    private buildHeadTargetPreview(node: HierarchyHeadNode): HierarchyTargetPreview {
        const headName = normalizeImportValue(node.target.name) || 'Unknown Head';
        const seniors = node.seniors
            .slice()
            .sort((a, b) => a.target.row_order - b.target.row_order)
            .map((senior) => ({
                recipient_id: senior.target.id,
                recipient_name: normalizeImportValue(senior.target.name) || 'Unknown Senior',
                row_order: senior.target.row_order,
                floor: senior.floor,
                phone: normalizeImportValue(senior.target.phone),
                email: normalizeImportValue(senior.target.email),
                invigilators_count: senior.members.length,
            }));

        const whatsappMessage = this.buildHeadBriefMessage(node);
        const emailSubject = `EST Head Brief | ${node.target.normalized_building} | ${headName}`;
        const emailBodyHtml = this.buildHeadBriefEmailHtml(node, seniors);

        return {
            role: 'HEAD',
            recipient_id: node.target.id,
            recipient_name: headName,
            row_order: node.target.row_order,
            building: node.target.normalized_building,
            floor: null,
            phone: normalizeImportValue(node.target.phone),
            email: normalizeImportValue(node.target.email),
            whatsapp_message: whatsappMessage,
            email_subject: emailSubject,
            email_body_html: emailBodyHtml,
            seniors,
            members: [],
        };
    }

    private buildSeniorTargetPreview(node: HierarchySeniorNode): HierarchyTargetPreview {
        const seniorName = normalizeImportValue(node.target.name) || 'Unknown Senior';
        const members = node.members
            .slice()
            .sort((a, b) => a.row_order - b.row_order)
            .map((member) => ({
                recipient_id: member.id,
                recipient_name: normalizeImportValue(member.name) || 'Unknown Invigilator',
                row_order: member.row_order,
                role: normalizeImportValue(member.role),
                room: normalizeImportValue(member.room_est1),
                phone: normalizeImportValue(member.phone),
                email: normalizeImportValue(member.email),
            }));

        const whatsappMessage = this.buildSeniorBriefMessage(node);
        const emailSubject = `EST Senior Brief | ${node.floor} | ${node.target.normalized_building} | ${seniorName}`;
        const emailBodyHtml = this.buildSeniorBriefEmailHtml(node, members);

        return {
            role: 'SENIOR',
            recipient_id: node.target.id,
            recipient_name: seniorName,
            row_order: node.target.row_order,
            building: node.target.normalized_building,
            floor: node.floor,
            phone: normalizeImportValue(node.target.phone),
            email: normalizeImportValue(node.target.email),
            whatsapp_message: whatsappMessage,
            email_subject: emailSubject,
            email_body_html: emailBodyHtml,
            seniors: [],
            members,
        };
    }

    private buildHeadBriefMessage(node: HierarchyHeadNode) {
        const headName = normalizeImportValue(node.target.name) || 'Unknown Head';
        const lines = [
            '*EST Building Brief*',
            `Head: ${headName}`,
            `Building: ${node.target.normalized_building}`,
            '',
            '*Floors and assigned seniors*',
        ];

        const seniors = node.seniors.slice().sort((a, b) => a.target.row_order - b.target.row_order);
        if (!seniors.length) {
            lines.push('- No senior assignments available yet.');
        } else {
            for (const senior of seniors) {
                const seniorName = normalizeImportValue(senior.target.name) ?? 'Unnamed Senior';
                const seniorPhone = normalizeImportValue(senior.target.phone) ?? 'No phone';
                const seniorEmail = normalizeImportValue(senior.target.email) ?? 'No email';
                lines.push(`- [Row ${senior.target.row_order}] ${senior.floor}: ${seniorName} | ${seniorPhone} | ${seniorEmail}`);
            }
        }

        lines.push(
            '',
            '*Coordination*',
            'Please create WhatsApp groups with each assigned senior and share the final invigilator distribution.',
            '',
            'Best regards,',
            'EST Team',
        );
        return lines.join('\n');
    }

    private buildSeniorBriefMessage(node: HierarchySeniorNode) {
        const seniorName = normalizeImportValue(node.target.name) || 'Unknown Senior';
        const lines = [
            '*EST Senior Brief*',
            `Senior: ${seniorName}`,
            `Building: ${node.target.normalized_building}`,
            `Floor: ${node.floor}`,
            '',
            '*Invigilators in this floor*',
        ];

        const invigilators = node.members.slice().sort((a, b) => a.row_order - b.row_order);
        if (!invigilators.length) {
            lines.push('No invigilators assigned to this floor yet.');
        } else {
            invigilators
                .forEach((invigilator, index) => {
                    const name = normalizeImportValue(invigilator.name) ?? 'Unnamed Invigilator';
                    const phone = normalizeImportValue(invigilator.phone) ?? 'No phone';
                    const room = normalizeImportValue(invigilator.room_est1) ?? 'No room';
                    const role = normalizeImportValue(invigilator.role) ?? 'Invigilator';
                    lines.push(`${index + 1}. [Row ${invigilator.row_order}] ${name} | ${role} | ${phone} | Room ${room}`);
                });
        }

        lines.push(
            '',
            '*Coordination*',
            'Please create room-wise WhatsApp groups with the invigilators listed above and confirm room coverage.',
            '',
            'Best regards,',
            'EST Team',
        );
        return lines.join('\n');
    }

    private buildHeadBriefEmailHtml(
        node: HierarchyHeadNode,
        seniors: Array<{
            recipient_name: string;
            row_order: number;
            floor: string;
            phone: string | null;
            email: string | null;
            invigilators_count: number;
        }>,
    ) {
        const rows = seniors.length
            ? seniors.map((senior) => `
                <tr>
                    <td style="padding:8px;border:1px solid #dbe2ea;">${senior.row_order}</td>
                    <td style="padding:8px;border:1px solid #dbe2ea;">${this.escapeHtml(senior.floor)}</td>
                    <td style="padding:8px;border:1px solid #dbe2ea;">${this.escapeHtml(senior.recipient_name)}</td>
                    <td style="padding:8px;border:1px solid #dbe2ea;">${this.escapeHtml(senior.phone || '-')}</td>
                    <td style="padding:8px;border:1px solid #dbe2ea;">${this.escapeHtml(senior.email || '-')}</td>
                    <td style="padding:8px;border:1px solid #dbe2ea;">${senior.invigilators_count}</td>
                </tr>
            `).join('')
            : `
                <tr>
                    <td colspan="6" style="padding:10px;border:1px solid #dbe2ea;">No seniors assigned yet.</td>
                </tr>
            `;

        return `
            <div style="font-family:Segoe UI,Arial,sans-serif;color:#0f172a;">
                <h2 style="margin:0 0 8px;">EST Head Brief</h2>
                <p style="margin:0 0 4px;"><strong>Head:</strong> ${this.escapeHtml(normalizeImportValue(node.target.name) || 'Unknown Head')}</p>
                <p style="margin:0 0 16px;"><strong>Building:</strong> ${this.escapeHtml(node.target.normalized_building)}</p>
                <table style="width:100%;border-collapse:collapse;font-size:13px;">
                    <thead>
                        <tr style="background:#f8fafc;">
                            <th style="padding:8px;border:1px solid #dbe2ea;">Row</th>
                            <th style="padding:8px;border:1px solid #dbe2ea;">Floor</th>
                            <th style="padding:8px;border:1px solid #dbe2ea;">Senior</th>
                            <th style="padding:8px;border:1px solid #dbe2ea;">Phone</th>
                            <th style="padding:8px;border:1px solid #dbe2ea;">Email</th>
                            <th style="padding:8px;border:1px solid #dbe2ea;">Invigilators</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
                <p style="margin:16px 0 0;">Please create WhatsApp groups with each assigned senior and share final invigilator distribution.</p>
                <p style="margin:14px 0 0;">Best regards,<br /><strong>EST Team</strong></p>
            </div>
        `.trim();
    }

    private buildSeniorBriefEmailHtml(
        node: HierarchySeniorNode,
        members: Array<{
            recipient_name: string;
            row_order: number;
            role: string | null;
            room: string | null;
            phone: string | null;
            email: string | null;
        }>,
    ) {
        const rows = members.length
            ? members.map((member) => `
                <tr>
                    <td style="padding:8px;border:1px solid #dbe2ea;">${member.row_order}</td>
                    <td style="padding:8px;border:1px solid #dbe2ea;">${this.escapeHtml(member.room || '-')}</td>
                    <td style="padding:8px;border:1px solid #dbe2ea;">${this.escapeHtml(member.recipient_name)}</td>
                    <td style="padding:8px;border:1px solid #dbe2ea;">${this.escapeHtml(member.role || 'Invigilator')}</td>
                    <td style="padding:8px;border:1px solid #dbe2ea;">${this.escapeHtml(member.phone || '-')}</td>
                    <td style="padding:8px;border:1px solid #dbe2ea;">${this.escapeHtml(member.email || '-')}</td>
                </tr>
            `).join('')
            : `
                <tr>
                    <td colspan="6" style="padding:10px;border:1px solid #dbe2ea;">No invigilators assigned yet.</td>
                </tr>
            `;

        return `
            <div style="font-family:Segoe UI,Arial,sans-serif;color:#0f172a;">
                <h2 style="margin:0 0 8px;">EST Senior Brief</h2>
                <p style="margin:0 0 4px;"><strong>Senior:</strong> ${this.escapeHtml(normalizeImportValue(node.target.name) || 'Unknown Senior')}</p>
                <p style="margin:0 0 4px;"><strong>Building:</strong> ${this.escapeHtml(node.target.normalized_building)}</p>
                <p style="margin:0 0 16px;"><strong>Floor:</strong> ${this.escapeHtml(node.floor)}</p>
                <table style="width:100%;border-collapse:collapse;font-size:13px;">
                    <thead>
                        <tr style="background:#f8fafc;">
                            <th style="padding:8px;border:1px solid #dbe2ea;">Row</th>
                            <th style="padding:8px;border:1px solid #dbe2ea;">Room</th>
                            <th style="padding:8px;border:1px solid #dbe2ea;">Name</th>
                            <th style="padding:8px;border:1px solid #dbe2ea;">Role</th>
                            <th style="padding:8px;border:1px solid #dbe2ea;">Phone</th>
                            <th style="padding:8px;border:1px solid #dbe2ea;">Email</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
                <p style="margin:16px 0 0;">Please create room-wise WhatsApp groups and confirm full invigilator coverage.</p>
                <p style="margin:14px 0 0;">Best regards,<br /><strong>EST Team</strong></p>
            </div>
        `.trim();
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
