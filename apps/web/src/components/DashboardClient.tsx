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
    const [announcement, setAnnouncement] = useState({ title: '', body: '' });
    const [sendingAnnouncement, setSendingAnnouncement] = useState(false);
    const [sendingPayroll, setSendingPayroll] = useState(false);
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

    const canBroadcast = user?.role === 'HR_ADMIN' || user?.role === 'SUPER_ADMIN';

    const sendAnnouncement = async () => {
        if (!announcement.title.trim() || !announcement.body.trim()) return;
        setSendingAnnouncement(true);
        try {
            await api.post('/notifications/announcement', {
                title: announcement.title.trim(),
                titleAr: announcement.title.trim(),
                body: announcement.body.trim(),
                bodyAr: announcement.body.trim(),
            });
            setAnnouncement({ title: '', body: '' });
            alert(locale === 'ar' ? 'تم إرسال الإعلان' : 'Announcement sent');
        } finally {
            setSendingAnnouncement(false);
        }
    };

    const triggerPayroll = async () => {
        setSendingPayroll(true);
        try {
            await api.post('/notifications/payroll');
            alert(locale === 'ar' ? 'تم صرف الرواتب' : 'Payroll notification sent');
        } finally {
            setSendingPayroll(false);
        }
    };

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
            {canBroadcast && (
                <div className="px-6 mt-6">
                    <section className="card p-5 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <p className="text-sm uppercase tracking-[0.2em] text-ink/50">{t('announcementTitle')}</p>
                                <p className="text-sm text-ink/70">{t('announcementBody')}</p>
                            </div>
                            <div className="text-sm uppercase tracking-[0.2em] text-ink/50">{t('payrollTitle')}</div>
                        </div>
                        <div className="grid gap-3 md:grid-cols-3">
                            <input
                                className="rounded-xl border border-ink/20 bg-white px-3 py-2 md:col-span-1"
                                placeholder={locale === 'ar' ? 'عنوان الإعلان' : 'Announcement title'}
                                value={announcement.title}
                                onChange={(e) => setAnnouncement((prev) => ({ ...prev, title: e.target.value }))}
                            />
                            <input
                                className="rounded-xl border border-ink/20 bg-white px-3 py-2 md:col-span-2"
                                placeholder={locale === 'ar' ? 'نص الإعلان' : 'Announcement message'}
                                value={announcement.body}
                                onChange={(e) => setAnnouncement((prev) => ({ ...prev, body: e.target.value }))}
                            />
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button className="btn-primary" onClick={sendAnnouncement} disabled={sendingAnnouncement}>
                                {sendingAnnouncement ? (locale === 'ar' ? 'جارٍ الإرسال...' : 'Sending...') : t('sendAnnouncement')}
                            </button>
                            <button className="btn-outline" onClick={triggerPayroll} disabled={sendingPayroll}>
                                {sendingPayroll ? (locale === 'ar' ? 'جارٍ الصرف...' : 'Processing...') : t('payrollButton')}
                            </button>
                        </div>
                    </section>
                </div>
            )}
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
