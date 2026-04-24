'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
    AlertTriangle,
    ArrowLeftRight,
    CheckCircle2,
    ChevronDown,
    Inbox,
    RefreshCw,
    ShieldAlert,
    Trash2,
    Users,
} from 'lucide-react';
import api, { fetchCsrfToken } from '@/lib/api';
import {
    buildBlacklistConflictMap,
    getRecipientSheetLabel,
    MANAGED_SHEET_DISPLAY_ORDER,
    SHEET_META,
    type ManagedRecipientSheet,
    type SwappableRecipientSheet,
} from './recipient-sheet-utils';
import DraggableTableScrollArea from './DraggableTableScrollArea';

type SheetTab = ManagedRecipientSheet;

type Recipient = {
    id: string;
    name: string;
    arabic_name?: string | null;
    phone?: string | null;
    room_est1?: string | null;
    building?: string | null;
    role?: string | null;
    sheet: SheetTab;
};

type ApiRecipientPage = {
    items: Recipient[];
    total: number;
};

type CycleSummary = {
    id: string;
    name: string;
    source_file_name?: string | null;
    created_at: string;
};

const ALL_CYCLES = '__all__';

function SheetBadge({ sheet, isArabic }: { sheet: SheetTab; isArabic: boolean }) {
    const meta = SHEET_META[sheet];

    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${meta.bg} ${meta.color} ${meta.border}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
            {getRecipientSheetLabel(sheet, isArabic)}
        </span>
    );
}

function SkeletonRow() {
    const widths = [170, 120, 90, 160, 110, 100];

    return (
        <tr className="border-b border-slate-100">
            {widths.map((width, index) => (
                <td key={index} className="px-4 py-3">
                    <div className="h-3.5 animate-pulse rounded bg-slate-200" style={{ width }} />
                </td>
            ))}
        </tr>
    );
}

function EmptyState({ isArabic, sheet }: { isArabic: boolean; sheet: SheetTab }) {
    const meta = SHEET_META[sheet];

    return (
        <tr>
            <td colSpan={6} className="py-16 text-center">
                <div className="flex flex-col items-center gap-3">
                    <div className={`rounded-full p-4 ${meta.bg}`}>
                        <Inbox size={28} className={meta.color} />
                    </div>
                    <p className="text-sm text-slate-500">
                        {isArabic
                            ? `لا يوجد بيانات في ${meta.labelAr}.`
                            : `No recipients in ${meta.label} sheet.`}
                    </p>
                </div>
            </td>
        </tr>
    );
}

