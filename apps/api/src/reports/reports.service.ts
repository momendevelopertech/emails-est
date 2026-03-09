import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as ExcelJS from 'exceljs';
import { PdfService } from '../pdf/pdf.service';

@Injectable()
export class ReportsService {
    constructor(private prisma: PrismaService, private pdfService: PdfService) { }

    private toPaging(query: any, defaultLimit = 20) {
        const page = Math.max(1, parseInt(query?.page || '1', 10));
        const limit = Math.min(100, Math.max(1, parseInt(query?.limit || String(defaultLimit), 10)));
        return { page, limit, skip: (page - 1) * limit };
    }

    async getLeaveReport(query?: any) {
        const { page, limit, skip } = this.toPaging(query, 10);
        const where: any = {
            ...(query?.userId ? { userId: query.userId } : {}),
            ...(query?.status ? { status: query.status } : {}),
            ...(query?.departmentId ? { user: { departmentId: query.departmentId } } : {}),
            ...(query?.from || query?.to
                ? {
                    createdAt: {
                        ...(query?.from ? { gte: new Date(query.from) } : {}),
                        ...(query?.to ? { lte: new Date(query.to) } : {}),
                    },
                }
                : {}),
        };

        const [items, total] = await Promise.all([
            this.prisma.leaveRequest.findMany({
                where,
                include: {
                    user: { select: { fullName: true, employeeNumber: true, department: { select: { name: true } } } },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.leaveRequest.count({ where }),
        ]);

        return { items, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
    }

    async getPermissionReport(query?: any) {
        const { page, limit, skip } = this.toPaging(query, 10);
        const where: any = {
            ...(query?.status ? { status: query.status } : {}),
            ...(query?.departmentId ? { user: { departmentId: query.departmentId } } : {}),
            ...(query?.permissionType ? { permissionType: query.permissionType } : {}),
            ...(query?.from || query?.to
                ? {
                    createdAt: {
                        ...(query?.from ? { gte: new Date(query.from) } : {}),
                        ...(query?.to ? { lte: new Date(query.to) } : {}),
                    },
                }
                : {}),
        };

        const [items, total] = await Promise.all([
            this.prisma.permissionRequest.findMany({
                where,
                include: {
                    user: { select: { fullName: true, employeeNumber: true, department: { select: { name: true } } } },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.permissionRequest.count({ where }),
        ]);

        return { items, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
    }

    async getFormsReport(query?: any) {
        const { page, limit, skip } = this.toPaging(query, 10);
        const where: any = {
            ...(query?.status ? { status: query.status } : {}),
            ...(query?.from || query?.to
                ? {
                    createdAt: {
                        ...(query?.from ? { gte: new Date(query.from) } : {}),
                        ...(query?.to ? { lte: new Date(query.to) } : {}),
                    },
                }
                : {}),
            ...(query?.employee ? { user: { fullName: { contains: query.employee, mode: 'insensitive' } } } : {}),
            ...(query?.reportType ? { form: { name: { contains: query.reportType, mode: 'insensitive' } } } : {}),
        };

        const [items, total] = await Promise.all([
            this.prisma.formSubmission.findMany({
                where,
                include: {
                    form: { select: { name: true, nameAr: true } },
                    user: { select: { fullName: true, employeeNumber: true, department: { select: { name: true } } } },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.formSubmission.count({ where }),
        ]);

        return { items, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
    }

    async getEmployeeReport(query?: any) {
        const { page, limit, skip } = this.toPaging(query, 20);
        const where: any = {
            ...(query?.departmentId ? { departmentId: query.departmentId } : {}),
            ...(query?.status === 'active' ? { isActive: true } : query?.status === 'inactive' ? { isActive: false } : {}),
            ...(query?.employee
                ? {
                    OR: [
                        { fullName: { contains: query.employee, mode: 'insensitive' } },
                        { employeeNumber: { contains: query.employee, mode: 'insensitive' } },
                    ],
                }
                : {}),
            ...(query?.from || query?.to
                ? {
                    createdAt: {
                        ...(query?.from ? { gte: new Date(query.from) } : {}),
                        ...(query?.to ? { lte: new Date(query.to) } : {}),
                    },
                }
                : {}),
        };

        const [items, total] = await Promise.all([
            this.prisma.user.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    employeeNumber: true,
                    fullName: true,
                    email: true,
                    phone: true,
                    role: true,
                    jobTitle: true,
                    isActive: true,
                    createdAt: true,
                    department: { select: { name: true } },
                    leaveBalances: { where: { year: new Date().getFullYear() } },
                },
            }),
            this.prisma.user.count({ where }),
        ]);

        return { items, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
    }

    async exportLeaveReportToExcel(filters?: any): Promise<Buffer> {
        const data = await this.getLeaveReport({ ...filters, page: 1, limit: 10000 });
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Leave Report');

        sheet.columns = [
            { header: 'Employee', key: 'employee', width: 25 },
            { header: 'Emp. #', key: 'empNum', width: 15 },
            { header: 'Department', key: 'dept', width: 20 },
            { header: 'Leave Type', key: 'leaveType', width: 15 },
            { header: 'Start Date', key: 'startDate', width: 15 },
            { header: 'End Date', key: 'endDate', width: 15 },
            { header: 'Days', key: 'days', width: 10 },
            { header: 'Status', key: 'status', width: 20 },
            { header: 'Reason', key: 'reason', width: 30 },
        ];

        sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1e3a5f' } };

        data.items.forEach((row: any) => {
            sheet.addRow({
                employee: row.user?.fullName,
                empNum: row.user?.employeeNumber,
                dept: row.user?.department?.name,
                leaveType: row.leaveType,
                startDate: new Date(row.startDate).toLocaleDateString(),
                endDate: new Date(row.endDate).toLocaleDateString(),
                days: row.totalDays,
                status: row.status,
                reason: row.reason,
            });
        });

        const arrayBuffer = await workbook.xlsx.writeBuffer();
        return Buffer.from(arrayBuffer);
    }

    async exportPermissionReportToExcel(filters?: any): Promise<Buffer> {
        const data = await this.getPermissionReport({ ...filters, page: 1, limit: 10000 });
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Permission Report');

        sheet.columns = [
            { header: 'Employee', key: 'employee', width: 25 },
            { header: 'Emp. #', key: 'empNum', width: 15 },
            { header: 'Department', key: 'dept', width: 20 },
            { header: 'Type', key: 'type', width: 15 },
            { header: 'Date', key: 'date', width: 15 },
            { header: 'Hours', key: 'hours', width: 10 },
            { header: 'Status', key: 'status', width: 20 },
        ];

        sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1e3a5f' } };

        data.items.forEach((row: any) => {
            sheet.addRow({
                employee: row.user?.fullName,
                empNum: row.user?.employeeNumber,
                dept: row.user?.department?.name,
                type: row.permissionType,
                date: new Date(row.requestDate).toLocaleDateString(),
                hours: row.hoursUsed,
                status: row.status,
            });
        });

        const arrayBuffer = await workbook.xlsx.writeBuffer();
        return Buffer.from(arrayBuffer);
    }
}
