import { MessagingService } from './messaging.service';
import { RecipientStatus, RecipientSheet, TemplateType } from '@prisma/client';

describe('MessagingService', () => {
    const prisma: any = {
        recipient: {
            create: jest.fn(),
            createMany: jest.fn(),
            delete: jest.fn(),
            findMany: jest.fn(),
            update: jest.fn(),
            count: jest.fn(),
            groupBy: jest.fn(),
        },
        recipientCycle: {
            create: jest.fn(),
            findMany: jest.fn(),
            findUniqueOrThrow: jest.fn(),
        },
        template: {
            findUnique: jest.fn(),
            findMany: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
        },
        log: { create: jest.fn(), findMany: jest.fn(), count: jest.fn() },
        $transaction: jest.fn(),
    };
    const emailService = { sendEmail: jest.fn() };
    const whatsAppService = { sendWhatsApp: jest.fn() };
    const service = new MessagingService(prisma, emailService as any, whatsAppService as any);

    beforeEach(() => {
        jest.clearAllMocks();
        prisma.$transaction.mockResolvedValue(undefined);
    });

    it('importRecipients creates a new cycle and skips invalid and duplicate rows', async () => {
        prisma.recipientCycle.create.mockResolvedValue({
            id: 'cycle-1',
            name: 'April Cycle',
            slug: 'april-cycle-20260412090000',
        });
        prisma.recipientCycle.findUniqueOrThrow.mockResolvedValue({
            id: 'cycle-1',
            name: 'April Cycle',
            slug: 'april-cycle-20260412090000',
        });
        prisma.recipient.createMany.mockResolvedValue({ count: 2 });

        const res = await service.importRecipients({
            source_file_name: 'updated_emails_cleaned.xlsx',
            recipients: [
                { name: 'A', email: 'a@x.com', room_est1: '101', role: 'Head', sheet: RecipientSheet.EST1 } as any,
                { name: 'A', email: 'a@x.com', room_est1: '101', role: 'Head', sheet: RecipientSheet.EST1 } as any,
                { name: '   ', email: 'b@x.com', room_est1: '102', sheet: RecipientSheet.EST2 } as any,
                { name: 'C', email: 'c@x.com', room_est1: '103', sheet: RecipientSheet.EST2 } as any,
            ],
        });

        expect(prisma.recipientCycle.create).toHaveBeenCalledTimes(1);
        const createdCycleId = prisma.recipientCycle.create.mock.calls[0][0].data.id;
        const createdRecipients = prisma.recipient.createMany.mock.calls[0][0].data;
        expect(createdRecipients).toEqual(expect.arrayContaining([
            expect.objectContaining({ cycleId: createdCycleId, name: 'A', sheet: RecipientSheet.EST1 }),
            expect.objectContaining({ cycleId: createdCycleId, name: 'C', sheet: RecipientSheet.EST2 }),
        ]));
        expect(res.imported).toBe(2);
        expect(res.skipped).toBe(2);
        expect(res.cycle).toEqual(expect.objectContaining({ id: 'cycle-1' }));
    });

    it('createRecipient normalizes EST-specific fields', async () => {
        prisma.recipient.create.mockResolvedValue({ id: 'r1' });

        await service.createRecipient({
            name: 'Ali Hassan',
            room_est1: 'EST-12',
            email: 'ali@example.com',
            test_center: 'Building A',
            map_link: 'https://maps.example.test/a',
            sheet: RecipientSheet.EST1,
        } as any);

        expect(prisma.recipient.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                name: 'Ali Hassan',
                room: 'EST-12',
                room_est1: 'EST-12',
                test_center: 'Building A',
                building: 'Building A',
                location: 'https://maps.example.test/a',
                map_link: 'https://maps.example.test/a',
                sheet: RecipientSheet.EST1,
                status: RecipientStatus.PENDING,
            }),
        });
    });

    it('updateRecipient keeps normalized alias fields in sync', async () => {
        prisma.recipient.update.mockResolvedValue({ id: 'r1' });

        await service.updateRecipient('r1', {
            name: 'Mona Adel',
            room: 'Room 22',
            email: 'mona@example.com',
            building: 'Rawasy',
            location: 'https://maps.example.test/b',
            sheet: RecipientSheet.EST2,
        } as any);

        expect(prisma.recipient.update).toHaveBeenCalledWith({
            where: { id: 'r1' },
            data: expect.objectContaining({
                name: 'Mona Adel',
                room: 'Room 22',
                room_est1: 'Room 22',
                test_center: 'Rawasy',
                building: 'Rawasy',
                location: 'https://maps.example.test/b',
                map_link: 'https://maps.example.test/b',
                sheet: RecipientSheet.EST2,
            }),
        });
    });

    it('createRecipient rejects missing required Excel fields', async () => {
        await expect(service.createRecipient({
            name: 'Ali Hassan',
            email: '',
            room_est1: '',
            sheet: RecipientSheet.EST1,
        } as any)).rejects.toThrow('Recipient ROOM is required.');

        await expect(service.createRecipient({
            name: 'Ali Hassan',
            room_est1: 'EST-12',
            sheet: RecipientSheet.EST1,
        } as any)).rejects.toThrow('Recipient email is required.');

        await expect(service.createRecipient({
            name: 'Ali Hassan',
            room_est1: 'EST-12',
            email: 'ali@example.com',
            sheet: RecipientSheet.LEGACY,
        } as any)).rejects.toThrow('Recipient sheet must be EST1 or EST2.');
    });

    it('updateRecipient rejects invalid or missing required fields', async () => {
        await expect(service.updateRecipient('r1', {
            name: 'Mona Adel',
            room_est1: 'EST-15',
            email: 'invalid-email',
            sheet: RecipientSheet.EST1,
        } as any)).rejects.toThrow('Recipient email is invalid.');

        await expect(service.updateRecipient('r1', {
            name: 'Mona Adel',
            room_est1: 'EST-15',
            email: 'mona@example.com',
            sheet: RecipientSheet.LEGACY,
        } as any)).rejects.toThrow('Recipient sheet must be EST1 or EST2.');
    });

    it('deleteRecipient removes the selected row', async () => {
        prisma.recipient.delete.mockResolvedValue({ id: 'r1' });

        await service.deleteRecipient('r1');

        expect(prisma.recipient.delete).toHaveBeenCalledWith({ where: { id: 'r1' } });
    });

    it('getTemplates auto-upgrades legacy EST assignment templates to rich HTML', async () => {
        prisma.template.findMany
            .mockResolvedValueOnce([
                {
                    id: 'legacy-est1',
                    name: 'EST I Exam Assignment',
                    type: TemplateType.EMAIL,
                    subject: 'EST I assignment',
                    body: 'Hello {{name}}, room {{room_est1}}',
                },
            ])
            .mockResolvedValueOnce([
                {
                    id: 'legacy-est1',
                    name: 'EST I Exam Assignment',
                    type: TemplateType.EMAIL,
                    subject: 'EST I Exam Assignment | {{name}}',
                    body: '<table><tr><td>upgraded</td></tr></table>',
                },
            ]);
        prisma.template.update.mockResolvedValue({});
        prisma.template.create.mockResolvedValue({});

        const templates = await service.getTemplates();

        expect(prisma.template.update).toHaveBeenCalledWith({
            where: { id: 'legacy-est1' },
            data: expect.objectContaining({
                subject: 'EST I Exam Assignment | {{name}}',
                body: expect.stringContaining('EST_ASSIGNMENT_TEMPLATE_V1:EST I'),
            }),
        });
        expect(prisma.template.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                name: 'EST II Exam Assignment',
                subject: 'EST II Exam Assignment | {{name}}',
                body: expect.stringContaining('EST_ASSIGNMENT_TEMPLATE_V1:EST II'),
            }),
        });
        expect(templates).toEqual([
            expect.objectContaining({
                name: 'EST I Exam Assignment',
            }),
        ]);
    });

    it('sendCampaign handles BOTH channel success inside a specific cycle', async () => {
        prisma.template.findUnique.mockResolvedValue({
            id: 't1',
            name: 'tmp',
            type: TemplateType.BOTH,
            subject: 'Hi {{name}}',
            body: 'Body {{name}}',
        });
        prisma.recipient.findMany.mockResolvedValue([
            {
                id: 'r1',
                name: 'Ali',
                email: 'ali@mail.com',
                phone: '201000',
                status: RecipientStatus.PENDING,
                cycleId: 'cycle-1',
            },
        ]);
        prisma.recipient.update.mockResolvedValue({});
        emailService.sendEmail.mockResolvedValue({ ok: true });
        whatsAppService.sendWhatsApp.mockResolvedValue({ ok: true });
        prisma.log.create.mockResolvedValue({});

        const res = await service.sendCampaign({ templateId: 't1', mode: 'all_pending', cycleId: 'cycle-1' } as any);
        expect(prisma.recipient.findMany).toHaveBeenCalledWith({
            where: {
                cycleId: 'cycle-1',
                status: RecipientStatus.PENDING,
            },
        });
        expect(res.processed).toBe(1);
        expect(res.failed).toBe(0);
    });

    it('retryRecipients retries only failed recipients in the selected cycle', async () => {
        prisma.template.findUnique.mockResolvedValue({
            id: 't1',
            name: 'tmp',
            type: TemplateType.EMAIL,
            subject: 'Hi',
            body: 'Body',
        });
        prisma.recipient.findMany.mockResolvedValue([
            { id: 'r1', name: 'Ali', email: 'ali@mail.com', status: RecipientStatus.FAILED, cycleId: 'cycle-2' },
        ]);
        prisma.recipient.update.mockResolvedValue({});
        emailService.sendEmail.mockResolvedValue({ ok: true });
        prisma.log.create.mockResolvedValue({});

        const res = await service.retryRecipients({ templateId: 't1', cycleId: 'cycle-2' } as any);
        expect(prisma.recipient.findMany).toHaveBeenCalledWith({
            where: {
                status: RecipientStatus.FAILED,
                cycleId: 'cycle-2',
            },
        });
        expect(res.total).toBe(1);
        expect(prisma.log.create).toHaveBeenCalled();
    });
});
