'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import { getSocket } from '@/lib/socket';
import StatsGrid from './StatsGrid';
import CalendarView from './CalendarView';
import RequestModal from './RequestModal';
import NotificationsPanel from './NotificationsPanel';
import ChangePasswordModal from './ChangePasswordModal';
import { useRequireAuth } from '@/lib/use-auth';
import { useTranslations } from 'next-intl';
import { enumLabels } from '@/lib/enum-labels';
import PageLoader from './PageLoader';

type LeaveRequest = {
    id: string;
    leaveType: string;
    startDate: string;
    endDate: string;
    status: string;
    user: { fullName: string };
};

type PermissionRequest = {
    id: string;
    permissionType: string;
    requestDate: string;
    status: string;
    user: { fullName: string };
};

type FormSubmission = {
    id: string;
    createdAt: string;
    status: string;
    form: { name: string };
    user: { fullName: string };
};

export default function DashboardClient({ locale }: { locale: 'en' | 'ar' }) {
    const t = useTranslations('dashboard');
    const { user, ready } = useRequireAuth(locale);
    const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
    const [permissions, setPermissions] = useState<PermissionRequest[]>([]);
    const [forms, setForms] = useState<FormSubmission[]>([]);
    const [balances, setBalances] = useState<any[]>([]);
    const [permissionCycle, setPermissionCycle] = useState<any | null>(null);
    const [absenceDeduction, setAbsenceDeduction] = useState<any | null>(null);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const [leaveBalances, leaveReqs, permissionReqs, formSubs, cycle, absence, unread] = await Promise.all([
                api.get('/leaves/balances'),
                api.get('/leaves'),
                api.get('/permissions'),
                api.get('/forms/submissions'),
                api.get('/permissions/cycle'),
                api.get('/leaves/absence-deductions'),
                api.get('/notifications/unread'),
            ]);
            setBalances(leaveBalances.data);
            setLeaves(leaveReqs.data);
            setPermissions(permissionReqs.data);
            setForms(formSubs.data);
            setPermissionCycle(cycle.data);
            setAbsenceDeduction(absence.data);
            setNotifications(unread.data);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!ready) return;
        fetchAll();
    }, [ready, fetchAll]);

    useEffect(() => {
        if (!user) return;
        const socket = getSocket();
        socket.emit('join', user.id);
        socket.on('notification', () => fetchAll());
        return () => {
            socket.off('notification');
        };
    }, [user?.id, fetchAll, user]);

    const stats = useMemo(() => {
        const annual = balances.find((b) => b.leaveType === 'ANNUAL');
        const totalRemaining = annual?.remainingDays ?? 0;
        const usedPermissions = permissionCycle?.usedHours ?? 0;
        const pending = [...leaves, ...permissions, ...forms].filter((r) => r.status === 'PENDING').length;
        return [
            { label: 'leaveBalance', value: `${totalRemaining} ${t('days')}` },
            { label: 'permissionUsed', value: `${usedPermissions}h` },
            { label: 'permissionRemaining', value: `${permissionCycle?.remainingHours ?? 4}h` },
            { label: 'pendingApprovals', value: `${pending}` },
            { label: 'absenceDeduction', value: `${absenceDeduction?.deductedDays ?? 0} ${t('days')}` },
        ];
    }, [absenceDeduction?.deductedDays, balances, leaves, permissions, forms, permissionCycle?.remainingHours, permissionCycle?.usedHours, t]);

    const events = useMemo(() => {
        const leaveEvents = leaves.map((leave) => {
            let key = 'leave';
            if (leave.leaveType === 'ABSENCE_WITH_PERMISSION') key = 'absence';
            if (leave.leaveType === 'MISSION') key = 'mission';

            return {
                title: `${leave.user.fullName} - ${enumLabels.leaveType(leave.leaveType, locale)}`,
                start: new Date(leave.startDate),
                end: new Date(leave.endDate),
                allDay: true,
                resource: { key },
            };
        });

        const permissionEvents = permissions.map((permission) => ({
            title: `${permission.user.fullName} - ${enumLabels.permissionType(permission.permissionType, locale)}`,
            start: new Date(permission.requestDate),
            end: new Date(permission.requestDate),
            allDay: true,
            resource: { key: permission.permissionType === 'PERSONAL' ? 'personal' : 'permission' },
        }));

        const formEvents = forms.map((submission) => ({
            title: `${submission.user.fullName} - ${submission.form.name}`,
            start: new Date(submission.createdAt),
            end: new Date(submission.createdAt),
            allDay: true,
            resource: { key: 'form' },
        }));

        return [...leaveEvents, ...permissionEvents, ...formEvents];
    }, [forms, leaves, locale, permissions]);

    if (!ready || loading) {
        return <PageLoader text={locale === 'ar' ? 'جاري تحميل لوحة التحكم...' : 'Loading dashboard...'} />;
    }

    return (
        <main className="pb-12">
            <StatsGrid stats={stats} />
            <div className="px-6 mt-6">
                <CalendarView locale={locale} events={events} onSelectSlot={(d) => setSelectedDate(d)} />
            </div>
            <div className="px-6 mt-6">
                <NotificationsPanel items={notifications} locale={locale} />
            </div>
            <RequestModal
                open={!!selectedDate}
                date={selectedDate}
                locale={locale}
                onClose={() => setSelectedDate(null)}
                onSubmitted={fetchAll}
            />
            <ChangePasswordModal />
        </main>
    );
}
