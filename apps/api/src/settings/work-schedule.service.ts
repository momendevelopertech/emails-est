import { Injectable } from '@nestjs/common';
import { Prisma, WorkScheduleMode } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const DEFAULT_SETTINGS: Prisma.WorkScheduleSettingsCreateInput = {
    activeMode: WorkScheduleMode.NORMAL,
    weekdayStart: '09:00',
    weekdayEnd: '17:00',
    saturdayStart: '09:00',
    saturdayEnd: '13:30',
    ramadanStart: '09:00',
    ramadanEnd: '14:30',
    ramadanStartDate: null,
    ramadanEndDate: null,
};

const normalizeSettingsInput = (
    data: Prisma.WorkScheduleSettingsUpdateInput,
): Prisma.WorkScheduleSettingsUpdateInput => {
    const activeMode = data.activeMode;
    if (typeof activeMode === 'string') {
        if (activeMode === WorkScheduleMode.NORMAL || activeMode === WorkScheduleMode.RAMADAN) {
            return { ...data, activeMode };
        }
        return { ...data, activeMode: WorkScheduleMode.NORMAL };
    }
    return data;
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

    async updateSettings(data: Prisma.WorkScheduleSettingsUpdateInput) {
        const normalized = normalizeSettingsInput(data);
        const existing = await this.prisma.workScheduleSettings.findFirst();
        if (!existing) {
            return this.prisma.workScheduleSettings.create({ data: { ...DEFAULT_SETTINGS, ...normalized } });
        }
        return this.prisma.workScheduleSettings.update({
            where: { id: existing.id },
            data: normalized,
        });
    }
}
