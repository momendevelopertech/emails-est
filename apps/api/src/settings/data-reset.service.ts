import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DataResetService {
    constructor(private prisma: PrismaService) { }

    async resetAllEmployeeData() {
        const year = new Date().getFullYear();
        const users = await this.prisma.user.findMany({ select: { id: true } });

        await this.prisma.$transaction([
            this.prisma.formSubmission.deleteMany({}),
            this.prisma.lateness.deleteMany({}),
            this.prisma.permissionRequest.deleteMany({}),
            this.prisma.permissionCycle.deleteMany({}),
            this.prisma.leaveRequest.deleteMany({}),
            this.prisma.leaveBalance.deleteMany({}),
            this.prisma.notification.deleteMany({}),
            this.prisma.refreshToken.deleteMany({}),
            this.prisma.note.deleteMany({}),
            this.prisma.message.deleteMany({}),
            this.prisma.auditLog.deleteMany({}),
        ]);

        if (users.length) {
            const balances = [] as Array<{
                userId: string;
                year: number;
                leaveType: 'ANNUAL' | 'CASUAL' | 'EMERGENCY' | 'MISSION';
                totalDays: number;
                usedDays: number;
                remainingDays: number;
            }>;

            for (const user of users) {
                balances.push(
                    { userId: user.id, year, leaveType: 'ANNUAL', totalDays: 21, usedDays: 0, remainingDays: 21 },
                    { userId: user.id, year, leaveType: 'CASUAL', totalDays: 7, usedDays: 0, remainingDays: 7 },
                    { userId: user.id, year, leaveType: 'EMERGENCY', totalDays: 3, usedDays: 0, remainingDays: 3 },
                    { userId: user.id, year, leaveType: 'MISSION', totalDays: 10, usedDays: 0, remainingDays: 10 },
                );
            }

            await this.prisma.leaveBalance.createMany({ data: balances });
        }

        return { message: 'Reset complete', users: users.length };
    }
}
