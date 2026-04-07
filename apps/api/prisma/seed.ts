import { PrismaClient, Role, Governorate, RecipientStatus, TemplateType } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { DEFAULT_WHATSAPP_SETTINGS } from '../src/settings/whatsapp-defaults';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const prisma = new PrismaClient();
const cycleSeed = {
    start: new Date(2026, 1, 11),
    end: new Date(2026, 2, 10),
    endOfDay: new Date(2026, 2, 10, 23, 59, 59),
};

const addDays = (date: Date, days: number) => {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
};

const withTime = (date: Date, hours: number, minutes: number) => {
    const next = new Date(date);
    next.setHours(hours, minutes, 0, 0);
    return next;
};

type SeedUser = {
    employeeNumber: string;
    fullName: string;
    fullNameAr: string;
    email: string;
    username: string;
    password: string;
    role: Role;
    governorate: Governorate;
    departmentName?: 'ERC' | 'SPHINX';
    phone: string;
    jobTitle: string;
    jobTitleAr: string;
    fingerprintId: string;
};

const branchesData = [
    { name: 'Alexandria', nameAr: '\u0627\u0644\u0625\u0633\u0643\u0646\u062f\u0631\u064a\u0629', governorate: 'ALEXANDRIA' },
    { name: 'Cairo', nameAr: '\u0627\u0644\u0642\u0627\u0647\u0631\u0629', governorate: 'CAIRO' },
] as const;

const departmentsData = [
    { name: 'ERC', nameAr: 'ERC', description: 'ERC Department' },
    { name: 'SPHINX', nameAr: 'SPHINX', description: 'SPHINX Department' },
] as const;

