import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBranchDto } from './dto/branches.dto';

@Injectable()
export class BranchesService {
    constructor(private prisma: PrismaService) { }

    async create(data: CreateBranchDto) {
        const name = (data.name || '').trim();
        if (!name) throw new BadRequestException('Branch name is required');

        const existing = await this.prisma.branch.findFirst({
            where: { name: { equals: name, mode: 'insensitive' } },
        });
        if (existing) throw new BadRequestException('Branch name already exists');

        return this.prisma.branch.create({
            data: {
                name,
                nameAr: data.nameAr?.trim() || null,
            },
        });
    }

    async findAll() {
        return this.prisma.branch.findMany({
            orderBy: { id: 'asc' },
        });
    }
}
