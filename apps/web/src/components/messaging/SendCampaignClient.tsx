'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useTranslations } from 'next-intl';
import api from '@/lib/api';

const statusOptions = ['pending', 'processing', 'sent', 'failed'];

export default function SendCampaignClient({ locale }: { locale: string }) {
    const t = useTranslations('messaging');
    const [templateId, setTemplateId] = useState('');
    const [examType, setExamType] = useState('');
    const [role, setRole] = useState('');
    const [day, setDay] = useState('');
    const [status, setStatus] = useState('');
    const [selectedIds, setSelectedIds] = useState('');

    const { data: templates } = useQuery({
        queryKey: ['messaging-templates'],
        queryFn: async () => {
            const response = await api.get('/messaging/templates');
            return response.data;
        },
    });

    const sendMutation = useMutation({
        mutationFn: async (payload: any) => {
            const response = await api.post('/messaging/send', payload);
            return response.data;
        },
        onSuccess(data) {
            toast.success(`${data.processed} ${t('sentSuccess') || 'recipients processed successfully.'}`);
        },
        onError() {
            toast.error(t('sendError') || 'Unable to send campaign.');
        },
    });

    const retryMutation = useMutation({
        mutationFn: async (payload: any) => {
            const response = await api.post('/messaging/retry', payload);
            return response.data;
        },
        onSuccess(data) {
            toast.success(`${data.processed} ${t('retrySuccess') || 'retry attempts completed.'}`);
        },
        onError() {
            toast.error(t('retryError') || 'Unable to retry recipients.');
        },
    });

    const selectedTemplate = useMemo(
        () => templates?.find((item: any) => item.id === templateId) ?? null,
        [templateId, templates],
    );

    const hasTemplate = Boolean(templateId);

    const buildFilter = () => {
        const filter: any = {};
        if (examType) filter.exam_type = examType;
        if (role) filter.role = role;
        if (day) filter.day = day;
        if (status) filter.status = status.toUpperCase();
        return filter;
    };

    const sendAllPending = () => {
        if (!hasTemplate) return toast.error(t('selectTemplateError') || 'Please select a template.');
        sendMutation.mutate({ templateId, mode: 'all_pending' });
    };

    const sendFiltered = () => {
        if (!hasTemplate) return toast.error(t('selectTemplateError') || 'Please select a template.');
        const filter = buildFilter();
        sendMutation.mutate({ templateId, mode: 'filtered', filter });
    };

    const retryFailed = () => {
        if (!hasTemplate) return toast.error(t('selectTemplateError') || 'Please select a template.');
        retryMutation.mutate({ templateId });
    };

    const retrySelected = () => {
        if (!hasTemplate) return toast.error(t('selectTemplateError') || 'Please select a template.');
        const ids = selectedIds
            .split(/[,\s]+/)
            .map((item) => item.trim())
            .filter(Boolean);
        if (!ids.length) return toast.error(t('selectIdsError') || 'Enter at least one recipient ID.');
        retryMutation.mutate({ templateId, ids });
    };

    return (
        <section className="space-y-6 py-6">
            <div>
                <h1 className="text-3xl font-semibold">{t('sendTitle') || 'Send Campaign'}</h1>
                <p className="mt-2 text-sm text-slate-500">{t('sendSubtitle') || 'Choose a template and target recipients.'}</p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">{t('template') || 'Template'}</label>
                        <select
                            value={templateId}
                            onChange={(event) => setTemplateId(event.target.value)}
                            className="input w-full"
                        >
                            <option value="">{t('chooseTemplate') || 'Choose template'}</option>
                            {templates?.map((template: any) => (
                                <option key={template.id} value={template.id}>{template.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">{t('examType') || 'Exam Type'}</label>
                        <input value={examType} onChange={(event) => setExamType(event.target.value)} className="input w-full" placeholder="EST 1 / EST 2" />
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">{t('role') || 'Role'}</label>
                        <input value={role} onChange={(event) => setRole(event.target.value)} className="input w-full" placeholder="Senior / Roaming" />
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">{t('day') || 'Day'}</label>
                        <input value={day} onChange={(event) => setDay(event.target.value)} className="input w-full" placeholder="Friday / Saturday" />
                    </div>
                    <div className="sm:col-span-2">
                        <label className="mb-2 block text-sm font-medium text-slate-700">{t('status') || 'Status'}</label>
                        <select value={status} onChange={(event) => setStatus(event.target.value)} className="input w-full">
                            <option value="">{t('allStatuses') || 'All statuses'}</option>
                            {statusOptions.map((item) => (
                                <option key={item} value={item}>{item}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <button className="btn-primary" type="button" onClick={sendAllPending} disabled={sendMutation.status === 'pending' || retryMutation.status === 'pending'}>
                        {t('sendAllPending') || 'Send All Pending'}
                    </button>
                    <button className="btn-outline" type="button" onClick={sendFiltered} disabled={sendMutation.status === 'pending' || retryMutation.status === 'pending'}>
                        {t('sendFiltered') || 'Send Filtered'}
                    </button>
                    <button className="btn-secondary" type="button" onClick={retryFailed} disabled={retryMutation.status === 'pending' || sendMutation.status === 'pending'}>
                        {t('retryFailed') || 'Retry Failed'}
                    </button>
                    <button className="btn-outline" type="button" onClick={retrySelected} disabled={retryMutation.status === 'pending' || sendMutation.status === 'pending'}>
                        {t('retrySelected') || 'Retry Selected'}
                    </button>
                </div>

                <div className="mt-6">
                    <label className="mb-2 block text-sm font-medium text-slate-700">{t('retrySelectedIds') || 'Retry selected recipient IDs'}</label>
                    <textarea
                        rows={3}
                        value={selectedIds}
                        onChange={(event) => setSelectedIds(event.target.value)}
                        className="textarea w-full"
                        placeholder={t('idsPlaceholder') || 'Enter comma-separated recipient IDs'}
                    />
                </div>

                {selectedTemplate && (
                    <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                        <div className="font-semibold">{t('selectedTemplate') || 'Selected template:'}</div>
                        <div>{selectedTemplate.name}</div>
                    </div>
                )}
            </div>
        </section>
    );
}