function SwapDropdown({
    recipientId,
    currentSheet,
    isArabic,
    isSwapping,
    onSwap,
}: {
    recipientId: string;
    currentSheet: SwappableRecipientSheet;
    isArabic: boolean;
    isSwapping: boolean;
    onSwap: (id: string, sheet: SwappableRecipientSheet) => void;
}) {
    const [open, setOpen] = useState(false);
    const targets: SwappableRecipientSheet[] = currentSheet === 'SPARE' ? ['EST1', 'EST2'] : ['SPARE'];

    useEffect(() => {
        if (isSwapping) {
            setOpen(false);
        }
    }, [isSwapping]);

    if (targets.length === 1) {
        const target = targets[0];
        const meta = SHEET_META[target];

        return (
            <button
                type="button"
                disabled={isSwapping}
                onClick={() => onSwap(recipientId, target)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition hover:opacity-85 disabled:opacity-40 ${meta.bg} ${meta.color} ${meta.border}`}
            >
                {isSwapping ? <RefreshCw size={11} className="animate-spin" /> : <ArrowLeftRight size={11} />}
                {isArabic ? `نقل إلى ${meta.labelAr}` : `Move to ${meta.label}`}
            </button>
        );
    }

    return (
        <div className="relative">
            <button
                type="button"
                disabled={isSwapping}
                onClick={() => setOpen((current) => !current)}
                className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 disabled:opacity-40"
            >
                {isSwapping ? <RefreshCw size={11} className="animate-spin" /> : <ArrowLeftRight size={11} />}
                {isArabic ? 'نقل إلى...' : 'Move to...'}
                <ChevronDown size={11} />
            </button>

            {open ? (
                <>
                    <button type="button" className="fixed inset-0 z-10 cursor-default" onClick={() => setOpen(false)} aria-label="Close menu" />
                    <div className="absolute right-0 top-full z-20 mt-1.5 min-w-[140px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
                        {targets.map((target) => {
                            const meta = SHEET_META[target];

                            return (
                                <button
                                    key={target}
                                    type="button"
                                    className="flex w-full items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                                    onClick={() => {
                                        setOpen(false);
                                        onSwap(recipientId, target);
                                    }}
                                >
                                    <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
                                    <span className={meta.color}>{getRecipientSheetLabel(target, isArabic)}</span>
                                </button>
                            );
                        })}
                    </div>
                </>
            ) : null}
        </div>
    );
}

export default function ExcelSheetManagerClient({
    locale,
    defaultCycleId,
}: {
    locale: string;
    defaultCycleId?: string;
}) {
    const isArabic = locale === 'ar';
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<SheetTab>('EST1');
    const [cycleId, setCycleId] = useState(defaultCycleId ?? ALL_CYCLES);
    const [swappingId, setSwappingId] = useState<string | null>(null);

    useEffect(() => {
        if (!defaultCycleId) {
            return;
        }

        setCycleId(defaultCycleId);
    }, [defaultCycleId]);

    const cyclesQuery = useQuery<CycleSummary[]>({
        queryKey: ['sheet-manager-cycles'],
        queryFn: async () => (await api.get('/messaging/cycles')).data,
        staleTime: 30_000,
    });

    const cycles = useMemo(() => cyclesQuery.data ?? [], [cyclesQuery.data]);
    const resolvedCycleId = useMemo(() => {
        if (cycleId !== ALL_CYCLES) {
            return cycleId;
        }

        return cycles[0]?.id ?? ALL_CYCLES;
    }, [cycleId, cycles]);

    const selectedCycle = useMemo(
        () => cycles.find((cycle) => cycle.id === resolvedCycleId) ?? null,
        [cycles, resolvedCycleId],
    );

    const fetchSheet = useCallback(async (sheet: SheetTab): Promise<Recipient[]> => {
        const params: Record<string, string> = { sheet, limit: '2000' };

        if (resolvedCycleId !== ALL_CYCLES) {
            params.cycleId = resolvedCycleId;
        }

        const response: ApiRecipientPage = (await api.get('/messaging/recipients', { params })).data;
        return response.items as Recipient[];
    }, [resolvedCycleId]);

    const est1Query = useQuery<Recipient[]>({
        queryKey: ['sheet-manager', resolvedCycleId, 'EST1'],
        queryFn: () => fetchSheet('EST1'),
        staleTime: 30_000,
    });
    const est2Query = useQuery<Recipient[]>({
        queryKey: ['sheet-manager', resolvedCycleId, 'EST2'],
        queryFn: () => fetchSheet('EST2'),
        staleTime: 30_000,
    });
    const spareQuery = useQuery<Recipient[]>({
        queryKey: ['sheet-manager', resolvedCycleId, 'SPARE'],
        queryFn: () => fetchSheet('SPARE'),
        staleTime: 30_000,
    });
    const blacklistQuery = useQuery<Recipient[]>({
        queryKey: ['sheet-manager', resolvedCycleId, 'BLACKLIST'],
        queryFn: () => fetchSheet('BLACKLIST'),
        staleTime: 30_000,
    });

    const sheetData: Record<SheetTab, Recipient[]> = {
        EST1: est1Query.data ?? [],
        EST2: est2Query.data ?? [],
        SPARE: spareQuery.data ?? [],
        BLACKLIST: blacklistQuery.data ?? [],
    };
    const sheetLoading: Record<SheetTab, boolean> = {
        EST1: est1Query.isLoading,
        EST2: est2Query.isLoading,
        SPARE: spareQuery.isLoading,
        BLACKLIST: blacklistQuery.isLoading,
    };
    const tabCounts = useMemo(() => ({
        EST1: sheetData.EST1.length,
        EST2: sheetData.EST2.length,
        SPARE: sheetData.SPARE.length,
        BLACKLIST: sheetData.BLACKLIST.length,
    }), [sheetData.BLACKLIST.length, sheetData.EST1.length, sheetData.EST2.length, sheetData.SPARE.length]);

    useEffect(() => {
        const preferredTab = MANAGED_SHEET_DISPLAY_ORDER.find((sheet) => tabCounts[sheet] > 0) ?? 'EST1';

        if (tabCounts[activeTab] === 0 && preferredTab !== activeTab) {
            setActiveTab(preferredTab);
        }
    }, [activeTab, tabCounts]);

    const activeRecipients = useMemo(
        () => [...sheetData.EST1, ...sheetData.EST2, ...sheetData.SPARE],
        [sheetData.EST1, sheetData.EST2, sheetData.SPARE],
    );
    const conflictMap = useMemo(
        () => buildBlacklistConflictMap(sheetData.BLACKLIST, activeRecipients),
        [sheetData.BLACKLIST, activeRecipients],
    );
    const conflictCount = conflictMap.size;

    const refreshAll = useCallback(() => {
        void queryClient.invalidateQueries({ queryKey: ['sheet-manager'] });
        void queryClient.invalidateQueries({ queryKey: ['sheet-manager-cycles'] });
    }, [queryClient]);

    const syncWorkspaceQueries = useCallback(() => {
        void queryClient.invalidateQueries({ queryKey: ['sheet-manager'] });
        void queryClient.invalidateQueries({ queryKey: ['sheet-manager-cycles'] });
        void queryClient.invalidateQueries({ queryKey: ['messaging-recipients'] });
        void queryClient.invalidateQueries({ queryKey: ['messaging-recipient-filter-options'] });
    }, [queryClient]);

    const swapMutation = useMutation({
        mutationFn: async ({ id, sheet }: { id: string; sheet: SwappableRecipientSheet }) => {
            await fetchCsrfToken();
            return (await api.patch(`/messaging/recipients/${id}/sheet`, { sheet })).data;
        },
        onSuccess: (_data, { sheet }) => {
            syncWorkspaceQueries();
            toast.success(
                isArabic
                    ? `تم النقل بنجاح إلى ${getRecipientSheetLabel(sheet, true)}.`
                    : `Moved to ${getRecipientSheetLabel(sheet, false)} successfully.`,
            );
            setSwappingId(null);
        },
        onError: () => {
            toast.error(isArabic ? 'تعذر نقل الصف.' : 'Failed to move row.');
            setSwappingId(null);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            await fetchCsrfToken();
            return api.delete(`/messaging/recipients/${id}`);
        },
        onSuccess: () => {
            syncWorkspaceQueries();
            toast.success(isArabic ? 'تم الحذف من القائمة السوداء.' : 'Removed from blacklist.');
        },
        onError: () => {
            toast.error(isArabic ? 'تعذر الحذف.' : 'Failed to delete.');
        },
    });

    const handleSwap = (id: string, sheet: SwappableRecipientSheet) => {
        setSwappingId(id);
        swapMutation.mutate({ id, sheet });
    };

    const currentItems = sheetData[activeTab];
    const isLoading = sheetLoading[activeTab];

    return (
        <section className="space-y-5 py-4">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_320px]">
                <div className="rounded-[1.9rem] border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5 md:p-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-3">
                            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                                <ArrowLeftRight size={13} />
                                <span>{isArabic ? 'إدارة التبديل والمراجعة' : 'Swap and review workspace'}</span>
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold text-slate-950">
                                    {isArabic ? 'إدارة الشيتات' : 'Sheet Manager'}
                                </h2>
                                <p className="mt-2 text-sm leading-6 text-slate-500">
                                    {isArabic
                                        ? 'بدّل بسرعة بين EST1 وEST2 والاحتياطي، وراجع تعارضات القائمة السوداء قبل التصدير أو التنظيف.'
                                        : 'Move people between EST1, EST2, and Spare, then review blacklist conflicts before export or cleanup.'}
                                </p>
                            </div>
                        </div>

                        <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                {isArabic ? 'الدورة الحالية' : 'Current cycle'}
                            </div>
                            <div className="mt-2 font-semibold text-slate-950">
                                {selectedCycle?.name || (isArabic ? 'أحدث دورة' : 'Latest cycle')}
                            </div>
                            {selectedCycle?.source_file_name ? (
                                <div className="mt-1 text-xs text-slate-500">{selectedCycle.source_file_name}</div>
                            ) : null}
                        </div>
                    </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                    <div className="rounded-[1.6rem] border border-slate-200 bg-white p-4 shadow-sm shadow-slate-900/5">
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                            {isArabic ? 'الاحتياطي' : 'Spare pool'}
                        </div>
                        <div className="mt-2 text-3xl font-semibold text-slate-950">{tabCounts.SPARE}</div>
                        <div className="mt-1 text-xs text-slate-500">
                            {isArabic ? 'جاهز للاستبدال السريع' : 'Ready for quick replacement'}
                        </div>
                    </div>
                    <div className="rounded-[1.6rem] border border-slate-200 bg-white p-4 shadow-sm shadow-slate-900/5">
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                            {isArabic ? 'تعارضات البلاك ليست' : 'Blacklist conflicts'}
                        </div>
                        <div className={`mt-2 text-3xl font-semibold ${conflictCount ? 'text-rose-700' : 'text-emerald-700'}`}>
                            {conflictCount}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                            {isArabic ? 'الصفوف المتطابقة بالاسم أو الرقم' : 'Rows matched by name or phone'}
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                    {MANAGED_SHEET_DISPLAY_ORDER.map((tab) => {
                        const meta = SHEET_META[tab];
                        const active = activeTab === tab;
                        const count = tabCounts[tab];
                        const hasConflict = tab === 'BLACKLIST' && conflictCount > 0;

                        return (
                            <button
                                key={tab}
                                type="button"
                                onClick={() => setActiveTab(tab)}
                                className={`relative flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                                    active
                                        ? `${meta.bg} ${meta.color} ${meta.border} shadow-sm`
                                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
                                }`}
                            >
                                {hasConflict ? (
                                    <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white" />
                                ) : null}
                                <span className={`h-2 w-2 rounded-full ${active ? meta.dot : 'bg-slate-300'}`} />
                                <span>{getRecipientSheetLabel(tab, isArabic)}</span>
                                <span className={`rounded-full px-2 py-0.5 text-[11px] leading-none ${active ? `${meta.bg} ${meta.color} border ${meta.border}` : 'bg-slate-100 text-slate-500'}`}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                <div className="flex items-center gap-2">
                    {cycles.length > 0 ? (
                        <select
                            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                            value={cycleId}
                            onChange={(event) => setCycleId(event.target.value)}
                        >
                            <option value={ALL_CYCLES}>{isArabic ? 'أحدث دورة' : 'Latest cycle'}</option>
                            {cycles.map((cycle) => (
                                <option key={cycle.id} value={cycle.id}>{cycle.name}</option>
                            ))}
                        </select>
                    ) : null}

                    <button
                        type="button"
                        onClick={refreshAll}
                        className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-600 shadow-sm transition hover:bg-slate-50"
                    >
                        <RefreshCw size={14} />
                        {isArabic ? 'تحديث' : 'Refresh'}
                    </button>
                </div>
            </div>

            <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm shadow-slate-900/5">
                {activeTab === 'BLACKLIST' && conflictCount > 0 ? (
                    <div className="flex items-start gap-3 border-b border-rose-100 bg-rose-50 px-5 py-3.5">
                        <ShieldAlert size={18} className="mt-0.5 shrink-0 text-rose-600" />
                        <div>
                            <p className="text-sm font-semibold text-rose-900">
                                {isArabic
                                    ? `${conflictCount} صف في البلاك ليست له تطابق داخل الشيتات الأخرى`
                                    : `${conflictCount} blacklist ${conflictCount === 1 ? 'entry has' : 'entries have'} matches in other sheets`}
                            </p>
                            <p className="mt-0.5 text-xs text-rose-700">
                                {isArabic
                                    ? 'أي صف باللون الأحمر موجود له نفس الاسم أو نفس رقم الهاتف داخل EST1 أو EST2 أو Spare.'
                                    : 'Red rows match an EST1, EST2, or Spare entry by name or phone.'}
                            </p>
                        </div>
                    </div>
                ) : null}

                {(activeTab === 'EST1' || activeTab === 'EST2') && currentItems.length > 0 ? (
                    <div className="flex items-center gap-2.5 border-b border-slate-100 bg-slate-50 px-5 py-2.5">
                        <ArrowLeftRight size={14} className="text-slate-400" />
                        <p className="text-xs text-slate-500">
                            {isArabic
                                ? 'انقل أي مراقب معتذر مباشرة إلى قائمة الاحتياطي من زر الحركة في آخر الصف.'
                                : 'Move any apologising proctor directly to Spare from the action button at the end of the row.'}
                        </p>
                    </div>
                ) : null}

                {activeTab === 'SPARE' && currentItems.length > 0 ? (
                    <div className="flex items-center gap-2.5 border-b border-slate-100 bg-slate-50 px-5 py-2.5">
                        <ArrowLeftRight size={14} className="text-slate-400" />
                        <p className="text-xs text-slate-500">
                            {isArabic
                                ? 'من قائمة الاحتياطي اختر هل البديل سيذهب إلى EST1 أو EST2.'
                                : 'From Spare, choose whether the replacement should move into EST1 or EST2.'}
                        </p>
                    </div>
                ) : null}

                <DraggableTableScrollArea className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                                <th className="px-5 py-3">{isArabic ? 'الاسم' : 'Name'}</th>
                                <th className="px-4 py-3">{isArabic ? 'الرقم' : 'Phone'}</th>
                                <th className="px-4 py-3">{isArabic ? 'الغرفة' : 'Room'}</th>
                                <th className="px-4 py-3">{isArabic ? 'المبنى' : 'Building'}</th>
                                <th className="px-4 py-3">{isArabic ? 'الدور' : 'Role'}</th>
                                <th className="px-4 py-3 text-right">{isArabic ? 'الإجراء' : 'Action'}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? Array.from({ length: 6 }).map((_, index) => <SkeletonRow key={index} />) : null}

                            {!isLoading && currentItems.length === 0 ? (
                                <EmptyState isArabic={isArabic} sheet={activeTab} />
                            ) : null}

                            {!isLoading ? currentItems.map((recipient) => {
                                const conflict = activeTab === 'BLACKLIST' ? conflictMap.get(recipient.id) : null;
                                const isConflict = Boolean(conflict);
                                const isThisSwapping = swappingId === recipient.id;

                                return (
                                    <tr
                                        key={recipient.id}
                                        className={`transition ${
                                            isConflict
                                                ? 'bg-rose-50 hover:bg-rose-100/70'
                                                : 'hover:bg-slate-50/80'
                                        }`}
                                    >
                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-2.5">
                                                {isConflict ? <AlertTriangle size={14} className="shrink-0 text-rose-500" /> : null}
                                                <div>
                                                    <div className={`font-medium leading-tight ${isConflict ? 'text-rose-900' : 'text-slate-900'}`}>
                                                        {recipient.name}
                                                    </div>
                                                    {recipient.arabic_name ? (
                                                        <div className="mt-0.5 text-xs text-slate-400" dir="rtl">
                                                            {recipient.arabic_name}
                                                        </div>
                                                    ) : null}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-slate-600">{recipient.phone || '—'}</td>
                                        <td className="px-4 py-3 font-mono text-xs text-slate-600">{recipient.room_est1 || '—'}</td>
                                        <td className="px-4 py-3 text-slate-600">{recipient.building || '—'}</td>
                                        <td className="px-4 py-3">
                                            {recipient.role ? (
                                                <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                                                    {recipient.role}
                                                </span>
                                            ) : '—'}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {conflict ? (
                                                    <div className="flex items-center gap-1">
                                                        {conflict.foundIn.map((sheet) => (
                                                            <SheetBadge key={sheet} sheet={sheet} isArabic={isArabic} />
                                                        ))}
                                                    </div>
                                                ) : null}

                                                {activeTab !== 'BLACKLIST' ? (
                                                    <SwapDropdown
                                                        recipientId={recipient.id}
                                                        currentSheet={activeTab as SwappableRecipientSheet}
                                                        isArabic={isArabic}
                                                        isSwapping={isThisSwapping}
                                                        onSwap={handleSwap}
                                                    />
                                                ) : (
                                                    <button
                                                        type="button"
                                                        disabled={deleteMutation.isPending}
                                                        onClick={() => deleteMutation.mutate(recipient.id)}
                                                        className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-40"
                                                    >
                                                        <Trash2 size={11} />
                                                        {isArabic ? 'حذف' : 'Delete'}
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            }) : null}
                        </tbody>
                    </table>
                </DraggableTableScrollArea>

                {!isLoading && currentItems.length > 0 ? (
                    <div className={`flex items-center justify-between border-t border-slate-100 px-5 py-3 ${SHEET_META[activeTab].bg}`}>
                        <div className="flex items-center gap-2">
                            <Users size={13} className={SHEET_META[activeTab].color} />
                            <span className={`text-xs font-semibold ${SHEET_META[activeTab].color}`}>
                                {currentItems.length} {isArabic ? 'شخص' : 'people'}
                            </span>
                        </div>

                        {activeTab === 'BLACKLIST' ? (
                            conflictCount > 0 ? (
                                <div className="text-xs font-semibold text-rose-600">
                                    {isArabic ? `${conflictCount} تعارض يحتاج مراجعة` : `${conflictCount} conflicts need review`}
                                </div>
                            ) : (
                                <div className="flex items-center gap-1.5 text-xs text-emerald-700">
                                    <CheckCircle2 size={13} />
                                    {isArabic ? 'لا يوجد تعارض' : 'No conflicts found'}
                                </div>
                            )
                        ) : null}
                    </div>
                ) : null}
            </div>
        </section>
    );
}
