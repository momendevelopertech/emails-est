import { Injectable } from '@nestjs/common';
import { endOfDay, startOfDay } from 'date-fns';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotesService {
    constructor(private prisma: PrismaService) { }

    async create(userId: string, data: { date: string; title: string; body?: string }) {
        return this.prisma.note.create({
            data: {
                userId,
                date: new Date(data.date),
                title: data.title || 'Note',
                body: data.body || '',
            },
            include: {
                user: { select: { id: true, fullName: true, fullNameAr: true, employeeNumber: true, department: true } },
            },
        });
    }

    async findAll(userId: string, _role: string, filters?: { from?: string; to?: string }) {
        const where: any = {
            userId,
        };

        if (filters?.from || filters?.to) {
            const fromDate = filters?.from ? startOfDay(new Date(filters.from)) : undefined;
            const toDate = filters?.to ? endOfDay(new Date(filters.to)) : undefined;
            where.date = {
                ...(fromDate ? { gte: fromDate } : {}),
                ...(toDate ? { lte: toDate } : {}),
            };
        }

        return this.prisma.note.findMany({
            where,
            include: {
                user: { select: { id: true, fullName: true, fullNameAr: true, employeeNumber: true, department: true } },
            },
            orderBy: { date: 'desc' },
        });
    }
}
