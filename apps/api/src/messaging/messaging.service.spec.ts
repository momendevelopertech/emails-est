import { MessagingService } from './messaging.service';
import { RecipientStatus, RecipientSheet, TemplateType } from '@prisma/client';
import { EXAM_ASSIGNMENT_TEMPLATE_PRESETS } from './exam-assignment-template-presets';

describe('MessagingService', () => {
    const prisma: any = {
        recipient: {
            create: jest.fn(),
            createMany: jest.fn(),
            delete: jest.fn(),
            findUnique: jest.fn(),
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

    it('importRecipients keeps partial rows and skips only duplicates inside the same upload', async () => {
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
        prisma.recipient.createMany.mockResolvedValue({ count: 3 });

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
            expect.objectContaining({ cycleId: createdCycleId, name: '', email: 'b@x.com', room_est1: '102', sheet: RecipientSheet.EST2 }),
            expect.objectContaining({ cycleId: createdCycleId, name: 'C', sheet: RecipientSheet.EST2 }),
        ]));
        expect(res.imported).toBe(3);
        expect(res.skipped).toBe(1);
        expect(res.cycle).toEqual(expect.objectContaining({ id: 'cycle-1' }));
    });

    it('importRecipients preserves spare and blacklist sheet rows', async () => {
        prisma.recipientCycle.create.mockResolvedValue({
            id: 'cycle-2',
            name: 'May Cycle',
            slug: 'may-cycle-20260423110000',
        });
        prisma.recipientCycle.findUniqueOrThrow.mockResolvedValue({
            id: 'cycle-2',
            name: 'May Cycle',
            slug: 'may-cycle-20260423110000',
        });
        prisma.recipient.createMany.mockResolvedValue({ count: 2 });

        await service.importRecipients({
            source_file_name: 'test.xlsx',
            recipients: [
                { name: 'Spare One', email: 'spare@example.com', room_est1: '206', sheet: RecipientSheet.SPARE } as any,
                { name: 'Blocked One', email: 'blocked@example.com', room_est1: '1st floor', sheet: RecipientSheet.BLACKLIST } as any,
            ],
        });

        const createdCycleId = prisma.recipientCycle.create.mock.calls[0][0].data.id;
        expect(prisma.recipient.createMany).toHaveBeenCalledWith({
            data: expect.arrayContaining([
                expect.objectContaining({ cycleId: createdCycleId, name: 'Spare One', sheet: RecipientSheet.SPARE }),
                expect.objectContaining({ cycleId: createdCycleId, name: 'Blocked One', sheet: RecipientSheet.BLACKLIST }),
            ]),
        });
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
        } as any)).rejects.toThrow('Recipient sheet must be EST1, EST2, SPARE, or BLACKLIST.');
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
        } as any)).rejects.toThrow('Recipient sheet must be EST1, EST2, SPARE, or BLACKLIST.');
    });

    it('swapRecipientSheet moves a recipient between operational sheets', async () => {
        prisma.recipient.findUnique.mockResolvedValue({ id: 'r1', sheet: RecipientSheet.EST1 });
        prisma.recipient.update.mockResolvedValue({ id: 'r1', sheet: RecipientSheet.SPARE, name: 'Ali Hassan' });

        await service.swapRecipientSheet('r1', RecipientSheet.SPARE);

        expect(prisma.recipient.update).toHaveBeenCalledWith({
            where: { id: 'r1' },
            data: { sheet: RecipientSheet.SPARE },
            select: { id: true, sheet: true, name: true },
        });
    });

    it('findRecipients keeps latest cycles first while preserving uploaded row order inside each cycle', async () => {
        prisma.recipient.findMany.mockResolvedValue([]);
        prisma.recipient.count.mockResolvedValue(0);

        await service.findRecipients({ page: 1, limit: 50 } as any);

        expect(prisma.recipient.findMany).toHaveBeenCalledWith(expect.objectContaining({
            orderBy: [
                { cycle: { created_at: 'desc' } },
                { created_at: 'asc' },
            ],
            skip: 0,
            take: 50,
        }));
    });

    it('deleteRecipient removes the selected row', async () => {
        prisma.recipient.delete.mockResolvedValue({ id: 'r1' });

        await service.deleteRecipient('r1');

        expect(prisma.recipient.delete).toHaveBeenCalledWith({ where: { id: 'r1' } });
    });

    it('getTemplates syncs the managed EST assignment templates to the latest preset definitions', async () => {
        const [firstPreset] = EXAM_ASSIGNMENT_TEMPLATE_PRESETS;

        prisma.template.findMany
            .mockResolvedValueOnce([
                {
                    id: 'preset-est1',
                    name: firstPreset.name,
                    type: firstPreset.type,
                    subject: 'Old subject',
                    body: '<table><tr><td>outdated</td></tr></table>',
                    include_confirmation_button: false,
                },
            ])
            .mockResolvedValueOnce([
                {
                    id: 'preset-est1',
                    name: firstPreset.name,
                    type: firstPreset.type,
                    subject: 'Old subject',
                    body: '<table><tr><td>outdated</td></tr></table>',
                },
            ]);
        prisma.template.create.mockResolvedValue({});

        const templates = await service.getTemplates();

        expect(prisma.template.update).toHaveBeenCalledWith({
            where: { id: 'preset-est1' },
            data: expect.objectContaining({
                type: firstPreset.type,
                subject: firstPreset.subject,
                body: firstPreset.body,
            }),
        });
        expect(prisma.template.create).toHaveBeenCalledTimes(EXAM_ASSIGNMENT_TEMPLATE_PRESETS.length - 1);
        expect(prisma.template.create).toHaveBeenNthCalledWith(1, {
            data: expect.objectContaining({
                name: EXAM_ASSIGNMENT_TEMPLATE_PRESETS[1].name,
                type: EXAM_ASSIGNMENT_TEMPLATE_PRESETS[1].type,
            }),
        });
        expect(templates).toEqual([
            expect.objectContaining({
                name: firstPreset.name,
                type: firstPreset.type,
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
        const finalUpdateCall = prisma.recipient.update.mock.calls.find(
            (call: any[]) => call?.[0]?.data?.status === RecipientStatus.SENT,
        );
        expect(finalUpdateCall?.[0]?.data?.error_message).toContain('Email: SENT');
        expect(finalUpdateCall?.[0]?.data?.error_message).toContain('WhatsApp: SENT');
        expect(prisma.log.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                recipientId: 'r1',
                status: RecipientStatus.SENT,
                error: null,
            }),
        });
        expect(res.processed).toBe(1);
        expect(res.failed).toBe(0);
    });

    it('stores channel-level delivery details and failure reasons when one channel fails', async () => {
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
        emailService.sendEmail.mockResolvedValue({ ok: true, attempts: 1 });
        whatsAppService.sendWhatsApp.mockResolvedValue({ ok: false, error: 'WhatsApp send failed with status 466' });
        prisma.log.create.mockResolvedValue({});

        const res = await service.sendCampaign({ templateId: 't1', mode: 'all_pending', cycleId: 'cycle-1' } as any);

        const finalUpdateCall = prisma.recipient.update.mock.calls.find(
            (call: any[]) => call?.[0]?.data?.status === RecipientStatus.FAILED,
        );
        expect(finalUpdateCall?.[0]?.data?.error_message).toContain('Email: SENT');
        expect(finalUpdateCall?.[0]?.data?.error_message).toContain('WhatsApp: FAILED - WhatsApp send failed with status 466');
        expect(prisma.log.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                recipientId: 'r1',
                status: RecipientStatus.FAILED,
                error: 'WhatsApp failed: WhatsApp send failed with status 466',
            }),
        });
        expect(res.processed).toBe(0);
        expect(res.failed).toBe(1);
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

    it('renders guided HTML templates into a structured WhatsApp message without system links', async () => {
        prisma.template.findUnique.mockResolvedValue({
            id: 't2',
            name: 'EST I Exam Assignment (With Confirmation)',
            type: TemplateType.BOTH,
            subject: EXAM_ASSIGNMENT_TEMPLATE_PRESETS[1].subject,
            body: EXAM_ASSIGNMENT_TEMPLATE_PRESETS[1].body,
        });
        prisma.recipient.findMany.mockResolvedValue([
            {
                id: 'r2',
                name: 'Momen',
                email: 'momen@example.com',
                phone: '01145495393',
                confirmation_token: 'confirm-token',
                test_center: 'Arab Academy Abu Qir',
                room_est1: '201',
                address: 'Abu Qir, Alexandria',
                map_link: 'https://maps.example.test/abu-qir',
                status: RecipientStatus.PENDING,
            },
        ]);
        prisma.recipient.update.mockResolvedValue({});
        prisma.log.create.mockResolvedValue({});
        emailService.sendEmail.mockResolvedValue({ ok: true });
        whatsAppService.sendWhatsApp.mockResolvedValue({ ok: true });

        await service.sendCampaign({ templateId: 't2', mode: 'all_pending' } as any);

        expect(whatsAppService.sendWhatsApp).toHaveBeenCalledTimes(1);
        expect(whatsAppService.sendWhatsApp.mock.calls[0][0]).toBe('01145495393');
        const whatsAppMessage = whatsAppService.sendWhatsApp.mock.calls[0][1];
        expect(whatsAppMessage).toContain('*Action required*');
        expect(whatsAppMessage).toContain('Open response page:');
        expect(whatsAppMessage).toContain('/r/confirm-token');
        expect(whatsAppMessage).not.toContain('Room:');
        expect(whatsAppMessage).not.toContain('/messaging/confirm?token=confirm-token&action=confirm');
        expect(whatsAppMessage).not.toContain('Google Maps:');
    });

    it('processWhatsAppReply confirms attendance and sends a status reply', async () => {
        prisma.recipient.findMany.mockResolvedValue([{ confirmation_token: 'confirm-token' }]);
        prisma.recipient.findUnique.mockResolvedValue({
            id: 'r2',
            confirmed_at: null,
            declined_at: null,
            name: 'Momen',
            email: 'momen@example.com',
        });
        prisma.recipient.update.mockResolvedValue({});
        whatsAppService.sendWhatsApp.mockResolvedValue({ ok: true });

        const response = await service.processWhatsAppReply('201145495393', 'confirm');

        expect(response).toEqual(expect.objectContaining({
            matched: true,
            status: 'CONFIRMED',
        }));
        expect(prisma.recipient.update).toHaveBeenCalledWith({
            where: { id: 'r2' },
            data: {
                confirmed_at: expect.any(Date),
                declined_at: null,
            },
        });
        expect(whatsAppService.sendWhatsApp).toHaveBeenCalledWith(
            '01145495393',
            'تم تأكيد الحضور بنجاح.',
        );
    });

    it('processWhatsAppWebhook handles Green API payloads and routes them to confirm/apology flow', async () => {
        prisma.recipient.findMany.mockResolvedValue([{ confirmation_token: 'confirm-token' }]);
        prisma.recipient.findUnique.mockResolvedValue({
            id: 'r2',
            confirmed_at: null,
            declined_at: null,
            name: 'Momen',
            email: 'momen@example.com',
        });
        prisma.recipient.update.mockResolvedValue({});
        whatsAppService.sendWhatsApp.mockResolvedValue({ ok: true });

        const response = await service.processWhatsAppWebhook({
            typeWebhook: 'incomingMessageReceived',
            senderData: {
                chatId: '201145495393@c.us',
            },
            messageData: {
                textMessageData: {
                    textMessage: 'confirm',
                },
            },
        });

        expect(response).toEqual(expect.objectContaining({
            processed: true,
            matched: true,
            status: 'CONFIRMED',
        }));
        expect(whatsAppService.sendWhatsApp).toHaveBeenCalledWith(
            '01145495393',
            'تم تأكيد الحضور بنجاح.',
        );
    });

    it('sendHierarchyWhatsAppBriefs sends summary to heads and assignment details to seniors', async () => {
        prisma.recipient.findMany.mockResolvedValue([
            {
                id: 'head-1',
                name: 'Head A',
                phone: '01111111111',
                role: 'Head',
                building: 'Building A',
                test_center: 'Building A',
                division: '1',
                room_est1: null,
            },
            {
                id: 'senior-1',
                name: 'Senior A',
                phone: '01122222222',
                role: 'Senior',
                building: 'Building A',
                test_center: 'Building A',
                division: '1',
                room_est1: null,
            },
            {
                id: 'inv-1',
                name: 'Invigilator A',
                phone: '01133333333',
                role: 'Invigilator',
                building: 'Building A',
                test_center: 'Building A',
                division: '1',
                room_est1: '201',
            },
        ]);
        whatsAppService.sendWhatsApp.mockResolvedValue({ ok: true });

        const result = await service.sendHierarchyWhatsAppBriefs({
            cycleId: 'cycle-1',
            sheet: RecipientSheet.EST1,
            dry_run: false,
        });

        expect(result.summary.buildings).toBe(1);
        expect(result.summary.heads.sent).toBe(1);
        expect(result.summary.seniors.sent).toBe(1);
        expect(whatsAppService.sendWhatsApp).toHaveBeenCalledTimes(2);
        expect(whatsAppService.sendWhatsApp.mock.calls[0][1]).toContain('*EST Building Brief*');
        expect(whatsAppService.sendWhatsApp.mock.calls[1][1]).toContain('*EST Senior Brief*');
    });
});
