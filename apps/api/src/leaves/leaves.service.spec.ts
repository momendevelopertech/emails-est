import { LeavesService } from './leaves.service';

describe('LeavesService', () => {
    const prisma = {
        $transaction: jest.fn(),
        leaveRequest: {
            findUnique: jest.fn(),
            delete: jest.fn(),
        },
        leaveBalance: {
            update: jest.fn(),
        },
        user: {
            findUnique: jest.fn(),
            findMany: jest.fn(),
        },
    };
    const notificationsService = {
        emitRealtimeToUsers: jest.fn(),
    };
    const auditService = {
        log: jest.fn(),
    };

    let service: LeavesService;

    beforeEach(() => {
        jest.clearAllMocks();
        prisma.$transaction.mockImplementation(async (callback: any) => callback({
            leaveBalance: prisma.leaveBalance,
            leaveRequest: prisma.leaveRequest,
        }));
        prisma.leaveRequest.delete.mockResolvedValue({});
        prisma.leaveBalance.update.mockResolvedValue({});
        prisma.user.findMany.mockResolvedValue([]);
        prisma.user.findUnique.mockResolvedValue({ workflowMode: 'SANDBOX' });
        notificationsService.emitRealtimeToUsers.mockResolvedValue(undefined);
        auditService.log.mockResolvedValue(undefined);

        service = new LeavesService(prisma as any, notificationsService as any, auditService as any);
    });

    it('allows a sandbox employee to delete an approved leave request and restores the balance', async () => {
        prisma.leaveRequest.findUnique.mockResolvedValue({
            id: 'leave-1',
            userId: 'user-1',
            leaveType: 'ANNUAL',
            startDate: new Date('2026-04-14T00:00:00.000Z'),
            totalDays: 2,
            status: 'HR_APPROVED',
            user: {
                governorate: null,
                departmentId: null,
            },
        });

        const result = await service.deleteRequest('leave-1', 'user-1', 'EMPLOYEE');

        expect(prisma.$transaction).toHaveBeenCalled();
        expect(prisma.leaveBalance.update).toHaveBeenCalledWith({
            where: {
                userId_year_leaveType: {
                    userId: 'user-1',
                    year: 2026,
                    leaveType: 'ANNUAL',
                },
            },
            data: {
                usedDays: { decrement: 2 },
                remainingDays: { increment: 2 },
            },
        });
        expect(prisma.leaveRequest.delete).toHaveBeenCalledWith({ where: { id: 'leave-1' } });
        expect(notificationsService.emitRealtimeToUsers).toHaveBeenCalledWith(
            ['user-1'],
            expect.objectContaining({
                type: 'REQUEST_UPDATED',
                requestType: 'leave',
                requestId: 'leave-1',
            }),
        );
        expect(result).toEqual({ message: 'Deleted' });
    });
});
