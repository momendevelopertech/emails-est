'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import api from '@/lib/api';
import { useRequireAuth } from '@/lib/use-auth';
import PageLoader from './PageLoader';
import ConfirmDialog from './ConfirmDialog';

type Department = { id: string; name: string; nameAr?: string; _count?: { employees?: number } };

export default function DepartmentsClient({ locale }: { locale: string }) {
    const t = useTranslations('departments');
    const tCommon = useTranslations('common');
    const router = useRouter();
    const { user, ready } = useRequireAuth(locale);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [form, setForm] = useState<any>({});
    const [createOpen, setCreateOpen] = useState(false);
    const [pendingDelete, setPendingDelete] = useState<Department | null>(null);
    const [deleteBusy, setDeleteBusy] = useState(false);
    const [loading, setLoading] = useState(true);
    const cancelLabel = locale === 'ar' ? 'إلغاء' : 'Cancel';

    const canAdmin = user?.role === 'HR_ADMIN' || user?.role === 'SUPER_ADMIN';

    const resolveGroup = (dept: Department) => {
        const combined = `${dept.name} ${dept.nameAr || ''}`.toLowerCase();
        if (combined.includes('erc')) return 'ERC';
        if (combined.includes('sphinx')) return 'Sphinx';
        return 'Sphinx';
    };

    const groupedDepartments = useMemo(() => {
        const groups: Record<'ERC' | 'Sphinx', Department[]> = { ERC: [], Sphinx: [] };
        departments.forEach((dept) => {
            const group = resolveGroup(dept);
            groups[group].push(dept);
        });
        return groups;
    }, [departments]);

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

    const requestDeleteDepartment = (dept: Department) => {
        const hasEmployees = (dept._count?.employees || 0) > 0;
        if (hasEmployees) return;
        setPendingDelete(dept);
    };

    const confirmDeleteDepartment = async () => {
        if (!pendingDelete || deleteBusy) return;
        setDeleteBusy(true);
        try {
            await api.delete(`/departments/${pendingDelete.id}`);
            await fetchAll();
        } finally {
            setDeleteBusy(false);
            setPendingDelete(null);
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
                <h2 className="text-lg font-semibold">{t('title')}</h2>
                <div className="mt-4 grid gap-6 lg:grid-cols-2">
                    {(['ERC', 'Sphinx'] as const).map((group) => (
                        <div key={group} className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-ink/60">{group}</h3>
                                <span className="text-xs text-ink/50">{groupedDepartments[group].length}</span>
                            </div>
                            {groupedDepartments[group].map((dept) => {
                                const hasEmployees = (dept._count?.employees || 0) > 0;
                                return (
                                    <div key={dept.id} className="rounded-xl border border-ink/10 bg-white/70 p-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <p className="font-semibold">{dept.name}</p>
                                                <p className="text-xs text-ink/60">{dept.nameAr}</p>
                                                <p className="text-xs text-ink/50">{t('employeesCount', { count: dept._count?.employees || 0 })}</p>
                                                {hasEmployees && <p className="text-xs text-rose-600">{t('deleteBlocked')}</p>}
                                            </div>
                                            <button
                                                className={`btn-outline ${hasEmployees ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                onClick={() => requestDeleteDepartment(dept)}
                                                disabled={hasEmployees}
                                            >
                                                {t('delete')}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
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
            <ConfirmDialog
                open={!!pendingDelete}
                message={t('confirmDelete')}
                confirmLabel={tCommon('confirm')}
                cancelLabel={tCommon('cancel')}
                confirmDisabled={deleteBusy}
                onConfirm={confirmDeleteDepartment}
                onCancel={() => setPendingDelete(null)}
            />
        </main>
    );
}

