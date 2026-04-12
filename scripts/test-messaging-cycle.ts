import 'dotenv/config';
import { basename } from 'path';
import { readFileSync } from 'fs';
import { PrismaService } from '../apps/api/src/prisma/prisma.service';
import { EmailService } from '../apps/api/src/notifications/email.service';
import { WhatsAppService } from '../apps/api/src/notifications/whatsapp.service';
import { MessagingService } from '../apps/api/src/messaging/messaging.service';
import { parseRecipientWorkbook } from '../apps/web/src/components/messaging/upload-utils';
import { TemplateType } from '@prisma/client';

const workbookPath = process.argv[2] || 'C:/Users/Momen/Downloads/updated_emails_cleaned.xlsx';
const safeEmails = [
    'momenellaban210@gmail.com',
    'momen.developer.tech@gmail.com',
];

async function main() {
    const prisma = new PrismaService();
    await prisma.$connect();

    const emailService = new EmailService(prisma);
    const whatsAppService = new WhatsAppService();
    const messagingService = new MessagingService(prisma, emailService, whatsAppService);

    try {
        const workbookBuffer = readFileSync(workbookPath);
        const workbookFile = new File([workbookBuffer], basename(workbookPath));
        const parsedWorkbook = await parseRecipientWorkbook(workbookFile, false);

        const importResult = await messagingService.importRecipients({
            source_file_name: parsedWorkbook.sourceFileName,
            recipients: parsedWorkbook.recipients,
        });

        if (!importResult.cycle?.id) {
            throw new Error(`Import failed. Skipped rows: ${importResult.skipped}`);
        }

        const cycleId = importResult.cycle.id;
        const sheetBreakdown = await prisma.recipient.groupBy({
            by: ['sheet'],
            where: { cycleId },
            _count: { _all: true },
        });

        const filterOptions = await messagingService.getRecipientFilterOptions(cycleId);

        const template = await prisma.template.upsert({
            where: { name: 'Cycle E2E Email Verification' },
            update: {
                type: TemplateType.EMAIL,
                subject: 'EST cycle verification for {{name}}',
                body: 'Hello {{name}}, this is an automated verification for {{sheet}} in {{building}} / {{room_est1}}.',
            },
            create: {
                name: 'Cycle E2E Email Verification',
                type: TemplateType.EMAIL,
                subject: 'EST cycle verification for {{name}}',
                body: 'Hello {{name}}, this is an automated verification for {{sheet}} in {{building}} / {{room_est1}}.',
            },
        });

        const selectedRecipients = await prisma.recipient.findMany({
            where: {
                cycleId,
                email: { in: safeEmails },
            },
            orderBy: [
                { sheet: 'asc' },
                { created_at: 'asc' },
            ],
            take: 3,
            select: {
                id: true,
                name: true,
                email: true,
                sheet: true,
                status: true,
            },
        });

        const sendResult = selectedRecipients.length
            ? await messagingService.sendCampaign({
                templateId: template.id,
                mode: 'selected',
                cycleId,
                ids: selectedRecipients.map((recipient) => recipient.id),
            } as any)
            : null;

        const refreshedRecipients = selectedRecipients.length
            ? await prisma.recipient.findMany({
                where: { id: { in: selectedRecipients.map((recipient) => recipient.id) } },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    status: true,
                    error_message: true,
                    attempts_count: true,
                    last_attempt_at: true,
                    sheet: true,
                },
                orderBy: { created_at: 'asc' },
            })
            : [];

        const recentLogs = selectedRecipients.length
            ? await prisma.log.findMany({
                where: { recipientId: { in: selectedRecipients.map((recipient) => recipient.id) } },
                orderBy: { created_at: 'desc' },
                take: 10,
                include: {
                    recipient: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            status: true,
                            cycleId: true,
                            sheet: true,
                        },
                    },
                },
            })
            : [];

        const edgeCaseResult = await messagingService.importRecipients({
            cycle_name: 'Cycle validation edge cases',
            source_file_name: 'edge-cases.xlsx',
            recipients: [
                { name: 'Valid User', email: 'valid.user@example.com', room_est1: '500', role: 'Head', sheet: 'EST1' as any },
                { name: 'Valid User', email: 'valid.user@example.com', room_est1: '500', role: 'Head', sheet: 'EST1' as any },
                { name: 'Missing Email', room_est1: '501', role: 'Assistant', sheet: 'EST2' as any },
                { name: 'Bad Email', email: 'bad-email', room_est1: '502', role: 'Assistant', sheet: 'EST2' as any },
                { name: '   ', email: 'blank@example.com', room_est1: '503', role: 'Assistant', sheet: 'EST1' as any },
            ],
        });

        console.log(JSON.stringify({
            importResult: {
                imported: importResult.imported,
                skipped: importResult.skipped,
                cycle: importResult.cycle,
                skipped_rows_preview: importResult.skipped_rows.slice(0, 5),
            },
            sheetBreakdown,
            filterOptions,
            selectedRecipients,
            sendResult,
            refreshedRecipients,
            recentLogs,
            edgeCaseResult,
        }, null, 2));
    } finally {
        await prisma.$disconnect();
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
