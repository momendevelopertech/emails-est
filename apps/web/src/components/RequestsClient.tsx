'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import api from '@/lib/api';
import { useRequireAuth } from '@/lib/use-auth';
import { enumLabels } from '@/lib/enum-labels';
import PageLoader from './PageLoader';

type LeaveRequest = {
    id: string;
    leaveType: string;
    startDate: string;
    endDate: string;
    status: string;
    user: { fullName: string; employeeNumber: string };
};

type PermissionRequest = {
    id: string;
    permissionType: string;
    requestDate: string;
    hoursUsed: number;
    status: string;
    user: { fullName: string; employeeNumber: string };
};

type FormSubmission = {
    id: string;
    status: string;
    createdAt: string;
    form: { name: string };
    user: { fullName: string; employeeNumber: string };
};

export default function RequestsClient({ locale }: { locale: string }) {
    const t = useTranslations('requestsPage');
    const { user, ready } = useRequireAuth(locale);
    const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
    const [permissions, setPermissions] = useState<PermissionRequest[]>([]);
    const [forms, setForms] = useState<FormSubmission[]>([]);
    const [loading, setLoading] = useState(true);

    const dateLocale = useMemo(() => (locale === 'ar' ? 'ar-EG' : 'en-US'), [locale]);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [leaveReqs, permissionReqs, formSubs] = await Promise.all([
                api.get('/leaves'),
                api.get('/permissions'),
                api.get('/forms/submissions'),
            ]);
            setLeaves(leaveReqs.data);
            setPermissions(permissionReqs.data);
            setForms(formSubs.data);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!ready) return;
        fetchAll();
    }, [ready]);

    const canManage = user?.role === 'HR_ADMIN' || user?.role === 'SUPER_ADMIN' || user?.role === 'MANAGER';
    const canAdmin = user?.role === 'HR_ADMIN' || user?.role === 'SUPER_ADMIN';

    const approveLeave = (id: string) => api.patch(`/leaves/${id}/approve`).then(fetchAll);
    const rejectLeave = (id: string) => api.patch(`/leaves/${id}/reject`).then(fetchAll);
    const cancelLeave = (id: string) => api.patch(`/leaves/${id}/cancel`).then(fetchAll);
    const deleteLeave = (id: string) => api.delete(`/leaves/${id}`).then(fetchAll);

    const approvePermission = (id: string) => api.patch(`/permissions/${id}/approve`).then(fetchAll);
    const rejectPermission = (id: string) => api.patch(`/permissions/${id}/reject`).then(fetchAll);
    const cancelPermission = (id: string) => api.patch(`/permissions/${id}/cancel`).then(fetchAll);
    const deletePermission = (id: string) => api.delete(`/permissions/${id}`).then(fetchAll);

    const approveForm = (id: string) => api.patch(`/forms/submissions/${id}/approve`).then(fetchAll);
    const rejectForm = (id: string) => api.patch(`/forms/submissions/${id}/reject`).then(fetchAll);
    const cancelForm = (id: string) => api.patch(`/forms/submissions/${id}/cancel`).then(fetchAll);
    const deleteForm = (id: string) => api.delete(`/forms/submissions/${id}`).then(fetchAll);

    if (!ready || loading) {
        return <PageLoader text={locale === 'ar' ? 'جاري تحميل الطلبات...' : 'Loading requests...'} />;
    }

    return (
        <main className="px-6 pb-12 space-y-6">
            <section className="card p-5">
                <h2 className="text-lg font-semibold">{t('leaveRequests')}</h2>
                <div className="mt-4 space-y-3">
                    {leaves.map((leave) => (
                        <div key={leave.id} className="rounded-xl border border-ink/10 bg-white/70 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <p className="font-semibold">{leave.user.fullName} • {enumLabels.leaveType(leave.leaveType, locale as 'en' | 'ar')}</p>
                                    <p className="text-xs text-ink/60">
                                        {new Date(leave.startDate).toLocaleDateString(dateLocale)} ? {new Date(leave.endDate).toLocaleDateString(dateLocale)}
                                    </p>
                                </div>
                                <span className="pill bg-ink/10 text-ink">{enumLabels.status(leave.status, locale as 'en' | 'ar')}</span>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <a className="btn-outline" href={`${process.env.NEXT_PUBLIC_API_URL}/pdf/leave/${leave.id}`} target="_blank" rel="noreferrer noopener">{t('printPdf')}</a>
                                {leave.status === 'PENDING' && <button className="btn-outline" onClick={() => cancelLeave(leave.id)}>{t('cancel')}</button>}
                                {canManage && (
                                    <>
                                        <button className="btn-primary" onClick={() => approveLeave(leave.id)}>{t('approve')}</button>
                                        <button className="btn-secondary" onClick={() => rejectLeave(leave.id)}>{t('reject')}</button>
                                    </>
                                )}
                                {canAdmin && <button className="btn-outline" onClick={() => deleteLeave(leave.id)}>{t('delete')}</button>}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section className="card p-5">
                <h2 className="text-lg font-semibold">{t('permissionRequests')}</h2>
                <div className="mt-4 space-y-3">
                    {permissions.map((perm) => (
                        <div key={perm.id} className="rounded-xl border border-ink/10 bg-white/70 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <p className="font-semibold">{perm.user.fullName} • {enumLabels.permissionType(perm.permissionType, locale as 'en' | 'ar')}</p>
                                    <p className="text-xs text-ink/60">{new Date(perm.requestDate).toLocaleDateString(dateLocale)}</p>
                                </div>
                                <span className="pill bg-ink/10 text-ink">{enumLabels.status(perm.status, locale as 'en' | 'ar')}</span>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <a className="btn-outline" href={`${process.env.NEXT_PUBLIC_API_URL}/pdf/permission/${perm.id}`} target="_blank" rel="noreferrer noopener">{t('printPdf')}</a>
                                {perm.status === 'PENDING' && <button className="btn-outline" onClick={() => cancelPermission(perm.id)}>{t('cancel')}</button>}
                                {canManage && (
                                    <>
                                        <button className="btn-primary" onClick={() => approvePermission(perm.id)}>{t('approve')}</button>
                                        <button className="btn-secondary" onClick={() => rejectPermission(perm.id)}>{t('reject')}</button>
                                    </>
                                )}
                                {canAdmin && <button className="btn-outline" onClick={() => deletePermission(perm.id)}>{t('delete')}</button>}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section className="card p-5">
                <h2 className="text-lg font-semibold">{t('formSubmissions')}</h2>
                <div className="mt-4 space-y-3">
                    {forms.map((form) => (
                        <div key={form.id} className="rounded-xl border border-ink/10 bg-white/70 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <p className="font-semibold">{form.user.fullName} • {form.form.name}</p>
                                    <p className="text-xs text-ink/60">{new Date(form.createdAt).toLocaleDateString(dateLocale)}</p>
                                </div>
                                <span className="pill bg-ink/10 text-ink">{enumLabels.status(form.status, locale as 'en' | 'ar')}</span>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <a className="btn-outline" href={`${process.env.NEXT_PUBLIC_API_URL}/pdf/form/${form.id}`} target="_blank" rel="noreferrer noopener">{t('printPdf')}</a>
                                {form.status === 'PENDING' && <button className="btn-outline" onClick={() => cancelForm(form.id)}>{t('cancel')}</button>}
                                {canManage && (
                                    <>
                                        <button className="btn-primary" onClick={() => approveForm(form.id)}>{t('approve')}</button>
                                        <button className="btn-secondary" onClick={() => rejectForm(form.id)}>{t('reject')}</button>
                                    </>
                                )}
                                {canAdmin && <button className="btn-outline" onClick={() => deleteForm(form.id)}>{t('delete')}</button>}
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </main>
    );
}

