import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding SPHINX HR database...');

    const departmentsData = [
        {
            name: 'ERC - Alexandria',
            nameAr: 'ERC - Alexandria',
            description: 'ERC Department - Alexandria',
            governorate: 'ALEXANDRIA' as const,
        },
        {
            name: 'SPHINX - Alexandria',
            nameAr: 'SPHINX - Alexandria',
            description: 'SPHINX Department - Alexandria',
            governorate: 'ALEXANDRIA' as const,
        },
        {
            name: 'ERC - Cairo',
            nameAr: 'ERC - Cairo',
            description: 'ERC Department - Cairo',
            governorate: 'CAIRO' as const,
        },
        {
            name: 'SPHINX - Cairo',
            nameAr: 'SPHINX - Cairo',
            description: 'SPHINX Department - Cairo',
            governorate: 'CAIRO' as const,
        },
    ];

    const departments = await Promise.all(
        departmentsData.map((dept) =>
            prisma.department.upsert({
                where: { name: dept.name },
                update: {
                    nameAr: dept.nameAr,
                    description: dept.description,
                },
                create: {
                    name: dept.name,
                    nameAr: dept.nameAr,
                    description: dept.description,
                },
            }),
        ),
    );

    const alexErcDept = departments.find((d) => d.name === 'ERC - Alexandria');
    const alexSphinxDept = departments.find((d) => d.name === 'SPHINX - Alexandria');
    const cairoErcDept = departments.find((d) => d.name === 'ERC - Cairo');
    const cairoSphinxDept = departments.find((d) => d.name === 'SPHINX - Cairo');

    const superAdminPass = await bcrypt.hash('Admin@123456', 12);
    const superAdmin = await prisma.user.upsert({
        where: { email: 'superadmin@sphinx.com' },
        update: {},
        create: {
            employeeNumber: 'EMP-0001',
            fullName: 'Super Admin',
            fullNameAr: 'Super Admin',
            email: 'superadmin@sphinx.com',
            phone: '+201000000001',
            passwordHash: superAdminPass,
            role: 'SUPER_ADMIN',
            governorate: 'CAIRO',
            departmentId: cairoSphinxDept?.id,
            jobTitle: 'System Administrator',
            jobTitleAr: 'System Administrator',
            mustChangePass: false,
            isActive: true,
        },
    });

    const hrAdminPass = await bcrypt.hash('HrAdmin@123', 12);
    const hrAdmin = await prisma.user.upsert({
        where: { email: 'hradmin@sphinx.com' },
        update: {},
        create: {
            employeeNumber: 'EMP-0002',
            fullName: 'Sarah HR Manager',
            fullNameAr: 'Sarah HR Manager',
            email: 'hradmin@sphinx.com',
            phone: '+201000000002',
            passwordHash: hrAdminPass,
            role: 'HR_ADMIN',
            governorate: 'CAIRO',
            departmentId: cairoErcDept?.id,
            jobTitle: 'HR Manager',
            jobTitleAr: 'HR Manager',
            mustChangePass: false,
            isActive: true,
        },
    });

    const managerPass = await bcrypt.hash('Manager@123', 12);
    const managers = await Promise.all([
        prisma.user.upsert({
            where: { email: 'erc.alex.manager@sphinx.com' },
            update: {},
            create: {
                employeeNumber: 'EMP-0003',
                fullName: 'Mahmoud ERC Manager',
                fullNameAr: 'Mahmoud ERC Manager',
                email: 'erc.alex.manager@sphinx.com',
                phone: '+201000000003',
                passwordHash: managerPass,
                role: 'MANAGER',
                governorate: 'ALEXANDRIA',
                departmentId: alexErcDept?.id,
                jobTitle: 'ERC Department Manager',
                jobTitleAr: 'ERC Department Manager',
                mustChangePass: false,
                isActive: true,
            },
        }),
        prisma.user.upsert({
            where: { email: 'sphinx.alex.manager@sphinx.com' },
            update: {},
            create: {
                employeeNumber: 'EMP-0004',
                fullName: 'Nadia SPHINX Manager',
                fullNameAr: 'Nadia SPHINX Manager',
                email: 'sphinx.alex.manager@sphinx.com',
                phone: '+201000000004',
                passwordHash: managerPass,
                role: 'MANAGER',
                governorate: 'ALEXANDRIA',
                departmentId: alexSphinxDept?.id,
                jobTitle: 'SPHINX Department Manager',
                jobTitleAr: 'SPHINX Department Manager',
                mustChangePass: false,
                isActive: true,
            },
        }),
        prisma.user.upsert({
            where: { email: 'erc.cairo.manager@sphinx.com' },
            update: {},
            create: {
                employeeNumber: 'EMP-0005',
                fullName: 'Hassan ERC Manager',
                fullNameAr: 'Hassan ERC Manager',
                email: 'erc.cairo.manager@sphinx.com',
                phone: '+201000000005',
                passwordHash: managerPass,
                role: 'MANAGER',
                governorate: 'CAIRO',
                departmentId: cairoErcDept?.id,
                jobTitle: 'ERC Department Manager',
                jobTitleAr: 'ERC Department Manager',
                mustChangePass: false,
                isActive: true,
            },
        }),
        prisma.user.upsert({
            where: { email: 'sphinx.cairo.manager@sphinx.com' },
            update: {},
            create: {
                employeeNumber: 'EMP-0006',
                fullName: 'Laila SPHINX Manager',
                fullNameAr: 'Laila SPHINX Manager',
                email: 'sphinx.cairo.manager@sphinx.com',
                phone: '+201000000006',
                passwordHash: managerPass,
                role: 'MANAGER',
                governorate: 'CAIRO',
                departmentId: cairoSphinxDept?.id,
                jobTitle: 'SPHINX Department Manager',
                jobTitleAr: 'SPHINX Department Manager',
                mustChangePass: false,
                isActive: true,
            },
        }),
    ]);

    const [alexErcManager, alexSphinxManager, cairoErcManager, cairoSphinxManager] = managers;

    await Promise.all([
        alexErcDept?.id
            ? prisma.department.update({ where: { id: alexErcDept.id }, data: { managerId: alexErcManager.id } })
            : Promise.resolve(),
        alexSphinxDept?.id
            ? prisma.department.update({ where: { id: alexSphinxDept.id }, data: { managerId: alexSphinxManager.id } })
            : Promise.resolve(),
        cairoErcDept?.id
            ? prisma.department.update({ where: { id: cairoErcDept.id }, data: { managerId: cairoErcManager.id } })
            : Promise.resolve(),
        cairoSphinxDept?.id
            ? prisma.department.update({ where: { id: cairoSphinxDept.id }, data: { managerId: cairoSphinxManager.id } })
            : Promise.resolve(),
    ]);

    const secretaryPass = await bcrypt.hash('Secretary@123', 12);
    const [alexSecretary, cairoSecretary] = await Promise.all([
        prisma.user.upsert({
            where: { email: 'alex.secretary@sphinx.com' },
            update: {},
            create: {
                employeeNumber: 'EMP-0007',
                fullName: 'Mona Alexandria Secretary',
                fullNameAr: 'Mona Alexandria Secretary',
                email: 'alex.secretary@sphinx.com',
                phone: '+201000000007',
                passwordHash: secretaryPass,
                role: 'BRANCH_SECRETARY',
                governorate: 'ALEXANDRIA',
                departmentId: alexSphinxDept?.id,
                jobTitle: 'Branch Secretary',
                jobTitleAr: 'Branch Secretary',
                mustChangePass: false,
                isActive: true,
            },
        }),
        prisma.user.upsert({
            where: { email: 'cairo.secretary@sphinx.com' },
            update: {},
            create: {
                employeeNumber: 'EMP-0008',
                fullName: 'Rania Cairo Secretary',
                fullNameAr: 'Rania Cairo Secretary',
                email: 'cairo.secretary@sphinx.com',
                phone: '+201000000008',
                passwordHash: secretaryPass,
                role: 'BRANCH_SECRETARY',
                governorate: 'CAIRO',
                departmentId: cairoSphinxDept?.id,
                jobTitle: 'Branch Secretary',
                jobTitleAr: 'Branch Secretary',
                mustChangePass: false,
                isActive: true,
            },
        }),
    ]);

    const supportPass = await bcrypt.hash('Support@123', 12);
    const supportUser = await prisma.user.upsert({
        where: { email: 'support@sphinx.com' },
        update: {},
        create: {
            employeeNumber: 'EMP-0009',
            fullName: 'Support Agent',
            fullNameAr: 'Support Agent',
            email: 'support@sphinx.com',
            phone: '+201000000009',
            passwordHash: supportPass,
            role: 'SUPPORT',
            governorate: 'CAIRO',
            departmentId: cairoSphinxDept?.id,
            jobTitle: 'Support Agent',
            jobTitleAr: 'Support Agent',
            mustChangePass: false,
            isActive: true,
        },
    });

    const empPass = await bcrypt.hash('Emp@123456', 12);
    const employee = await prisma.user.upsert({
        where: { email: 'employee@sphinx.com' },
        update: {},
        create: {
            employeeNumber: 'EMP-0010',
            fullName: 'Mohammed Ali',
            fullNameAr: 'Mohammed Ali',
            email: 'employee@sphinx.com',
            phone: '+201000000010',
            passwordHash: empPass,
            role: 'EMPLOYEE',
            governorate: 'ALEXANDRIA',
            departmentId: alexErcDept?.id,
            jobTitle: 'ERC Specialist',
            jobTitleAr: 'ERC Specialist',
            mustChangePass: false,
            isActive: true,
        },
    });

    const employee2 = await prisma.user.upsert({
        where: { email: 'employee.cairo@sphinx.com' },
        update: {},
        create: {
            employeeNumber: 'EMP-0011',
            fullName: 'Sara Ibrahim',
            fullNameAr: 'Sara Ibrahim',
            email: 'employee.cairo@sphinx.com',
            phone: '+201000000011',
            passwordHash: empPass,
            role: 'EMPLOYEE',
            governorate: 'CAIRO',
            departmentId: cairoSphinxDept?.id,
            jobTitle: 'SPHINX Specialist',
            jobTitleAr: 'SPHINX Specialist',
            mustChangePass: false,
            isActive: true,
        },
    });

    console.log('Created users: superadmin, hradmin, managers, secretaries, support, employees');

    const year = new Date().getFullYear();
    const allUsers = [
        superAdmin,
        hrAdmin,
        alexErcManager,
        alexSphinxManager,
        cairoErcManager,
        cairoSphinxManager,
        alexSecretary,
        cairoSecretary,
        supportUser,
        employee,
        employee2,
    ];

    for (const user of allUsers) {
        for (const [leaveType, days] of [
            ['ANNUAL', 21],
            ['CASUAL', 7],
            ['EMERGENCY', 3],
            ['MISSION', 10],
        ] as const) {
            await prisma.leaveBalance.upsert({
                where: { userId_year_leaveType: { userId: user.id, year, leaveType } },
                update: {},
                create: {
                    userId: user.id,
                    year,
                    leaveType,
                    totalDays: days,
                    usedDays: 0,
                    remainingDays: days,
                },
            });
        }
    }

    console.log('Created leave balances');

    await prisma.dynamicForm.upsert({
        where: { id: 'form-commission-request' },
        update: {},
        create: {
            id: 'form-commission-request',
            name: 'Commission Request',
            nameAr: 'Commission Request',
            description: 'Request for sales commission',
            descriptionAr: 'Request for sales commission',
            departmentId: cairoSphinxDept?.id,
            requiresManager: true,
            requiresHr: true,
            fields: {
                create: [
                    { label: 'Client Name', labelAr: 'Client Name', fieldType: 'TEXT', isRequired: true, order: 0 },
                    { label: 'Sale Amount', labelAr: 'Sale Amount', fieldType: 'NUMBER', isRequired: true, order: 1 },
                    { label: 'Commission Rate (%)', labelAr: 'Commission Rate (%)', fieldType: 'NUMBER', isRequired: true, order: 2 },
                    { label: 'Sale Date', labelAr: 'Sale Date', fieldType: 'DATE', isRequired: true, order: 3 },
                    { label: 'Notes', labelAr: 'Notes', fieldType: 'TEXTAREA', isRequired: false, order: 4 },
                ],
            },
        },
    });

    await prisma.dynamicForm.upsert({
        where: { id: 'form-purchase-request' },
        update: {},
        create: {
            id: 'form-purchase-request',
            name: 'Purchase Request',
            nameAr: 'Purchase Request',
            description: 'Request for purchasing items',
            descriptionAr: 'Request for purchasing items',
            departmentId: cairoErcDept?.id,
            requiresManager: true,
            requiresHr: true,
            fields: {
                create: [
                    { label: 'Item Name', labelAr: 'Item Name', fieldType: 'TEXT', isRequired: true, order: 0 },
                    { label: 'Quantity', labelAr: 'Quantity', fieldType: 'NUMBER', isRequired: true, order: 1 },
                    { label: 'Estimated Cost', labelAr: 'Estimated Cost', fieldType: 'NUMBER', isRequired: true, order: 2 },
                    { label: 'Supplier', labelAr: 'Supplier', fieldType: 'TEXT', isRequired: false, order: 3 },
                    { label: 'Priority', labelAr: 'Priority', fieldType: 'SELECT', isRequired: true, options: ['Low', 'Medium', 'High', 'Urgent'], order: 4 },
                    { label: 'Justification', labelAr: 'Justification', fieldType: 'TEXTAREA', isRequired: true, order: 5 },
                ],
            },
        },
    });

    console.log('Database seeded successfully!');
    console.log('Default login credentials:');
    console.log('  Super Admin:  superadmin@sphinx.com / Admin@123456');
    console.log('  HR Admin:     hradmin@sphinx.com    / HrAdmin@123');
    console.log('  Manager:      erc.alex.manager@sphinx.com / Manager@123');
    console.log('  Secretary:    alex.secretary@sphinx.com / Secretary@123');
    console.log('  Support:      support@sphinx.com    / Support@123');
    console.log('  Employee:     employee@sphinx.com   / Emp@123456');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
