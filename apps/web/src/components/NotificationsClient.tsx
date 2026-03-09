'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import api from '@/lib/api';
import { useRequireAuth } from '@/lib/use-auth';
import PageLoader from './PageLoader';

type NotificationItem = {
    id: string;
    title: string;
    type: string;
    createdAt: string;
    isRead: boolean;
};

type NotificationsResponse = {
    items: NotificationItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
};

const notificationTypes = ['LEAVE_REQUEST', 'LEAVE_APPROVED', 'LEAVE_REJECTED', 'PERMISSION_REQUEST', 'PERMISSION_APPROVED', 'PERMISSION_REJECTED', 'FORM_SUBMISSION', 'FORM_APPROVED', 'FORM_REJECTED', 'ANNOUNCEMENT'] as const;

export default function NotificationsClient({ locale }: { locale: string }) {
    const t = useTranslations('notifications');
    const { ready } = useRequireAuth(locale);
    const [items, setItems] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(20);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [filters, setFilters] = useState<any>({ type: '', status: '', search: '', from: '', to: '' });

    const params = useMemo(() => ({
        page,
        limit,
        ...(filters.type ? { type: filters.type } : {}),
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.search ? { search: filters.search } : {}),
        ...(filters.from ? { from: filters.from } : {}),
        ...(filters.to ? { to: filters.to } : {}),
    }), [filters.from, filters.search, filters.status, filters.to, filters.type, limit, page]);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get<NotificationsResponse>('/notifications', { params });
            setItems(res.data.items || []);
            setTotal(res.data.total || 0);
            setTotalPages(res.data.totalPages || 1);
        } finally {
            setLoading(false);
        }
    }, [params]);

    useEffect(() => {
        if (!ready) return;
        fetchAll();
    }, [ready, fetchAll]);

    const markAll = async () => {
        await api.patch('/notifications/read-all');
        fetchAll();
    };

    const dateLocale = locale === 'ar' ? 'ar-EG' : 'en-US';

    if (!ready || loading) {
        return <PageLoader text={locale === 'ar' ? 'جاري تحميل الإشعارات...' : 'Loading notifications...'} />;
    }

    return (
        <main className="px-4 pb-12 sm:px-6">
            <section className="card p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold">{t('title')}</h2>
                    <button className="btn-outline" onClick={markAll}>{t('markAllRead')}</button>
                </div>

                <div className="mt-4 grid gap-2 md:grid-cols-3 xl:grid-cols-6">
                    <input className="rounded-xl border border-ink/20 bg-white px-3 py-2" placeholder={locale === 'ar' ? 'بحث' : 'Search'} value={filters.search} onChange={(e) => { setPage(1); setFilters((p: any) => ({ ...p, search: e.target.value })); }} />
                    <select className="rounded-xl border border-ink/20 bg-white px-3 py-2" value={filters.type} onChange={(e) => { setPage(1); setFilters((p: any) => ({ ...p, type: e.target.value })); }}>
                        <option value="">Type</option>
                        {notificationTypes.map((type) => (
                            <option key={type} value={type}>{type}</option>
                        ))}
                    </select>
                    <select className="rounded-xl border border-ink/20 bg-white px-3 py-2" value={filters.status} onChange={(e) => { setPage(1); setFilters((p: any) => ({ ...p, status: e.target.value })); }}>
                        <option value="">Status</option>
                        <option value="read">Read</option>
                        <option value="unread">Unread</option>
                    </select>
                    <input type="date" className="rounded-xl border border-ink/20 bg-white px-3 py-2" value={filters.from} onChange={(e) => { setPage(1); setFilters((p: any) => ({ ...p, from: e.target.value })); }} />
                    <input type="date" className="rounded-xl border border-ink/20 bg-white px-3 py-2" value={filters.to} onChange={(e) => { setPage(1); setFilters((p: any) => ({ ...p, to: e.target.value })); }} />
                    <label className="text-sm">
                        Rows per page:
                        <select className="ms-2 rounded-lg border border-ink/20 px-2 py-1" value={limit} onChange={(e) => { setPage(1); setLimit(parseInt(e.target.value, 10)); }}>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                    </label>
                </div>

                <div className="mt-4 overflow-x-auto">
                    <table className="min-w-[760px] w-full text-sm">
                        <thead>
                            <tr className="border-b border-ink/10 text-left">
                                <th className="py-2">Title</th>
                                <th className="py-2">Type</th>
                                <th className="py-2">Date</th>
                                <th className="py-2">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item) => (
                                <tr key={item.id} className="border-b border-ink/5">
                                    <td className="py-2">{item.title}</td>
                                    <td className="py-2">{item.type}</td>
                                    <td className="py-2">{new Date(item.createdAt).toLocaleString(dateLocale)}</td>
                                    <td className="py-2">{item.isRead ? 'Read' : 'Unread'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="mt-4 flex items-center justify-between">
                    <p className="text-sm text-ink/60">{total} records</p>
                    <div className="flex items-center gap-2">
                        <button className="btn-outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
                        <p className="text-sm">Page {page} / {totalPages}</p>
                        <button className="btn-outline" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
                    </div>
                </div>
            </section>
        </main>
    );
}