const requiredUsers: SeedUser[] = [
    {
        employeeNumber: 'EMP-0001',
        fullName: 'Super Admin',
        email: 'superadmin@sphinx.com',
        username: 'super-admin',
        password: 'Admin@123456',
        role: 'SUPER_ADMIN',
        governorate: 'CAIRO',
        departmentName: 'SPHINX',
        phone: '01000000001',
        jobTitle: 'System Administrator',
        jobTitleAr: '\u0645\u0633\u0624\u0648\u0644 \u0627\u0644\u0646\u0638\u0627\u0645',
        fullNameAr: '\u0645\u0633\u0624\u0648\u0644 \u0627\u0644\u0646\u0638\u0627\u0645',
        fingerprintId: '100001',
    },
    {
        employeeNumber: 'EMP-0002',
        fullName: 'HR Admin',
        fullNameAr: '\u0645\u0633\u0624\u0648\u0644 \u0627\u0644\u0645\u0648\u0627\u0631\u062f \u0627\u0644\u0628\u0634\u0631\u064a\u0629',
        email: 'hradmin@sphinx.com',
        username: 'hr-admin',
        password: 'HrAdmin@123',
        role: 'HR_ADMIN',
        governorate: 'CAIRO',
        departmentName: 'ERC',
        phone: '01000000002',
        jobTitle: 'HR Admin',
        jobTitleAr: '\u0645\u0633\u0624\u0648\u0644 \u0627\u0644\u0645\u0648\u0627\u0631\u062f \u0627\u0644\u0628\u0634\u0631\u064a\u0629',
        fingerprintId: '100002',
    },
    {
        employeeNumber: 'EMP-0003',
        fullName: 'Alexandria Secretary',
        fullNameAr: '\u0633\u0643\u0631\u062a\u064a\u0631 \u0641\u0631\u0639 \u0627\u0644\u0625\u0633\u0643\u0646\u062f\u0631\u064a\u0629',
        email: 'secretary.alex@sphinx.com',
        username: 'secretary-alex',
        password: 'Sec@123',
        role: 'BRANCH_SECRETARY',
        governorate: 'ALEXANDRIA',
        phone: '01000000003',
        jobTitle: 'Branch Secretary',
        jobTitleAr: '\u0633\u0643\u0631\u062a\u064a\u0631 \u0627\u0644\u0641\u0631\u0639',
        fingerprintId: '100003',
    },
    {
        employeeNumber: 'EMP-0004',
        fullName: 'Cairo Secretary',
        fullNameAr: '\u0633\u0643\u0631\u062a\u064a\u0631 \u0641\u0631\u0639 \u0627\u0644\u0642\u0627\u0647\u0631\u0629',
        email: 'secretary.cairo@sphinx.com',
        username: 'secretary-cairo',
        password: 'Sec@123',
        role: 'BRANCH_SECRETARY',
        governorate: 'CAIRO',
        phone: '01000000004',
        jobTitle: 'Branch Secretary',
        jobTitleAr: '\u0633\u0643\u0631\u062a\u064a\u0631 \u0627\u0644\u0641\u0631\u0639',
        fingerprintId: '100004',
    },
    {
        employeeNumber: 'EMP-0005',
        fullName: 'Manager Alex ERC',
        fullNameAr: '\u0645\u062f\u064a\u0631 ERC \u0627\u0644\u0625\u0633\u0643\u0646\u062f\u0631\u064a\u0629',
        email: 'manager.alex.erc@sphinx.com',
        username: 'manager-alex-erc',
        password: 'Manager@123',
        role: 'MANAGER',
        governorate: 'ALEXANDRIA',
        departmentName: 'ERC',
        phone: '01000000005',
        jobTitle: 'Department Manager',
        jobTitleAr: '\u0645\u062f\u064a\u0631 \u0627\u0644\u0642\u0633\u0645',
        fingerprintId: '100005',
    },
    {
        employeeNumber: 'EMP-0006',
        fullName: 'Manager Alex SPHINX',
        fullNameAr: '\u0645\u062f\u064a\u0631 SPHINX \u0627\u0644\u0625\u0633\u0643\u0646\u062f\u0631\u064a\u0629',
        email: 'manager.alex.sphinx@sphinx.com',
        username: 'manager-alex-sphinx',
        password: 'Manager@123',
        role: 'MANAGER',
        governorate: 'ALEXANDRIA',
        departmentName: 'SPHINX',
        phone: '01000000006',
        jobTitle: 'Department Manager',
        jobTitleAr: '\u0645\u062f\u064a\u0631 \u0627\u0644\u0642\u0633\u0645',
        fingerprintId: '100006',
    },
    {
        employeeNumber: 'EMP-0007',
        fullName: 'Manager Cairo ERC',
        fullNameAr: '\u0645\u062f\u064a\u0631 ERC \u0627\u0644\u0642\u0627\u0647\u0631\u0629',
        email: 'manager.cairo.erc@sphinx.com',
        username: 'manager-cairo-erc',
        password: 'Manager@123',
        role: 'MANAGER',
        governorate: 'CAIRO',
        departmentName: 'ERC',
        phone: '01000000007',
        jobTitle: 'Department Manager',
        jobTitleAr: '\u0645\u062f\u064a\u0631 \u0627\u0644\u0642\u0633\u0645',
        fingerprintId: '100007',
    },
    {
        employeeNumber: 'EMP-0008',
        fullName: 'Manager Cairo SPHINX',
        fullNameAr: '\u0645\u062f\u064a\u0631 SPHINX \u0627\u0644\u0642\u0627\u0647\u0631\u0629',
        email: 'manager.cairo.sphinx@sphinx.com',
        username: 'manager-cairo-sphinx',
        password: 'Manager@123',
        role: 'MANAGER',
        governorate: 'CAIRO',
        departmentName: 'SPHINX',
        phone: '01000000008',
        jobTitle: 'Department Manager',
        jobTitleAr: '\u0645\u062f\u064a\u0631 \u0627\u0644\u0642\u0633\u0645',
        fingerprintId: '100008',
    },
    {
        employeeNumber: 'EMP-0009',
        fullName: 'Momen Alex ERC',
        fullNameAr: '\u0645\u0624\u0645\u0646 - \u0627\u0644\u0625\u0633\u0643\u0646\u062f\u0631\u064a\u0629 ERC',
        email: 'momen.alex.erc@sphinx.com',
        username: 'momen-alex-erc',
        password: 'Emp@123456',
        role: 'EMPLOYEE',
        governorate: 'ALEXANDRIA',
        departmentName: 'ERC',
        phone: '01000000009',
        jobTitle: 'Employee',
        jobTitleAr: '\u0645\u0648\u0638\u0641',
        fingerprintId: '100009',
    },
    {
        employeeNumber: 'EMP-0010',
        fullName: 'Ahmed Alex ERC',
        fullNameAr: '\u0623\u062d\u0645\u062f - \u0627\u0644\u0625\u0633\u0643\u0646\u062f\u0631\u064a\u0629 ERC',
        email: 'ahmed.alex.erc@sphinx.com',
        username: 'ahmed-alex-erc',
        password: 'Emp@123456',
        role: 'EMPLOYEE',
        governorate: 'ALEXANDRIA',
        departmentName: 'ERC',
        phone: '01000000010',
        jobTitle: 'Employee',
        jobTitleAr: '\u0645\u0648\u0638\u0641',
        fingerprintId: '100010',
    },
    {
        employeeNumber: 'EMP-0011',
        fullName: 'Sara Alex ERC',
        fullNameAr: '\u0633\u0627\u0631\u0629 - \u0627\u0644\u0625\u0633\u0643\u0646\u062f\u0631\u064a\u0629 ERC',
        email: 'sara.alex.erc@sphinx.com',
        username: 'sara-alex-erc',
        password: 'Emp@123456',
        role: 'EMPLOYEE',
        governorate: 'ALEXANDRIA',
        departmentName: 'ERC',
        phone: '01000000011',
        jobTitle: 'Employee',
        jobTitleAr: '\u0645\u0648\u0638\u0641',
        fingerprintId: '100011',
    },
    {
        employeeNumber: 'EMP-0012',
        fullName: 'Ali Alex SPHINX',
        fullNameAr: '\u0639\u0644\u064a - \u0627\u0644\u0625\u0633\u0643\u0646\u062f\u0631\u064a\u0629 SPHINX',
        email: 'ali.alex.sphinx@sphinx.com',
        username: 'ali-alex-sphinx',
        password: 'Emp@123456',
        role: 'EMPLOYEE',
        governorate: 'ALEXANDRIA',
        departmentName: 'SPHINX',
        phone: '01000000012',
        jobTitle: 'Employee',
        jobTitleAr: '\u0645\u0648\u0638\u0641',
        fingerprintId: '100012',
    },
    {
        employeeNumber: 'EMP-0013',
        fullName: 'Nada Alex SPHINX',
        fullNameAr: '\u0646\u062f\u0649 - \u0627\u0644\u0625\u0633\u0643\u0646\u062f\u0631\u064a\u0629 SPHINX',
        email: 'nada.alex.sphinx@sphinx.com',
        username: 'nada-alex-sphinx',
        password: 'Emp@123456',
        role: 'EMPLOYEE',
        governorate: 'ALEXANDRIA',
        departmentName: 'SPHINX',
        phone: '01000000013',
        jobTitle: 'Employee',
        jobTitleAr: '\u0645\u0648\u0638\u0641',
        fingerprintId: '100013',
    },
    {
        employeeNumber: 'EMP-0014',
        fullName: 'Khaled Cairo ERC',
        fullNameAr: '\u062e\u0627\u0644\u062f - \u0627\u0644\u0642\u0627\u0647\u0631\u0629 ERC',
        email: 'khaled.cairo.erc@sphinx.com',
        username: 'khaled-cairo-erc',
        password: 'Emp@123456',
        role: 'EMPLOYEE',
        governorate: 'CAIRO',
        departmentName: 'ERC',
        phone: '01000000014',
        jobTitle: 'Employee',
        jobTitleAr: '\u0645\u0648\u0638\u0641',
        fingerprintId: '100014',
    },
    {
        employeeNumber: 'EMP-0015',
        fullName: 'Mariam Cairo ERC',
        fullNameAr: '\u0645\u0631\u064a\u0645 - \u0627\u0644\u0642\u0627\u0647\u0631\u0629 ERC',
        email: 'mariam.cairo.erc@sphinx.com',
        username: 'mariam-cairo-erc',
        password: 'Emp@123456',
        role: 'EMPLOYEE',
        governorate: 'CAIRO',
        departmentName: 'ERC',
        phone: '01000000015',
        jobTitle: 'Employee',
        jobTitleAr: '\u0645\u0648\u0638\u0641',
        fingerprintId: '100015',
    },
    {
        employeeNumber: 'EMP-0016',
        fullName: 'Omar Cairo SPHINX',
        fullNameAr: '\u0639\u0645\u0631 - \u0627\u0644\u0642\u0627\u0647\u0631\u0629 SPHINX',
        email: 'omar.cairo.sphinx@sphinx.com',
        username: 'omar-cairo-sphinx',
        password: 'Emp@123456',
        role: 'EMPLOYEE',
        governorate: 'CAIRO',
        departmentName: 'SPHINX',
        phone: '01000000016',
        jobTitle: 'Employee',
        jobTitleAr: '\u0645\u0648\u0638\u0641',
        fingerprintId: '100016',
    },
];

