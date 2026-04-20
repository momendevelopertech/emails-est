jest.mock('nodemailer', () => ({
    createTransport: jest.fn(),
}));

import * as nodemailer from 'nodemailer';
import { EmailService } from './email.service';

describe('EmailService', () => {
    const originalEnv = { ...process.env };
    const sendMail = jest.fn();
    const prisma = {
        emailSettings: {
            findUnique: jest.fn(),
        },
    };

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = {
            ...originalEnv,
            MAIL_HOST: 'smtp.example.com',
            MAIL_PORT: '587',
            MAIL_USER: 'mailer@example.com',
            MAIL_PASS: 'secret',
            MAIL_FROM: '',
            SENDER_EMAIL: 'sender@example.com',
            SENDER_NAME: 'SPHINX HR',
            MAIL_SECURE: 'false',
            MAIL_REQUIRE_TLS: 'true',
        };
        prisma.emailSettings.findUnique.mockResolvedValue(null);
        (nodemailer.createTransport as jest.Mock).mockReturnValue({ sendMail });
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    it('retries SMTP delivery up to three attempts and succeeds on the last one', async () => {
        sendMail
            .mockRejectedValueOnce(new Error('temporary failure'))
            .mockRejectedValueOnce(new Error('temporary failure again'))
            .mockResolvedValueOnce({ messageId: 'msg-3', response: '250 queued' });

        const service = new EmailService(prisma as any);
        (service as any).waitBeforeRetry = jest.fn().mockResolvedValue(undefined);

        const result = await service.sendEmail({
            to: 'employee@example.com',
            subject: 'Welcome',
            html: '<p>Hello</p>',
        });

        expect(result).toEqual({
            ok: true,
            recipient: 'employee@example.com',
            attempts: 3,
            messageId: 'msg-3',
            response: '250 queued',
        });
        expect(sendMail).toHaveBeenCalledTimes(3);
    });

    it('builds the sender header from SENDER_NAME and SENDER_EMAIL when MAIL_FROM is empty', async () => {
        sendMail.mockResolvedValue({ messageId: 'msg-1', response: '250 queued' });

        const service = new EmailService(prisma as any);

        await service.sendEmail({
            to: 'employee@example.com',
            subject: 'Hello',
            html: '<p>Body</p>',
        });

        expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
            from: 'SPHINX HR <sender@example.com>',
            to: 'employee@example.com',
            subject: 'Hello',
        }));
    });

    it('prefers the active database sender account and caches it for subsequent sends', async () => {
        prisma.emailSettings.findUnique.mockResolvedValue({
            sender_name: 'EST',
            sender_email: 'sender@example.com',
            active_sender_account: {
                id: 'acct-1',
                updated_at: new Date('2026-04-20T08:00:00.000Z'),
                sender_name: 'EST',
                sender_email: 'sender@example.com',
                mail_from: 'EST <sender@example.com>',
                smtp_host: 'smtp.db.example.com',
                smtp_port: 465,
                smtp_secure: true,
                smtp_require_tls: true,
                smtp_username: 'db-mailer@example.com',
                smtp_password: 'db-secret',
            },
        });
        sendMail.mockResolvedValue({ messageId: 'msg-1', response: '250 queued' });

        const service = new EmailService(prisma as any);

        await service.sendEmail({
            to: 'employee@example.com',
            subject: 'Hello',
            html: '<p>Body</p>',
        });

        await service.sendEmail({
            to: 'employee2@example.com',
            subject: 'Hello again',
            html: '<p>Body</p>',
        });

        expect(prisma.emailSettings.findUnique).toHaveBeenCalledTimes(1);
        expect(nodemailer.createTransport).toHaveBeenCalledWith(expect.objectContaining({
            host: 'smtp.db.example.com',
            port: 465,
            secure: true,
            auth: {
                user: 'db-mailer@example.com',
                pass: 'db-secret',
            },
        }));
        expect(sendMail).toHaveBeenNthCalledWith(1, expect.objectContaining({
            from: 'EST <sender@example.com>',
        }));
        expect(sendMail).toHaveBeenNthCalledWith(2, expect.objectContaining({
            from: 'EST <sender@example.com>',
        }));
    });
});
