import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const DEFAULT_SETTINGS = {
    activeMode: 'NORMAL',
    weekdayStart: '09:00',
    weekdayEnd: '17:00',
    saturdayStart: '09:00',
    saturdayEnd: '13:30',
    ramadanStart: '09:00',
    ramadanEnd: '14:30',
    ramadanStartDate: null,
    ramadanEndDate: null,
};

@Injectable()
export class WorkScheduleService {
    constructor(private prisma: PrismaService) { }

    private async ensureDefaults() {
        const existing = await this.prisma.workScheduleSettings.findFirst();
        if (existing) return existing;
        return this.prisma.workScheduleSettings.create({ data: DEFAULT_SETTINGS });
    }

    async getSettings() {
        return this.ensureDefaults();
    }

    async updateSettings(data: Partial<typeof DEFAULT_SETTINGS>) {
        const existing = await this.prisma.workScheduleSettings.findFirst();
        if (!existing) {
            return this.prisma.workScheduleSettings.create({ data: { ...DEFAULT_SETTINGS, ...data } });
        }
        return this.prisma.workScheduleSettings.update({
            where: { id: existing.id },
            data,
        });
    }
}
