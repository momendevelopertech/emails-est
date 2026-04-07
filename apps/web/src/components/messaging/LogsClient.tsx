'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useTranslations } from 'next-intl';
import api from '@/lib/api';

const statusStyles: Record<string, string> = {
    PENDING: 'bg-slate-100 text-slate-700',
    PROCESSING: 'bg-blue-100 text-blue-800',
    SENT: 'bg-emerald-100 text-emerald-800',
    FAILED: 'bg-rose-100 text-rose-800',
};

export default function LogsClient({ locale }: { locale: string }) {
    const t = useTranslations('messaging');

    const { data, error, isLoading } = useQuery<any, Error>({
        queryKey: ['messaging-logs'],
        queryFn: async () => {
            const response = await api.get('/messaging/logs', { params: { limit: 100 } });
            return response.data;
        },
    });

    useEffect(() => {
        if (error) {
            toast.error(t('logsLoadError') || 'Unable to load logs.');
        }
    }, [error, t]);

    const rows = (data as any)?.items ?? [];

    return (
        <section className="space-y-6 py-6">
            <div>
                <h1 className="text-3xl font-semibold">{t('logsTitle') || 'Logs'}</h1>
                <p className="mt-2 text-sm text-slate-500">{t('logsSubtitle') || 'Delivery history and error details.'}</p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                        <thead className="bg-slate-50 text-slate-700">
                            <tr>
                                <th className="px-4 py-3">{t('recipient') || 'Recipient'}</th>
                                <th className="px-4 py-3">{t('status') || 'Status'}</th>
                                <th className="px-4 py-3">{t('error') || 'Error'}</th>
                                <th className="px-4 py-3">{t('createdAt') || 'Created At'}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                                        {t('loading') || 'Loading logs...'}
                                    </td>
                                </tr>
                            ) : rows.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                                        {t('logsEmpty') || 'No logs yet.'}
                                    </td>
                                </tr>
                            ) : (
                                rows.map((log: any) => (
                                    <tr key={log.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-4 text-slate-900">{log.recipient?.name || log.recipientId}</td>
                                        <td className="px-4 py-4">
                                            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[log.status] || 'bg-slate-100 text-slate-700'}`}>
                                                {log.status?.toLowerCase() || 'unknown'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-rose-700">{log.error || '-'}</td>
                                        <td className="px-4 py-4 text-slate-700">{new Date(log.created_at).toLocaleString()}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
    );
}
