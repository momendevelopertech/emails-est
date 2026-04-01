import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DEFAULT_WHAPI_SETTINGS } from './whapi-defaults';

@Injectable()
export class SettingsBootstrapService implements OnApplicationBootstrap {
    private readonly logger = new Logger(SettingsBootstrapService.name);

    constructor(private readonly prisma: PrismaService) { }

    async onApplicationBootstrap() {
        try {
            const existing = await this.prisma.workScheduleSettings.findFirst({
                select: {
                    id: true,
                    whapiBaseUrl: true,
                    whapiToken: true,
                },
            });

            if (!existing) {
                await this.prisma.workScheduleSettings.create({
                    data: DEFAULT_WHAPI_SETTINGS,
                });
                this.logger.log('Created work schedule settings with default Whapi config.');
                return;
            }

            const hasExpectedBaseUrl = existing.whapiBaseUrl?.trim() === DEFAULT_WHAPI_SETTINGS.whapiBaseUrl;
            const hasExpectedToken = existing.whapiToken?.trim() === DEFAULT_WHAPI_SETTINGS.whapiToken;

            if (hasExpectedBaseUrl && hasExpectedToken) {
                return;
            }

            await this.prisma.workScheduleSettings.update({
                where: { id: existing.id },
                data: DEFAULT_WHAPI_SETTINGS,
            });
            this.logger.log('Synchronized Whapi config into work schedule settings.');
        } catch (error: any) {
            if (error?.code === 'P2022') {
                this.logger.warn('Skipping Whapi bootstrap because the required settings columns are not available yet.');
                return;
            }

            throw error;
        }
    }
}
