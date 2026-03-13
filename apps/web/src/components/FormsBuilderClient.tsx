'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import api from '@/lib/api';
import { useRequireAuth } from '@/lib/use-auth';
import PageLoader from './PageLoader';
import ConfirmDialog from './ConfirmDialog';

type Department = { id: string; name: string };
type FormField = {
    label: string;
    labelAr: string;
    fieldType: string;
    isRequired?: boolean;
    options?: string[];
};

export default function FormsBuilderClient({ locale }: { locale: string }) {
    const t = useTranslations('formsBuilder');
    const tCommon = useTranslations('common');
    const router = useRouter();
    const { user, ready } = useRequireAuth(locale);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [forms, setForms] = useState<any[]>([]);
    const [form, setForm] = useState<any>({});
    const [fields, setFields] = useState<FormField[]>([]);
    const [createOpen, setCreateOpen] = useState(false);
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
    const [deleteBusy, setDeleteBusy] = useState(false);
    const [loading, setLoading] = useState(true);
    const cancelLabel = locale === 'ar' ? 'إلغاء' : 'Cancel';

    const canAdmin = user?.role === 'HR_ADMIN' || user?.role === 'SUPER_ADMIN';

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [deptRes, formsRes] = await Promise.all([api.get('/departments'), api.get('/forms')]);
            setDepartments(deptRes.data);
            setForms(formsRes.data);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!ready) return;
        if (!canAdmin) {
            router.replace(`/${locale}`);
            return;
        }
        fetchAll();
    }, [canAdmin, locale, ready, router]);

    if (!ready || loading) {
        return <PageLoader text={locale === 'ar' ? 'جاري تحميل النماذج...' : 'Loading forms...'} />;
    }
    if (!canAdmin) return null;

    const addField = () => {
        setFields((prev) => [...prev, { label: '', labelAr: '', fieldType: 'TEXT', isRequired: false }]);
    };

    const updateField = (index: number, patch: Partial<FormField>) => {
        setFields((prev) => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)));
    };

    const createForm = async () => {
        await api.post('/forms', {
            name: form.name,
            nameAr: form.nameAr,
            description: form.description,
            descriptionAr: form.descriptionAr,
            departmentId: form.departmentId || null,
            fields,
        });
        setForm({});
        setFields([]);
        fetchAll();
        setCreateOpen(false);
        router.push(`/${locale}/forms`);
        router.refresh();
    };

    const requestDeleteForm = (id: string) => {
        setPendingDeleteId(id);
    };

    const confirmDeleteForm = async () => {
        if (!pendingDeleteId || deleteBusy) return;
        setDeleteBusy(true);
        try {
            await api.delete(`/forms/${pendingDeleteId}`);
            await fetchAll();
        } finally {
            setDeleteBusy(false);
            setPendingDeleteId(null);
        }
    };

    return (
        <main className="px-6 pb-12 space-y-6">
            <section className="card p-5">
                <div className="flex items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold">{t('create')}</h2>
                    <button className="btn-primary" onClick={() => setCreateOpen(true)}>{t('createCta')}</button>
                </div>
            </section>

            <section className="card p-5">
                <h2 className="text-lg font-semibold">{t('existing')}</h2>
                <div className="mt-4 space-y-3">
                    {forms.map((currentForm) => (
                        <div key={currentForm.id} className="rounded-xl border border-ink/10 bg-white/70 p-4 flex items-center justify-between">
                            <div>
                                <p className="font-semibold">{currentForm.name}</p>
                                <p className="text-xs text-ink/60">{currentForm.department?.name || t('allDepartments')}</p>
                            </div>
                            <button className="btn-outline" onClick={() => requestDeleteForm(currentForm.id)}>{t('deactivate')}</button>
                        </div>
                    ))}
                </div>
            </section>

            {createOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
                    <div className="card max-h-[90vh] w-full max-w-5xl overflow-y-auto p-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold">{t('create')}</h3>
                            <button className="btn-outline" onClick={() => setCreateOpen(false)}>×</button>
                        </div>
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                            <input className="rounded-xl border border-ink/20 bg-white px-3 py-2" placeholder={t('formName')} onChange={(e) => setForm((p: any) => ({ ...p, name: e.target.value }))} />
                            <input className="rounded-xl border border-ink/20 bg-white px-3 py-2" placeholder={t('formNameAr')} onChange={(e) => setForm((p: any) => ({ ...p, nameAr: e.target.value }))} />
                            <input className="rounded-xl border border-ink/20 bg-white px-3 py-2" placeholder={t('description')} onChange={(e) => setForm((p: any) => ({ ...p, description: e.target.value }))} />
                            <input className="rounded-xl border border-ink/20 bg-white px-3 py-2" placeholder={t('descriptionAr')} onChange={(e) => setForm((p: any) => ({ ...p, descriptionAr: e.target.value }))} />
                            <select className="rounded-xl border border-ink/20 bg-white px-3 py-2" onChange={(e) => setForm((p: any) => ({ ...p, departmentId: e.target.value }))}>
                                <option value="">{t('allDepartments')}</option>
                                {departments.map((d) => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="mt-4 space-y-3">
                            {fields.map((field, index) => (
                                <div key={index} className="grid gap-2 md:grid-cols-4">
                                    <input className="rounded-xl border border-ink/20 bg-white px-3 py-2" placeholder={t('label')} onChange={(e) => updateField(index, { label: e.target.value })} />
                                    <input className="rounded-xl border border-ink/20 bg-white px-3 py-2" placeholder={t('labelAr')} onChange={(e) => updateField(index, { labelAr: e.target.value })} />
                                    <select className="rounded-xl border border-ink/20 bg-white px-3 py-2" onChange={(e) => updateField(index, { fieldType: e.target.value })}>
                                        <option value="TEXT">{t('fieldTypes.text')}</option>
                                        <option value="TEXTAREA">{t('fieldTypes.textarea')}</option>
                                        <option value="NUMBER">{t('fieldTypes.number')}</option>
                                        <option value="DATE">{t('fieldTypes.date')}</option>
                                        <option value="TIME">{t('fieldTypes.time')}</option>
                                        <option value="SELECT">{t('fieldTypes.select')}</option>
                                        <option value="CHECKBOX">{t('fieldTypes.checkbox')}</option>
                                        <option value="FILE">{t('fieldTypes.file')}</option>
                                    </select>
                                    <label className="flex items-center gap-2 text-sm">
                                        <input type="checkbox" onChange={(e) => updateField(index, { isRequired: e.target.checked })} />
                                        {t('required')}
                                    </label>
                                </div>
                            ))}
                        </div>

                        <div className="mt-4 flex justify-end gap-2">
                            <button className="btn-outline" onClick={addField}>{t('addField')}</button>
                            <button className="btn-outline" onClick={() => setCreateOpen(false)}>{cancelLabel}</button>
                            <button className="btn-primary" onClick={createForm}>{t('createCta')}</button>
                        </div>
                    </div>
                </div>
            )}
            <ConfirmDialog
                open={!!pendingDeleteId}
                message={tCommon('confirmDeleteItem')}
                confirmLabel={tCommon('confirm')}
                cancelLabel={tCommon('cancel')}
                confirmDisabled={deleteBusy}
                onConfirm={confirmDeleteForm}
                onCancel={() => setPendingDeleteId(null)}
            />
        </main>
    );
}

