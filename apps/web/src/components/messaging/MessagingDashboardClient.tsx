'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import DraggableTableScrollArea from './DraggableTableScrollArea';

const statusStyles: Record<string, string> = {
    PENDING: 'bg-slate-100 text-slate-700',
    PROCESSING: 'bg-blue-100 text-blue-800',
    SENT: 'bg-emerald-100 text-emerald-800',
    FAILED: 'bg-rose-100 text-rose-800',
};

const DELIVERY_LINE_REGEX = /^(Email|WhatsApp):\s*(SENT|FAILED|SKIPPED)(?:\s*-\s*(.+))?$/i;

const getFailureDetails = (value?: string | null) => {
    const lines = String(value || '')
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

    if (!lines.length) {
        return [];
    }

    const parsed = lines
        .map((line) => {
            const match = line.match(DELIVERY_LINE_REGEX);
            if (!match) {
                return null;
            }

            if (match[2].toUpperCase() !== 'FAILED') {
                return null;
            }

            return `${match[1]}: ${match[3]?.trim() || 'Unknown error'}`;
        })
        .filter(Boolean) as string[];

    if (parsed.length) {
        return parsed;
    }

    const hasStructuredDelivery = lines.some((line) => DELIVERY_LINE_REGEX.test(line));
    return hasStructuredDelivery ? [] : [String(value || '').trim()].filter(Boolean);
};

export default function MessagingDashboardClient({ locale }: { locale: string }) {
    const t = useTranslations('messaging');

    const {
        data,
        isLoading,
        error,
        refetch,
    } = useQuery({
        queryKey: ['messaging-recipients'],
        queryFn: async () => {
            const response = await api.get('/messaging/recipients', { params: { page: 1, limit: 20 } });
            return response.data;
        },
    });

    useEffect(() => {
        if (error) {
            toast.error(t('dashboardLoadError') || 'Unable to load recipients.');
        }
    }, [error, t]);

    const rows = data?.items ?? [];

    return (
        <section className="space-y-6 py-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-3xl font-semibold">{t('dashboardTitle') || 'Messaging Dashboard'}</h1>
                    <p className="text-sm text-slate-500">{t('dashboardSubtitle') || 'Review recipients and delivery status.'}</p>
                </div>
                <button className="btn-outline" type="button" onClick={() => refetch()} disabled={isLoading}>
                    {t('refresh') || 'Refresh'}
                </button>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
                <DraggableTableScrollArea className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                        <thead className="bg-slate-50 text-slate-700">
                            <tr>
                                <th className="px-4 py-3">{t('name') || 'Name'}</th>
                                <th className="px-4 py-3">{t('status') || 'Status'}</th>
                                <th className="px-4 py-3">{t('attempts') || 'Attempts'}</th>
                                <th className="px-4 py-3">{t('lastAttempt') || 'Last Attempt'}</th>
                                <th className="px-4 py-3">{t('error') || 'Error'}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                                        {t('loading') || 'Loading recipients...'}
                                    </td>
                                </tr>
                            ) : rows.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                                        {t('dashboardEmpty') || 'No recipients yet.'}
                                    </td>
                                </tr>
                            ) : (
                                rows.map((recipient: any) => {
                                    const failureDetails = getFailureDetails(recipient.error_message);

                                    return (
                                        <tr key={recipient.id} className="hover:bg-slate-50">
                                            <td className="px-4 py-4 text-sm text-slate-900">{recipient.name || '-'}</td>
                                            <td className="px-4 py-4">
                                                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[recipient.status] || 'bg-slate-100 text-slate-700'}`}>
                                                    {recipient.status?.toLowerCase() || 'pending'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 text-slate-700">{recipient.attempts_count ?? 0}</td>
                                            <td className="px-4 py-4 text-slate-700">{recipient.last_attempt_at ? new Date(recipient.last_attempt_at).toLocaleString() : '-'}</td>
                                            <td className={`px-4 py-4 ${failureDetails.length ? 'text-rose-700' : 'text-slate-500'}`}>
                                                {failureDetails.length ? failureDetails.join(' | ') : '-'}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </DraggableTableScrollArea>
            </div>
        </section>
    );
}