async function upsertUserWithoutDuplicates(
    data: Omit<SeedUser, 'password' | 'departmentName'> & { passwordHash: string; departmentId?: string; branchId?: number },
) {
    const username = data.username.toLowerCase();

    const existing = await prisma.user.findFirst({
        where: {
            OR: [
                { employeeNumber: data.employeeNumber },
                { email: data.email.toLowerCase() },
                { username },
            ],
        },
    });

    const payload = {
        employeeNumber: data.employeeNumber,
        fullName: data.fullName,
        fullNameAr: data.fullNameAr,
        email: data.email.toLowerCase(),
        username,
        phone: data.phone,
        passwordHash: data.passwordHash,
        role: data.role,
        governorate: data.governorate,
        branchId: data.branchId,
        departmentId: data.departmentId,
        jobTitle: data.jobTitle,
        jobTitleAr: data.jobTitleAr,
        fingerprintId: data.fingerprintId,
        mustChangePass: false,
        isActive: true,
    };

    if (existing) {
        return prisma.user.update({ where: { id: existing.id }, data: payload });
    }

    return prisma.user.create({ data: payload });
}

async function pruneUsersNotInList(keepUserIds: string[]) {
    const removeUsers = await prisma.user.findMany({
        where: { id: { notIn: keepUserIds } },
        select: { id: true },
    });
    const removeIds = removeUsers.map((u) => u.id);
    if (!removeIds.length) return;

    await prisma.department.updateMany({
        where: { managerId: { in: removeIds } },
        data: { managerId: null },
    });

    await prisma.permissionRequest.updateMany({
        where: { approvedByMgrId: { in: removeIds } },
        data: { approvedByMgrId: null, approvedByMgrAt: null },
    });
    await prisma.permissionRequest.updateMany({
        where: { approvedByHrId: { in: removeIds } },
        data: { approvedByHrId: null, approvedByHrAt: null },
    });
    await prisma.leaveRequest.updateMany({
        where: { approvedByMgrId: { in: removeIds } },
        data: { approvedByMgrId: null, approvedByMgrAt: null },
    });
    await prisma.leaveRequest.updateMany({
        where: { approvedByHrId: { in: removeIds } },
        data: { approvedByHrId: null, approvedByHrAt: null },
    });
    await prisma.notification.updateMany({
        where: { senderId: { in: removeIds } },
        data: { senderId: null },
    });

    await prisma.permissionRequest.deleteMany({ where: { userId: { in: removeIds } } });
    await prisma.permissionCycle.deleteMany({ where: { userId: { in: removeIds } } });
    await prisma.leaveRequest.deleteMany({ where: { userId: { in: removeIds } } });
    await prisma.leaveBalance.deleteMany({ where: { userId: { in: removeIds } } });
    await prisma.formSubmission.deleteMany({ where: { userId: { in: removeIds } } });
    await prisma.notification.deleteMany({ where: { receiverId: { in: removeIds } } });
    await prisma.auditLog.deleteMany({ where: { userId: { in: removeIds } } });
    await prisma.refreshToken.deleteMany({ where: { userId: { in: removeIds } } });
    await prisma.note.deleteMany({ where: { userId: { in: removeIds } } });
    await prisma.lateness.deleteMany({ where: { userId: { in: removeIds } } });
    await prisma.message.deleteMany({
        where: {
            OR: [{ senderId: { in: removeIds } }, { receiverId: { in: removeIds } }],
        },
    });

    await prisma.user.deleteMany({ where: { id: { in: removeIds } } });
}

