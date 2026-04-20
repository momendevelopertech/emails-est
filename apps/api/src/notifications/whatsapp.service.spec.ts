jest.mock('axios', () => ({
    __esModule: true,
    default: {
        post: jest.fn(),
    },
}));

import axios from 'axios';
import { WhatsAppService } from './whatsapp.service';

describe('WhatsAppService', () => {
    const prisma = {
        whatsAppSettings: {
            findUnique: jest.fn(),
        },
    };

    beforeEach(() => {
        jest.clearAllMocks();
        prisma.whatsAppSettings.findUnique.mockResolvedValue({
            id: 'default',
            api_url: 'https://7107.api.greenapi.com',
            media_url: 'https://7107.api.greenapi.com',
            id_instance: '7107593651',
            api_token_instance: 'green-token',
        });
    });

    it('retries WhatsApp delivery up to three attempts before succeeding', async () => {
        (axios.post as jest.Mock)
            .mockResolvedValueOnce({ status: 500, data: { message: 'failed-1' } })
            .mockResolvedValueOnce({ status: 500, data: { message: 'failed-2' } })
            .mockResolvedValueOnce({ status: 200, data: { id: 'ok' } });

        const service = new WhatsAppService(prisma as any);
        (service as any).waitBeforeRetry = jest.fn().mockResolvedValue(undefined);

        const result = await service.sendWhatsApp('01012345678', 'hello world');

        expect(result).toEqual({
            ok: true,
            chatId: '201012345678@c.us',
            phone: '201012345678',
            attempts: 3,
            source: 'database',
            status: 200,
            response: { id: 'ok' },
        });
        expect(axios.post).toHaveBeenCalledTimes(3);
        expect(axios.post).toHaveBeenLastCalledWith(
            'https://7107.api.greenapi.com/waInstance7107593651/sendMessage/green-token',
            {
                chatId: '201012345678@c.us',
                message: 'hello world',
            },
            expect.objectContaining({
                headers: { 'Content-Type': 'application/json' },
            }),
        );
    });

    it('returns a validation error for invalid Egyptian mobile numbers without attempting delivery', async () => {
        const service = new WhatsAppService(prisma as any);

        const result = await service.sendWhatsApp('012345', 'hello world');

        expect(result.ok).toBe(false);
        expect(result.attempts).toBe(0);
        expect(result.error).toContain('valid Egyptian mobile number');
        expect(axios.post).not.toHaveBeenCalled();
    });
});
