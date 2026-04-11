import { MessagingService } from './messaging.service';
import { RecipientStatus, TemplateType } from '@prisma/client';

describe('MessagingService', () => {
  const prisma: any = {
    recipient: {
      create: jest.fn(),
      createMany: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    template: { findUnique: jest.fn() },
    log: { create: jest.fn() },
  };
  const emailService = { sendEmail: jest.fn() };
  const whatsAppService = { sendWhatsApp: jest.fn() };
  const service = new MessagingService(prisma, emailService as any, whatsAppService as any);

  beforeEach(() => jest.clearAllMocks());

  it('importRecipients filters empty names and returns counts', async () => {
    prisma.recipient.createMany.mockResolvedValue({ count: 1 });
    const res = await service.importRecipients([
      { name: 'A', email: 'a@x.com' } as any,
      { name: '   ' } as any,
    ]);
    expect(prisma.recipient.createMany).toHaveBeenCalledTimes(1);
    expect(res).toEqual({ imported: 1, skipped: 1 });
  });

  it('sendCampaign handles BOTH channel success', async () => {
    prisma.template.findUnique.mockResolvedValue({ id: 't1', name: 'tmp', type: TemplateType.BOTH, subject: 'Hi {{name}}', body: 'Body {{name}}' });
    prisma.recipient.findMany.mockResolvedValue([{ id: 'r1', name: 'Ali', email: 'ali@mail.com', phone: '201000', status: RecipientStatus.PENDING }]);
    prisma.recipient.update.mockResolvedValue({});
    emailService.sendEmail.mockResolvedValue({ ok: true });
    whatsAppService.sendWhatsApp.mockResolvedValue({ ok: true });
    prisma.log.create.mockResolvedValue({});

    const res = await service.sendCampaign({ templateId: 't1', mode: 'all_pending' } as any);
    expect(res.processed).toBe(1);
    expect(res.failed).toBe(0);
  });

  it('createRecipient normalizes EST-specific fields', async () => {
    prisma.recipient.create.mockResolvedValue({ id: 'r1' });

    await service.createRecipient({
      name: 'Ali Hassan',
      room_est1: 'EST-12',
      test_center: 'Building A',
      map_link: 'https://maps.example.test/a',
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
        status: RecipientStatus.PENDING,
      }),
    });
  });

  it('updateRecipient keeps normalized alias fields in sync', async () => {
    prisma.recipient.update.mockResolvedValue({ id: 'r1' });

    await service.updateRecipient('r1', {
      name: 'Mona Adel',
      room: 'Room 22',
      building: 'Rawasy',
      location: 'https://maps.example.test/b',
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
      }),
    });
  });

  it('deleteRecipient removes the selected row', async () => {
    prisma.recipient.delete.mockResolvedValue({ id: 'r1' });

    await service.deleteRecipient('r1');

    expect(prisma.recipient.delete).toHaveBeenCalledWith({ where: { id: 'r1' } });
  });

  it('sendCampaign supports selected ids', async () => {
    prisma.template.findUnique.mockResolvedValue({ id: 't1', name: 'tmp', type: TemplateType.EMAIL, subject: 'Hi {{name}}', body: 'Body {{name}}' });
    prisma.recipient.findMany.mockResolvedValue([{ id: 'r-selected', name: 'Mona', email: 'mona@mail.com', status: RecipientStatus.PENDING }]);
    prisma.recipient.update.mockResolvedValue({});
    emailService.sendEmail.mockResolvedValue({ ok: true });
    prisma.log.create.mockResolvedValue({});

    const res = await service.sendCampaign({ templateId: 't1', mode: 'selected', ids: ['r-selected'] } as any);
    expect(prisma.recipient.findMany).toHaveBeenCalledWith({ where: { id: { in: ['r-selected'] } } });
    expect(res.processed).toBe(1);
    expect(res.failed).toBe(0);
  });

  it('retryRecipients retries selected ids', async () => {
    prisma.template.findUnique.mockResolvedValue({ id: 't1', name: 'tmp', type: TemplateType.EMAIL, subject: 'Hi', body: 'Body' });
    prisma.recipient.findMany.mockResolvedValue([{ id: 'r1', name: 'Ali', email: 'ali@mail.com', status: RecipientStatus.FAILED }]);
    prisma.recipient.update.mockResolvedValue({});
    emailService.sendEmail.mockResolvedValue({ ok: true });
    prisma.log.create.mockResolvedValue({});

    const res = await service.retryRecipients({ templateId: 't1', ids: ['r1'] } as any);
    expect(res.total).toBe(1);
    expect(prisma.log.create).toHaveBeenCalled();
  });
});
