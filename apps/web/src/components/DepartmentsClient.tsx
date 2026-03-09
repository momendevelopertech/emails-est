'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import api from '@/lib/api';
import { useRequireAuth } from '@/lib/use-auth';
import PageLoader from './PageLoader';

type Department = { id: string; name: string; nameAr?: string };

export default function DepartmentsClient({ locale }: { locale: string }) {
    const t = useTranslations('departments');
    const router = useRouter();
    const { user, ready } = useRequireAuth(locale);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [form, setForm] = useState<any>({});
    const [createOpen, setCreateOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const cancelLabel = locale === 'ar' ? 'إلغاء' : 'Cancel';

    const canAdmin = user?.role === 'HR_ADMIN' || user?.role === 'SUPER_ADMIN';

    const fetchAll = async () => {
        setLoading(true);
        try {
            const res = await api.get('/departments');
            setDepartments(res.data);
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
        return <PageLoader text={locale === 'ar' ? 'جاري تحميل الأقسام...' : 'Loading departments...'} />;
    }
    if (!canAdmin) return null;

    const createDepartment = async () => {
        await api.post('/departments', {
            name: form.name,
            nameAr: form.nameAr,
            description: form.description,
        });
        setForm({});
        fetchAll();
        setCreateOpen(false);
        router.push(`/${locale}/departments`);
        router.refresh();
    };

    const deleteDepartment = async (id: string) => {
        await api.delete(`/departments/${id}`);
        fetchAll();
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
                <h2 className="text-lg font-semibold">{t('title')}</h2>
                <div className="mt-4 space-y-3">
                    {departments.map((dept) => (
                        <div key={dept.id} className="rounded-xl border border-ink/10 bg-white/70 p-4 flex items-center justify-between">
                            <div>
                                <p className="font-semibold">{dept.name}</p>
                                <p className="text-xs text-ink/60">{dept.nameAr}</p>
                            </div>
                            <button className="btn-outline" onClick={() => deleteDepartment(dept.id)}>{t('delete')}</button>
                        </div>
                    ))}
                </div>
            </section>

            {createOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
                    <div className="card w-full max-w-2xl p-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold">{t('create')}</h3>
                            <button className="btn-outline" onClick={() => setCreateOpen(false)}>×</button>
                        </div>
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                            <input className="rounded-xl border border-ink/20 bg-white px-3 py-2" placeholder={t('name')} onChange={(e) => setForm((p: any) => ({ ...p, name: e.target.value }))} />
                            <input className="rounded-xl border border-ink/20 bg-white px-3 py-2" placeholder={t('nameAr')} onChange={(e) => setForm((p: any) => ({ ...p, nameAr: e.target.value }))} />
                            <input className="rounded-xl border border-ink/20 bg-white px-3 py-2 md:col-span-2" placeholder={t('description')} onChange={(e) => setForm((p: any) => ({ ...p, description: e.target.value }))} />
                        </div>
                        <div className="mt-4 flex justify-end gap-2">
                            <button className="btn-outline" onClick={() => setCreateOpen(false)}>{cancelLabel}</button>
                            <button className="btn-primary" onClick={createDepartment}>{t('createCta')}</button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}