async function resetLeaveBalances(userIds: string[], year: number) {
    const defaults = [
        { leaveType: 'ANNUAL', totalDays: 21 },
        { leaveType: 'CASUAL', totalDays: 7 },
        { leaveType: 'EMERGENCY', totalDays: 3 },
        { leaveType: 'MISSION', totalDays: 10 },
    ] as const;

    for (const userId of userIds) {
        for (const item of defaults) {
            await prisma.leaveBalance.upsert({
                where: { userId_year_leaveType: { userId, year, leaveType: item.leaveType } },
                update: {
                    totalDays: item.totalDays,
                    usedDays: 0,
                    remainingDays: item.totalDays,
                },
                create: {
                    userId,
                    year,
                    leaveType: item.leaveType,
                    totalDays: item.totalDays,
                    usedDays: 0,
                    remainingDays: item.totalDays,
                },
            });
        }
    }
}

async function syncWorkScheduleSettings() {
    const existing = await prisma.workScheduleSettings.findFirst({
        select: { id: true, evolutionApiBaseUrl: true },
    });

    if (existing) {
        await prisma.workScheduleSettings.update({
            where: { id: existing.id },
            data: { evolutionApiBaseUrl: DEFAULT_WHATSAPP_SETTINGS.evolutionApiBaseUrl },
        });
        return;
    }

    await prisma.workScheduleSettings.create({
        data: DEFAULT_WHATSAPP_SETTINGS,
    });
}

