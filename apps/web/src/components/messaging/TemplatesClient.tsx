'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useTranslations } from 'next-intl';
import api from '@/lib/api';

const templateTypes = [
    { value: 'BOTH', label: 'Both Email & WhatsApp' },
    { value: 'EMAIL', label: 'Email Only' },
    { value: 'WHATSAPP', label: 'WhatsApp Only' },
];

export default function TemplatesClient({ locale }: { locale: string }) {
    const t = useTranslations('messaging');
    const [selected, setSelected] = useState<string | null>(null);
    const [form, setForm] = useState({ name: '', type: 'BOTH', subject: '', body: '' });

    const { data, refetch } = useQuery({
        queryKey: ['messaging-templates'],
        queryFn: async () => {
            const response = await api.get('/messaging/templates');
            return response.data;
        },
    });

    const createMutation = useMutation({
        mutationFn: async () => {
            const response = await api.post('/messaging/templates', form);
            return response.data;
        },
        onSuccess() {
            toast.success(t('templateCreated') || 'Template created');
            setForm({ name: '', type: 'BOTH', subject: '', body: '' });
            setSelected(null);
            refetch();
        },
        onError() {
            toast.error(t('templateSaveError') || 'Unable to save template');
        },
    });

    const updateMutation = useMutation({
        mutationFn: async () => {
            if (!selected) return null;
            const response = await api.put(`/messaging/templates/${selected}`, form);
            return response.data;
        },
        onSuccess() {
            toast.success(t('templateUpdated') || 'Template updated');
            setSelected(null);
            refetch();
        },
        onError() {
            toast.error(t('templateSaveError') || 'Unable to save template');
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const response = await api.delete(`/messaging/templates/${id}`);
            return response.data;
        },
        onSuccess() {
            toast.success(t('templateDeleted') || 'Template deleted');
            if (selected) setSelected(null);
            refetch();
        },
        onError() {
            toast.error(t('templateDeleteError') || 'Unable to delete template');
        },
    });

    const selectedTemplate = useMemo(
        () => data?.find((item: any) => item.id === selected) ?? null,
        [data, selected],
    );

    const startEdit = (template: any) => {
        setSelected(template.id);
        setForm({ name: template.name, type: template.type, subject: template.subject, body: template.body });
    };

    const saveTemplate = () => {
        if (!form.name || !form.subject || !form.body) {
            toast.error(t('templateValidationError') || 'All fields are required.');
            return;
        }
        if (selected) {
            updateMutation.mutate();
        } else {
            createMutation.mutate();
        }
    };

    return (
        <section className="space-y-6 py-6">
            <div>
                <h1 className="text-3xl font-semibold">{t('templatesTitle') || 'Templates'}</h1>
                <p className="mt-2 text-sm text-slate-500">{t('templatesSubtitle') || 'Create and manage messaging templates.'}</p>
            </div>

            <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="space-y-4">
                        <div>
                            <label className="mb-2 block text-sm font-medium text-slate-700">{t('templateName') || 'Name'}</label>
                            <input
                                value={form.name}
                                onChange={(event) => setForm((state) => ({ ...state, name: event.target.value }))}
                                className="input w-full"
                            />
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-medium text-slate-700">{t('templateType') || 'Type'}</label>
                            <select
                                value={form.type}
                                onChange={(event) => setForm((state) => ({ ...state, type: event.target.value }))}
                                className="input w-full"
                            >
                                {templateTypes.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-medium text-slate-700">{t('templateSubject') || 'Subject'}</label>
                            <input
                                value={form.subject}
                                onChange={(event) => setForm((state) => ({ ...state, subject: event.target.value }))}
                                className="input w-full"
                            />
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-medium text-slate-700">{t('templateBody') || 'Body'}</label>
                            <textarea
                                rows={10}
                                value={form.body}
                                onChange={(event) => setForm((state) => ({ ...state, body: event.target.value }))}
                                className="textarea w-full"
                            />
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <button className="btn-primary" type="button" onClick={saveTemplate} disabled={createMutation.status === 'pending' || updateMutation.status === 'pending'}>
                                {selected ? t('updateTemplate') || 'Update template' : t('createTemplate') || 'Create template'}
                            </button>
                            {selected && (
                                <button className="btn-outline" type="button" onClick={() => setSelected(null)}>
                                    {t('cancelEdit') || 'Cancel'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="text-xl font-semibold">{t('currentTemplates') || 'Saved templates'}</h2>
                    <div className="mt-4 space-y-3">
                        {data?.length ? data.map((template: any) => (
                            <div key={template.id} className="rounded-3xl border border-slate-200 p-4 hover:border-slate-300">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <div className="text-base font-semibold text-slate-900">{template.name}</div>
                                        <div className="text-sm text-slate-500">{template.type.toLowerCase()}</div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button className="btn-outline" type="button" onClick={() => startEdit(template)}>
                                            {t('edit') || 'Edit'}
                                        </button>
                                        <button className="btn-danger" type="button" onClick={() => deleteMutation.mutate(template.id)}>
                                            {t('delete') || 'Delete'}
                                        </button>
                                    </div>
                                </div>
                                <p className="mt-3 text-sm leading-6 text-slate-600">{template.subject}</p>
                            </div>
                        )) : (
                            <div className="rounded-3xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
                                {t('noTemplates') || 'No templates available yet.'}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}
