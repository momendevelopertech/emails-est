import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { endOfDay, startOfDay } from 'date-fns';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNoteDto, UpdateNoteDto } from './dto/notes.dto';

@Injectable()
export class NotesService {
    constructor(private prisma: PrismaService) { }

    async create(userId: string, data: CreateNoteDto) {
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

    async update(userId: string, id: string, data: UpdateNoteDto) {
        const note = await this.prisma.note.findUnique({ where: { id } });
        if (!note) throw new NotFoundException('Note not found');
        if (note.userId !== userId) throw new ForbiddenException();

        return this.prisma.note.update({
            where: { id },
            data: {
                ...(data.title !== undefined ? { title: data.title } : {}),
                ...(data.body !== undefined ? { body: data.body } : {}),
                ...(data.date ? { date: new Date(data.date) } : {}),
            },
            include: {
                user: { select: { id: true, fullName: true, fullNameAr: true, employeeNumber: true, department: true } },
            },
        });
    }

    async remove(userId: string, id: string) {
        const note = await this.prisma.note.findUnique({ where: { id } });
        if (!note) throw new NotFoundException('Note not found');
        if (note.userId !== userId) throw new ForbiddenException();

        await this.prisma.note.delete({ where: { id } });
        return { message: 'Deleted' };
    }
}