export async function seedMessagingData(prismaClient: PrismaClient = prisma) {
    const templates: Array<{ name: string; type: TemplateType; subject: string; body: string }> = [
        {
            name: 'EST I Exam Assignment',
            type: TemplateType.BOTH,
            subject: 'EST I Exam Assignment',
            body: `Dear {{name}},

We look forward to welcoming you on {{day}} the {{date}} for the {{exam_type}} Exam as {{role}}. The session will be in:

Test Center: {{test_center}} {{faculty}}

Room #: {{room}}

Address: {{address}}

{{map_link}}

You need to be in the test center at {{arrival_time}} sharp please.

Best Regards,
The EST Team`,
        },
        {
            name: 'EST II Exam Assignment',
            type: TemplateType.BOTH,
            subject: 'EST II Exam Assignment',
            body: `Dear {{name}},

We look forward to welcoming you on {{day}} the {{date}} for the {{exam_type}} Exam as {{role}}. The session will be in:

Test Center: {{test_center}} {{faculty}}

Room #: {{room}}

Address: {{address}}

{{map_link}}

You need to be in the test center at {{arrival_time}} sharp please.

Best Regards,
The EST Team`,
        },
    ];

    for (const template of templates) {
        await prismaClient.template.upsert({
            where: { name: template.name },
            update: { subject: template.subject, body: template.body, type: template.type },
            create: { name: template.name, type: template.type, subject: template.subject, body: template.body },
        });
    }

    const recipients = [
        {
            name: 'Moamen Ahmed Abdo',
            email: 'test1@example.com',
            phone: '+201000000000',
            exam_type: 'EST 1',
            role: 'Senior',
            day: 'Friday',
            date: '27 March 2026',
            test_center: 'Horus University - Egypt (HUE)',
            faculty: 'Faculty of Engineering',
            room: '1st Floor',
            address: 'Damietta New City',
            map_link: 'https://goo.gl/maps/QpH7dmNahszbVCFM6',
            arrival_time: '8:00 AM',
            status: 'PENDING',
        },
        {
            name: 'Aya Mostafa Hassan',
            email: 'test2@example.com',
            phone: '+201000000001',
            exam_type: 'EST 1',
            role: 'Senior',
            day: 'Friday',
            date: '27 March 2026',
            test_center: 'Horus University - Egypt (HUE)',
            faculty: 'Faculty of Engineering',
            room: '1st Floor',
            address: 'Damietta New City',
            map_link: 'https://goo.gl/maps/QpH7dmNahszbVCFM6',
            arrival_time: '8:00 AM',
            status: 'PENDING',
        },
        {
            name: 'Omar Nabil Adel',
            email: 'test3@example.com',
            phone: '+201000000002',
            exam_type: 'EST 1',
            role: 'Senior',
            day: 'Friday',
            date: '27 March 2026',
            test_center: 'Horus University - Egypt (HUE)',
            faculty: 'Faculty of Engineering',
            room: '1st Floor',
            address: 'Damietta New City',
            map_link: 'https://goo.gl/maps/QpH7dmNahszbVCFM6',
            arrival_time: '8:00 AM',
            status: 'PENDING',
        },
        {
            name: 'Sara Mahmoud Ibrahim',
            email: 'test4@example.com',
            phone: '+201000000003',
            exam_type: 'EST 1',
            role: 'Senior',
            day: 'Friday',
            date: '27 March 2026',
            test_center: 'Horus University - Egypt (HUE)',
            faculty: 'Faculty of Engineering',
            room: '1st Floor',
            address: 'Damietta New City',
            map_link: 'https://goo.gl/maps/QpH7dmNahszbVCFM6',
            arrival_time: '8:00 AM',
            status: 'PENDING',
        },
        {
            name: 'Hassan Samir Khaled',
            email: 'test5@example.com',
            phone: '+201000000004',
            exam_type: 'EST 1',
            role: 'Senior',
            day: 'Friday',
            date: '27 March 2026',
            test_center: 'Horus University - Egypt (HUE)',
            faculty: 'Faculty of Engineering',
            room: '1st Floor',
            address: 'Damietta New City',
            map_link: 'https://goo.gl/maps/QpH7dmNahszbVCFM6',
            arrival_time: '8:00 AM',
            status: 'PENDING',
        },
        {
            name: 'Laila Mostafa Amin',
            email: 'test6@example.com',
            phone: '+201000000005',
            exam_type: 'EST 1',
            role: 'Senior',
            day: 'Friday',
            date: '27 March 2026',
            test_center: 'Horus University - Egypt (HUE)',
            faculty: 'Faculty of Engineering',
            room: '1st Floor',
            address: 'Damietta New City',
            map_link: 'https://goo.gl/maps/QpH7dmNahszbVCFM6',
            arrival_time: '8:00 AM',
            status: 'PENDING',
        },
        {
            name: 'Nour Mohamed Ali',
            email: 'test7@example.com',
            phone: '+201000000006',
            exam_type: 'EST 1',
            role: 'Senior',
            day: 'Friday',
            date: '27 March 2026',
            test_center: 'Horus University - Egypt (HUE)',
            faculty: 'Faculty of Engineering',
            room: '1st Floor',
            address: 'Damietta New City',
            map_link: 'https://goo.gl/maps/QpH7dmNahszbVCFM6',
            arrival_time: '8:00 AM',
            status: 'PENDING',
        },
        {
            name: 'Tamer Saeed Fathy',
            email: 'test8@example.com',
            phone: '+201000000007',
            exam_type: 'EST 1',
            role: 'Senior',
            day: 'Friday',
            date: '27 March 2026',
            test_center: 'Horus University - Egypt (HUE)',
            faculty: 'Faculty of Engineering',
            room: '1st Floor',
            address: 'Damietta New City',
            map_link: 'https://goo.gl/maps/QpH7dmNahszbVCFM6',
            arrival_time: '8:00 AM',
            status: 'PENDING',
        },
        {
            name: 'Nadia Ahmed Fouad',
            email: 'test9@example.com',
            phone: '+201000000008',
            exam_type: 'EST 1',
            role: 'Senior',
            day: 'Friday',
            date: '27 March 2026',
            test_center: 'Horus University - Egypt (HUE)',
            faculty: 'Faculty of Engineering',
            room: '1st Floor',
            address: 'Damietta New City',
            map_link: 'https://goo.gl/maps/QpH7dmNahszbVCFM6',
            arrival_time: '8:00 AM',
            status: 'PENDING',
        },
        {
            name: 'Aya Omar Youssef',
            email: 'test10@example.com',
            phone: '+201000000009',
            exam_type: 'EST 1',
            role: 'Senior',
            day: 'Friday',
            date: '27 March 2026',
            test_center: 'Horus University - Egypt (HUE)',
            faculty: 'Faculty of Engineering',
            room: '1st Floor',
            address: 'Damietta New City',
            map_link: 'https://goo.gl/maps/QpH7dmNahszbVCFM6',
            arrival_time: '8:00 AM',
            status: 'PENDING',
        },
        {
            name: 'Mona Khaled Ibrahim',
            email: 'test11@example.com',
            phone: '+201000000010',
            exam_type: 'EST 2',
            role: 'Roaming',
            day: 'Saturday',
            date: '28 March 2026',
            test_center: 'Horus University - Egypt (HUE)',
            faculty: 'Faculty of Medicine',
            room: 'Ground Floor',
            address: 'Damietta New City',
            map_link: 'https://goo.gl/maps/QpH7dmNahszbVCFM6',
            arrival_time: '8:00 AM',
            status: 'PENDING',
        },
        {
            name: 'Ahmed Samir Yassin',
            email: 'test12@example.com',
            phone: '+201000000011',
            exam_type: 'EST 2',
            role: 'Roaming',
            day: 'Saturday',
            date: '28 March 2026',
            test_center: 'Horus University - Egypt (HUE)',
            faculty: 'Faculty of Medicine',
            room: 'Ground Floor',
            address: 'Damietta New City',
            map_link: 'https://goo.gl/maps/QpH7dmNahszbVCFM6',
            arrival_time: '8:00 AM',
            status: 'PENDING',
        },
        {
            name: 'Nourhan Salah Adel',
            email: 'test13@example.com',
            phone: '+201000000012',
            exam_type: 'EST 2',
            role: 'Roaming',
            day: 'Saturday',
            date: '28 March 2026',
            test_center: 'Horus University - Egypt (HUE)',
            faculty: 'Faculty of Medicine',
            room: 'Ground Floor',
            address: 'Damietta New City',
            map_link: 'https://goo.gl/maps/QpH7dmNahszbVCFM6',
            arrival_time: '8:00 AM',
            status: 'PENDING',
        },
        {
            name: 'Karim Fathy Nabil',
            email: 'test14@example.com',
            phone: '+201000000013',
            exam_type: 'EST 2',
            role: 'Roaming',
            day: 'Saturday',
            date: '28 March 2026',
            test_center: 'Horus University - Egypt (HUE)',
            faculty: 'Faculty of Medicine',
            room: 'Ground Floor',
            address: 'Damietta New City',
            map_link: 'https://goo.gl/maps/QpH7dmNahszbVCFM6',
            arrival_time: '8:00 AM',
            status: 'PENDING',
        },
        {
            name: 'Salma Mostafa Adel',
            email: 'test15@example.com',
            phone: '+201000000014',
            exam_type: 'EST 2',
            role: 'Roaming',
            day: 'Saturday',
            date: '28 March 2026',
            test_center: 'Horus University - Egypt (HUE)',
            faculty: 'Faculty of Medicine',
            room: 'Ground Floor',
            address: 'Damietta New City',
            map_link: 'https://goo.gl/maps/QpH7dmNahszbVCFM6',
            arrival_time: '8:00 AM',
            status: 'PENDING',
        },
        {
            name: 'Yara Mahmoud Samir',
            email: 'test16@example.com',
            phone: '+201000000015',
            exam_type: 'EST 2',
            role: 'Roaming',
            day: 'Saturday',
            date: '28 March 2026',
            test_center: 'Horus University - Egypt (HUE)',
            faculty: 'Faculty of Medicine',
            room: 'Ground Floor',
            address: 'Damietta New City',
            map_link: 'https://goo.gl/maps/QpH7dmNahszbVCFM6',
            arrival_time: '8:00 AM',
            status: 'PENDING',
        },
        {
            name: 'Hend Tarek Gamal',
            email: 'test17@example.com',
            phone: '+201000000016',
            exam_type: 'EST 2',
            role: 'Roaming',
            day: 'Saturday',
            date: '28 March 2026',
            test_center: 'Horus University - Egypt (HUE)',
            faculty: 'Faculty of Medicine',
            room: 'Ground Floor',
            address: 'Damietta New City',
            map_link: 'https://goo.gl/maps/QpH7dmNahszbVCFM6',
            arrival_time: '8:00 AM',
            status: 'PENDING',
        },
        {
            name: 'Osama Samir Farouk',
            email: 'test18@example.com',
            phone: '+201000000017',
            exam_type: 'EST 2',
            role: 'Roaming',
            day: 'Saturday',
            date: '28 March 2026',
            test_center: 'Horus University - Egypt (HUE)',
            faculty: 'Faculty of Medicine',
            room: 'Ground Floor',
            address: 'Damietta New City',
            map_link: 'https://goo.gl/maps/QpH7dmNahszbVCFM6',
            arrival_time: '8:00 AM',
            status: 'PENDING',
        },
        {
            name: 'Dina Tamer Youssef',
            email: 'test19@example.com',
            phone: '+201000000018',
            exam_type: 'EST 2',
            role: 'Roaming',
            day: 'Saturday',
            date: '28 March 2026',
            test_center: 'Horus University - Egypt (HUE)',
            faculty: 'Faculty of Medicine',
            room: 'Ground Floor',
            address: 'Damietta New City',
            map_link: 'https://goo.gl/maps/QpH7dmNahszbVCFM6',
            arrival_time: '8:00 AM',
            status: 'PENDING',
        },
        {
            name: 'Rana Ali Kamel',
            email: 'test20@example.com',
            phone: '+201000000019',
            exam_type: 'EST 2',
            role: 'Roaming',
            day: 'Saturday',
            date: '28 March 2026',
            test_center: 'Horus University - Egypt (HUE)',
            faculty: 'Faculty of Medicine',
            room: 'Ground Floor',
            address: 'Damietta New City',
            map_link: 'https://goo.gl/maps/QpH7dmNahszbVCFM6',
            arrival_time: '8:00 AM',
            status: 'PENDING',
        },
    ];

    const existingEmails = await prismaClient.recipient.findMany({
        where: { email: { in: recipients.map((item) => item.email).filter(Boolean) as string[] } },
        select: { email: true, phone: true },
    });
    const existingEmailSet = new Set(existingEmails.map((item) => item.email).filter(Boolean));
    const existingPhoneSet = new Set(existingEmails.map((item) => item.phone).filter(Boolean));

    const filtered = recipients.filter((row) => {
        if (!row.name) return false;
        if (row.email && existingEmailSet.has(row.email)) return false;
        if (row.phone && existingPhoneSet.has(row.phone)) return false;
        return true;
    });

    if (filtered.length) {
        const createPayload = filtered.map((row) => ({
            ...row,
            status: RecipientStatus.PENDING,
        }));
        await prismaClient.recipient.createMany({ data: createPayload });
    }
}

async function main() {
    console.log('Seeding SPHINX HR database (deduplicated)...');

    const branches = await Promise.all(
        branchesData.map((branch) =>
            prisma.branch.upsert({
                where: { name: branch.name },
                update: { nameAr: branch.nameAr },
                create: { name: branch.name, nameAr: branch.nameAr },
            }),
        ),
    );

    const branchByName = new Map(branches.map((branch) => [branch.name, branch.id]));
    const branchByGovernorate = new Map<Governorate, number>();
    branchesData.forEach((branch) => {
        const id = branchByName.get(branch.name);
        if (id) branchByGovernorate.set(branch.governorate, id);
    });

    const departments = await Promise.all(
        departmentsData.map((dept) =>
            prisma.department.upsert({
                where: { name: dept.name },
                update: { nameAr: dept.nameAr, description: dept.description },
                create: { name: dept.name, nameAr: dept.nameAr, description: dept.description },
            }),
        ),
    );

    const departmentByName = new Map(departments.map((d) => [d.name, d.id]));
    const departmentBranchLinks = departments.flatMap((dept) =>
        branches.map((branch) => ({
            departmentId: dept.id,
            branchId: branch.id,
        })),
    );

    if (departmentBranchLinks.length) {
        await prisma.departmentBranch.createMany({
            data: departmentBranchLinks,
            skipDuplicates: true,
        });
    }

    await syncWorkScheduleSettings();

    for (const user of requiredUsers) {
        const passwordHash = await bcrypt.hash(user.password, 12);
        const branchId = branchByGovernorate.get(user.governorate);
        await upsertUserWithoutDuplicates({
            employeeNumber: user.employeeNumber,
            fullName: user.fullName,
            fullNameAr: user.fullNameAr,
            email: user.email,
            username: user.username,
            phone: user.phone,
            passwordHash,
            role: user.role,
            governorate: user.governorate,
            branchId,
            departmentId: user.departmentName ? departmentByName.get(user.departmentName) : undefined,
            jobTitle: user.jobTitle,
            jobTitleAr: user.jobTitleAr,
            fingerprintId: user.fingerprintId,
        });
    }

    const year = cycleSeed.start.getFullYear();
    const seededUsers = await prisma.user.findMany({
        where: { employeeNumber: { in: requiredUsers.map((u) => u.employeeNumber) } },
        select: { id: true, role: true, departmentId: true, governorate: true, employeeNumber: true },
    });

    const keepUserIds = seededUsers.map((u) => u.id);
    await pruneUsersNotInList(keepUserIds);

    await prisma.permissionRequest.deleteMany({
        where: { userId: { in: keepUserIds }, requestDate: { gte: cycleSeed.start, lte: cycleSeed.endOfDay } },
    });
    await prisma.permissionCycle.deleteMany({
        where: { userId: { in: keepUserIds }, cycleStart: cycleSeed.start },
    });
    await prisma.leaveRequest.deleteMany({
        where: { userId: { in: keepUserIds }, startDate: { gte: cycleSeed.start, lte: cycleSeed.endOfDay } },
    });
    await prisma.lateness.deleteMany({
        where: { userId: { in: keepUserIds }, date: { gte: cycleSeed.start, lte: cycleSeed.endOfDay } },
    });

    await resetLeaveBalances(keepUserIds, year);

    const hrApprover = seededUsers.find((u) => u.role === 'HR_ADMIN') ?? seededUsers.find((u) => u.role === 'SUPER_ADMIN') ?? null;
    const managers = seededUsers.filter((u) => u.role === 'MANAGER');
    const employees = seededUsers.filter((u) => u.role === 'EMPLOYEE');

    const permissionTemplates = [
        {
            offsetDays: 2,
            permissionType: 'PERSONAL' as const,
            arrivalTime: '11:00',
            leaveTime: '12:30',
            hoursUsed: 1.5,
            reason: 'Personal errand',
        },
        {
            offsetDays: 14,
            permissionType: 'PERSONAL' as const,
            arrivalTime: '14:00',
            leaveTime: '15:30',
            hoursUsed: 1.5,
            reason: 'Medical appointment',
        },
    ];

    const leaveTemplates = [
        { offsetDays: 5, leaveType: 'ANNUAL' as const, days: 1, reason: 'Annual leave' },
        { offsetDays: 16, leaveType: 'MISSION' as const, days: 1, reason: 'Client visit' },
        { offsetDays: 23, leaveType: 'ABSENCE_WITH_PERMISSION' as const, days: 1, reason: 'Permissioned absence' },
    ];

    const latenessTemplates = [
        { offsetDays: 3, minutesLate: 15 },
        { offsetDays: 19, minutesLate: 25 },
    ];

    for (const employee of employees) {
        const manager =
            managers.find((m) => m.departmentId === employee.departmentId && m.governorate === employee.governorate) ??
            managers.find((m) => m.departmentId === employee.departmentId) ??
            managers[0] ??
            null;
        const managerId = manager?.id ?? null;
        const hrId = hrApprover?.id ?? null;

        const totalPermissionHours = permissionTemplates.reduce((sum, item) => sum + item.hoursUsed, 0);
        const cycle = await prisma.permissionCycle.create({
            data: {
                userId: employee.id,
                cycleStart: cycleSeed.start,
                cycleEnd: cycleSeed.end,
                totalHours: 4,
                usedHours: totalPermissionHours,
                remainingHours: Math.max(0, 4 - totalPermissionHours),
            },
        });

        for (const template of permissionTemplates) {
            const baseDate = addDays(cycleSeed.start, template.offsetDays);
            const requestDate = withTime(baseDate, 9, 0);
            const createdAt = withTime(baseDate, 8, 30);
            const approvedByMgrAt = managerId ? withTime(addDays(baseDate, 1), 11, 0) : null;
            const approvedByHrAt = hrId ? withTime(addDays(baseDate, 2), 14, 0) : null;

            await prisma.permissionRequest.create({
                data: {
                    userId: employee.id,
                    cycleId: cycle.id,
                    permissionType: template.permissionType,
                    requestDate,
                    arrivalTime: template.arrivalTime,
                    leaveTime: template.leaveTime,
                    hoursUsed: template.hoursUsed,
                    reason: template.reason,
                    status: 'HR_APPROVED',
                    approvedByMgrId: managerId,
                    approvedByMgrAt,
                    approvedByHrId: hrId,
                    approvedByHrAt,
                    createdAt,
                    updatedAt: approvedByHrAt ?? createdAt,
                },
            });
        }

        for (const template of leaveTemplates) {
            const baseDate = addDays(cycleSeed.start, template.offsetDays);
            const startDate = withTime(baseDate, 9, 0);
            const endDate = withTime(addDays(baseDate, template.days - 1), 17, 0);
            const createdAt = withTime(baseDate, 8, 0);
            const approvedByMgrAt = managerId ? withTime(addDays(baseDate, 1), 11, 30) : null;
            const approvedByHrAt = hrId ? withTime(addDays(baseDate, 2), 14, 30) : null;

            await prisma.leaveRequest.create({
                data: {
                    userId: employee.id,
                    leaveType: template.leaveType,
                    startDate,
                    endDate,
                    totalDays: template.days,
                    reason: template.reason,
                    status: 'HR_APPROVED',
                    approvedByMgrId: managerId,
                    approvedByMgrAt,
                    approvedByHrId: hrId,
                    approvedByHrAt,
                    createdAt,
                    updatedAt: approvedByHrAt ?? createdAt,
                },
            });

            if (template.leaveType !== 'ABSENCE_WITH_PERMISSION') {
                await prisma.leaveBalance.update({
                    where: {
                        userId_year_leaveType: {
                            userId: employee.id,
                            year,
                            leaveType: template.leaveType,
                        },
                    },
                    data: {
                        usedDays: { increment: template.days },
                        remainingDays: { decrement: template.days },
                    },
                });
            }
        }

        for (const template of latenessTemplates) {
            const baseDate = addDays(cycleSeed.start, template.offsetDays);
            const date = withTime(baseDate, 9, 15);
            await prisma.lateness.create({
                data: {
                    userId: employee.id,
                    date,
                    minutesLate: template.minutesLate,
                    convertedToPermission: false,
                    createdAt: date,
                    updatedAt: date,
                },
            });
        }
    }

    await seedMessagingData();
    console.log('Database seeded successfully with required accounts and messaging data.');
}

if (require.main === module) {
    main()
        .catch((error) => {
            console.error(error);
            process.exit(1);
        })
        .finally(() => prisma.$disconnect());
}
