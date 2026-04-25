'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import {
    AlertTriangle,
    BadgeCheck,
    Building2,
    CheckCircle2,
    Download,
    Loader2,
    Mail,
    MapPin,
    MessageSquareText,
    Phone,
    Save,
    Star,
    Users,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import api from '@/lib/api';

type NominationRole = 'ROAMING' | 'SENIOR';
type ReviewPageRole = 'HEAD' | 'SENIOR';

type ReviewValue = {
    rating: number | null;
    comment: string | null;
    nominationRole: NominationRole | null;
    updated_at: string | null;
};

type LinkedSeniorReview = ReviewValue & {
    reviewer: {
        recipient_id: string;
        recipient_name: string;
        floor: string | null;
    };
};

type ReviewRow = {
    recipient_id: string;
    recipient_name: string;
    row_order: number;
    hierarchy_role: 'HEAD' | 'SENIOR' | 'INVIGILATOR';
    role: string | null;
    group_recipient_id: string | null;
    group_name: string | null;
    floor: string | null;
    room: string | null;
    phone: string | null;
    email: string | null;
    review: ReviewValue | null;
    linked_senior_review: LinkedSeniorReview | null;
};

type ReviewPayload = {
    token: string;
    role: ReviewPageRole;
    cycle_id: string | null;
    building: string;
    floor: string | null;
    reviewer: {
        recipient_id: string;
        recipient_name: string;
    };
    generated_at: string;
    summary: {
        total_rows: number;
        reviewed_rows: number;
        senior_reviewed_rows: number;
    };
    rows: ReviewRow[];
};

type EditableReviewRow = ReviewRow & {
    draftRating: '' | '1' | '2' | '3' | '4' | '5';
    draftComment: string;
    draftNominationRole: '' | NominationRole;
    showsInheritedSeniorRating: boolean;
};

type RouteParams = {
    token?: string;
};

const nominationOptions: Array<{ value: '' | NominationRole; label: string }> = [
    { value: '', label: 'No recommendation' },
    { value: 'ROAMING', label: 'Recommend as Roaming' },
    { value: 'SENIOR', label: 'Recommend as Senior' },
];
const ratingOptions: EditableReviewRow['draftRating'][] = ['1', '2', '3', '4', '5'];

const roleBadgeStyles: Record<ReviewRow['hierarchy_role'], string> = {
    HEAD: 'border border-slate-300 bg-slate-100 text-slate-800',
    SENIOR: 'border border-cyan-200 bg-cyan-50 text-cyan-800',
    INVIGILATOR: 'border border-emerald-200 bg-emerald-50 text-emerald-800',
};

const toDraftRating = (value?: number | null): EditableReviewRow['draftRating'] => (
    value ? String(value) as EditableReviewRow['draftRating'] : ''
);

const getInheritedSeniorRating = (
    row: Pick<ReviewRow, 'linked_senior_review'>,
    pageRole: ReviewPageRole,
): EditableReviewRow['draftRating'] => (
    pageRole === 'HEAD' ? toDraftRating(row.linked_senior_review?.rating) : ''
);

const mapRowsToEditable = (rows: ReviewRow[], pageRole: ReviewPageRole): EditableReviewRow[] => rows.map((row) => {
    const draftRating = toDraftRating(row.review?.rating);
    const inheritedSeniorRating = getInheritedSeniorRating(row, pageRole);

    return {
        ...row,
        draftRating,
        draftComment: row.review?.comment || '',
        draftNominationRole: row.review?.nominationRole || '',
        showsInheritedSeniorRating: !draftRating && Boolean(inheritedSeniorRating),
    };
});

const getVisibleRating = (row: EditableReviewRow, pageRole: ReviewPageRole): EditableReviewRow['draftRating'] => (
    row.showsInheritedSeniorRating ? getInheritedSeniorRating(row, pageRole) : row.draftRating
);

const hasLinkedSeniorRating = (row: Pick<ReviewRow, 'linked_senior_review'>, pageRole: ReviewPageRole) => (
    pageRole === 'HEAD' && Boolean(row.linked_senior_review?.rating)
);

const isRowCoveredForCurrentReview = (row: EditableReviewRow, pageRole: ReviewPageRole) => (
    Boolean(row.draftRating) || hasLinkedSeniorRating(row, pageRole)
);

const formatNominationLabel = (value?: NominationRole | null) => {
    if (value === 'ROAMING') return 'Roaming';
    if (value === 'SENIOR') return 'Senior';
    return '-';
};

const formatDateTime = (value?: string | null) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString();
};

const sanitizeFileName = (value: string) => value
    .replace(/[<>:"/\\|?*\u0000-\u001F]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/ /g, '-')
    .toLowerCase();

const getPendingRatingsMessage = (pendingRows: EditableReviewRow[], pageRole: ReviewPageRole) => {
    if (pendingRows.length === 0) {
        return '';
    }

    const ratingLabel = pageRole === 'HEAD' ? 'your rating' : 'a rating';

    if (pendingRows.length === 1) {
        return `Please add ${ratingLabel} for ${pendingRows[0].recipient_name} before saving.`;
    }

    return `Please complete ${ratingLabel} for the remaining ${pendingRows.length} people before saving.`;
};

export default function PublicHierarchyReviewClient({ initialToken }: { initialToken?: string }) {
    const params = useParams<RouteParams>();
    const searchParams = useSearchParams();
    const token = initialToken || searchParams.get('token') || (typeof params?.token === 'string' ? params.token : '');
    const [viewState, setViewState] = useState<'loading' | 'ready' | 'saving' | 'error'>('loading');
    const [message, setMessage] = useState('Loading the review sheet...');
    const [payload, setPayload] = useState<ReviewPayload | null>(null);
    const [rows, setRows] = useState<EditableReviewRow[]>([]);

    useEffect(() => {
        if (!token) {
            setViewState('error');
            setMessage('Invalid review link.');
            return;
        }

        setViewState('loading');
        setMessage('Loading the review sheet...');

        api.get('/public/hierarchy-reviews', { params: { token } })
            .then((response) => {
                const nextPayload = response.data as ReviewPayload;
                setPayload(nextPayload);
                setRows(mapRowsToEditable(nextPayload.rows || [], nextPayload.role));
                setViewState('ready');
                setMessage('Review sheet loaded successfully.');
            })
            .catch((error: any) => {
                setViewState('error');
                setMessage(
                    error?.response?.data?.message
                    || error?.message
                    || 'Unable to load this review sheet right now.',
                );
            });
    }, [token]);

    const groupedRows = useMemo(() => {
        const groups = new Map<string, EditableReviewRow[]>();
        for (const row of rows) {
            const key = row.group_name || 'General';
            const current = groups.get(key) ?? [];
            current.push(row);
            groups.set(key, current);
        }

        return Array.from(groups.entries()).map(([groupName, groupRows]) => ({
            groupName,
            rows: groupRows.sort((left, right) => left.row_order - right.row_order),
        }));
    }, [rows]);

    const progress = useMemo(() => {
        const totalRows = rows.length;
        const coveredRows = rows.filter((row) => isRowCoveredForCurrentReview(row, payload?.role || 'SENIOR')).length;
        const pendingRows = rows.filter((row) => !isRowCoveredForCurrentReview(row, payload?.role || 'SENIOR'));
        const ownRatedRows = rows.filter((row) => Boolean(row.draftRating)).length;
        const seniorSyncedRows = payload?.role === 'HEAD'
            ? rows.filter((row) => Boolean(row.linked_senior_review?.rating)).length
            : 0;

        return {
            totalRows,
            coveredRows,
            ownRatedRows,
            pendingRows,
            pendingCount: pendingRows.length,
            savedRows: payload?.summary.reviewed_rows ?? 0,
            seniorSyncedRows,
            completionPercent: totalRows > 0 ? Math.round((coveredRows / totalRows) * 100) : 100,
            isComplete: pendingRows.length === 0,
        };
    }, [payload?.role, payload?.summary.reviewed_rows, rows]);

    const handleRowChange = (
        recipientId: string,
        field: 'draftRating' | 'draftComment' | 'draftNominationRole',
        value: string,
    ) => {
        setRows((current) => current.map((row) => (
            row.recipient_id === recipientId
                ? field === 'draftRating'
                    ? {
                        ...row,
                        draftRating: value as EditableReviewRow['draftRating'],
                        showsInheritedSeniorRating: !value && Boolean(payload ? getInheritedSeniorRating(row, payload.role) : ''),
                    }
                    : {
                        ...row,
                        [field]: value,
                    }
                : row
        )));
    };

    const saveAllReviews = async () => {
        if (!payload) {
            return;
        }

        if (progress.pendingCount > 0) {
            const warningMessage = getPendingRatingsMessage(progress.pendingRows, payload.role);
            const firstPendingRow = progress.pendingRows[0];

            setViewState('ready');
            setMessage(warningMessage);
            toast.error(warningMessage, { duration: 4500 });

            if (firstPendingRow) {
                document.getElementById(`review-row-${firstPendingRow.recipient_id}`)?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                });
            }

            return;
        }

        setViewState('saving');
        setMessage('Saving the latest ratings and recommendations...');

        try {
            const response = await api.post('/public/hierarchy-reviews/save', {
                token: payload.token,
                rows: rows.map((row) => ({
                    targetRecipientId: row.recipient_id,
                    rating: row.draftRating ? Number(row.draftRating) : undefined,
                    comment: row.draftComment.trim() || undefined,
                    nominationRole: row.draftNominationRole || undefined,
                })),
            });

            const nextPayload = response.data?.review as ReviewPayload;
            setPayload(nextPayload);
            setRows(mapRowsToEditable(nextPayload.rows || [], nextPayload.role));
            setViewState('ready');
            setMessage('All review changes were saved.');
        } catch (error: any) {
            setViewState('error');
            setMessage(
                error?.response?.data?.message
                || error?.message
                || 'Unable to save the review sheet right now.',
            );
        }
    };

    const exportExcel = () => {
        if (!payload) {
            return;
        }

        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(rows.map((row) => ({
            Rating: getVisibleRating(row, payload.role) || '',
            Comment: row.draftComment.trim(),
            Recommendation: row.draftNominationRole ? formatNominationLabel(row.draftNominationRole) : '',
            Row: row.row_order,
            Name: row.recipient_name,
            'Hierarchy Role': row.hierarchy_role,
            Role: row.role || '',
            Group: row.group_name || '',
            Floor: row.floor || '',
            Room: row.room || '',
            Phone: row.phone || '',
            Email: row.email || '',
            ...(payload.role === 'HEAD' ? {
                'Senior Rating': row.linked_senior_review?.rating ?? '',
                'Senior Comment': row.linked_senior_review?.comment || '',
                'Senior Recommendation': formatNominationLabel(row.linked_senior_review?.nominationRole || null),
                'Senior Reviewer': row.linked_senior_review?.reviewer.recipient_name || '',
            } : {}),
        })));

        XLSX.utils.book_append_sheet(workbook, worksheet, 'Hierarchy Review');
        const fileName = sanitizeFileName(
            `${payload.building}-${payload.role}-${payload.reviewer.recipient_name}-review.xlsx`,
        ) || 'hierarchy-review.xlsx';
        XLSX.writeFile(workbook, fileName);
    };

    if (viewState === 'loading' && !payload) {
        return (
            <section className="min-h-screen bg-atmosphere px-4 py-8 sm:px-6 lg:px-8">
                <div className="mx-auto flex max-w-3xl items-center justify-center rounded-[2rem] border border-slate-200 bg-white p-8 shadow-xl shadow-slate-900/5">
                    <div className="flex items-center gap-3 text-slate-700">
                        <Loader2 className="animate-spin" size={20} />
                        <span>{message}</span>
                    </div>
                </div>
            </section>
        );
    }

    if (viewState === 'error' && !payload) {
        return (
            <section className="min-h-screen bg-atmosphere px-4 py-8 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-3xl rounded-[2rem] border border-rose-200 bg-white p-8 shadow-xl shadow-slate-900/5">
                    <h1 className="text-2xl font-semibold text-slate-950">Hierarchy review unavailable</h1>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{message}</p>
                </div>
            </section>
        );
    }

    if (!payload) {
        return null;
    }

    return (
        <section className="min-h-screen bg-atmosphere px-4 py-8 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-[1320px] space-y-4 sm:space-y-5">
                <div className="overflow-hidden rounded-[1.8rem] border border-slate-200 bg-white shadow-xl shadow-slate-900/5">
                    <div className="bg-[#171717] px-5 py-6 text-white md:px-7">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="min-w-0">
                                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-white/80">
                                    <Users size={14} />
                                    <span>{payload.role === 'HEAD' ? 'Head review sheet' : 'Senior review sheet'}</span>
                                </div>
                                <h1 className="mt-4 text-2xl font-semibold leading-tight text-white sm:text-3xl">
                                    {payload.reviewer.recipient_name}
                                </h1>
                                <p className="mt-3 max-w-3xl text-sm leading-6 text-white/75">
                                    This sheet is public and does not require login. Rate the listed people from 1 to 5, add comments,
                                    and recommend who can step up to roaming or senior responsibilities.
                                </p>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[320px]">
                                <div className="rounded-[1.05rem] border border-white/10 bg-white/10 px-4 py-3 text-sm">
                                    <div className="text-white/60">Building</div>
                                    <div className="mt-1 font-semibold text-white">{payload.building}</div>
                                </div>
                                <div className="rounded-[1.05rem] border border-white/10 bg-white/10 px-4 py-3 text-sm">
                                    <div className="text-white/60">Floor / Scope</div>
                                    <div className="mt-1 font-semibold text-white">{payload.floor || 'Full building'}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="border-b border-slate-200 bg-slate-50 px-5 py-5 md:px-7">
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                <div className="rounded-[1.15rem] border border-slate-900 bg-slate-900 px-4 py-3.5 text-sm text-white shadow-sm shadow-slate-900/10">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="text-white/70">Total people</div>
                                        <Users size={16} className="text-white/70" />
                                    </div>
                                    <div className="mt-2 text-2xl font-semibold text-white">{progress.totalRows}</div>
                                    <div className="mt-1 text-xs text-white/70">Visible in this brief</div>
                                </div>
                                <div className="rounded-[1.15rem] border border-emerald-200 bg-emerald-50 px-4 py-3.5 text-sm text-emerald-950 shadow-sm shadow-emerald-900/5">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="text-emerald-700">
                                            {payload.role === 'HEAD' ? 'Covered now' : 'Rated now'}
                                        </div>
                                        <CheckCircle2 size={16} className="text-emerald-600" />
                                    </div>
                                    <div className="mt-2 text-2xl font-semibold text-emerald-950">{progress.coveredRows}</div>
                                    <div className="mt-1 text-xs text-emerald-700">
                                        {payload.role === 'HEAD'
                                            ? `${progress.completionPercent}% complete including senior reviews`
                                            : `${progress.completionPercent}% complete on this page`}
                                    </div>
                                </div>
                                <div className={`rounded-[1.15rem] border px-4 py-3.5 text-sm shadow-sm ${
                                    progress.isComplete
                                        ? 'border-emerald-200 bg-white text-emerald-950 shadow-emerald-900/5'
                                        : 'border-amber-200 bg-amber-50 text-amber-950 shadow-amber-900/5'
                                }`}>
                                    <div className="flex items-center justify-between gap-3">
                                        <div className={progress.isComplete ? 'text-emerald-700' : 'text-amber-700'}>
                                            Remaining
                                        </div>
                                        <AlertTriangle size={16} className={progress.isComplete ? 'text-emerald-500' : 'text-amber-500'} />
                                    </div>
                                    <div className="mt-2 text-2xl font-semibold">{progress.pendingCount}</div>
                                    <div className={`mt-1 text-xs ${progress.isComplete ? 'text-emerald-700' : 'text-amber-700'}`}>
                                        {progress.isComplete ? 'All people are rated and ready to save.' : 'Still required before saving.'}
                                    </div>
                                </div>
                                <div className="rounded-[1.15rem] border border-cyan-200 bg-cyan-50 px-4 py-3.5 text-sm text-cyan-950 shadow-sm shadow-cyan-900/5">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="text-cyan-700">
                                            {payload.role === 'HEAD' ? 'Senior synced' : 'Saved on this link'}
                                        </div>
                                        <BadgeCheck size={16} className="text-cyan-600" />
                                    </div>
                                    <div className="mt-2 text-2xl font-semibold text-cyan-950">
                                        {payload.role === 'HEAD' ? progress.seniorSyncedRows : progress.savedRows}
                                    </div>
                                    <div className="mt-1 text-xs text-cyan-700">
                                        {payload.role === 'HEAD'
                                            ? `${progress.ownRatedRows} rated by head, ${progress.seniorSyncedRows} already covered by seniors`
                                            : 'Rows already saved from this brief'}
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                                <button
                                    type="button"
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 sm:w-auto"
                                    onClick={exportExcel}
                                >
                                    <Download size={16} />
                                    <span>Export Excel</span>
                                </button>
                                <button
                                    type="button"
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cactus px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                                    onClick={() => void saveAllReviews()}
                                    disabled={viewState === 'saving'}
                                >
                                    {viewState === 'saving' ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                                    <span>{viewState === 'saving' ? 'Saving...' : 'Save changes'}</span>
                                </button>
                            </div>
                        </div>

                        <div className="mt-4 rounded-[1.15rem] border border-slate-200 bg-white p-4">
                            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                <div>
                                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Rating progress</div>
                                    <div className="mt-1 text-sm font-medium text-slate-700">
                                        {progress.isComplete
                                            ? 'Every person on this brief has a rating and the sheet is ready to save.'
                                            : payload.role === 'HEAD'
                                                ? `${progress.pendingCount} people still need head review. Senior-reviewed rows are already counted.`
                                                : `${progress.pendingCount} people still need a rating before you can save confidently.`}
                                    </div>
                                </div>
                                <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold ${
                                    progress.isComplete
                                        ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                                        : 'border border-amber-200 bg-amber-50 text-amber-700'
                                }`}>
                                    {progress.isComplete ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
                                    <span>{progress.coveredRows} / {progress.totalRows} complete</span>
                                </div>
                            </div>

                            <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
                                <div
                                    className={`h-full rounded-full transition-all ${
                                        progress.isComplete ? 'bg-emerald-500' : 'bg-cyan-600'
                                    }`}
                                    style={{ width: `${progress.completionPercent}%` }}
                                />
                            </div>
                        </div>

                        {!progress.isComplete ? (
                            <div className="mt-4 rounded-[1.15rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                                <div className="flex items-start gap-3">
                                    <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600" />
                                    <div>
                                        <div className="font-semibold">Ratings are still missing.</div>
                                        <div className="mt-1 leading-6">
                                            {payload.role === 'HEAD'
                                                ? `Finish reviewing the remaining ${progress.pendingCount} people. Rows already rated by seniors are already counted for the head.`
                                                : `Finish rating the remaining ${progress.pendingCount} people before pressing save.`}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : null}

                        <div
                            className={`mt-4 rounded-[1rem] border px-4 py-3 text-sm ${
                                viewState === 'error'
                                    ? 'border-rose-200 bg-rose-50 text-rose-700'
                                    : progress.isComplete
                                        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                        : 'border-slate-200 bg-white text-slate-600'
                            }`}
                            aria-live="polite"
                        >
                            {message}
                            <div className={`mt-1 text-xs ${
                                viewState === 'error'
                                    ? 'text-rose-600'
                                    : progress.isComplete
                                        ? 'text-emerald-700'
                                        : 'text-slate-500'
                            }`}>
                                Snapshot generated on {formatDateTime(payload.generated_at)}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 px-4 py-4 sm:px-5 md:px-7">
                        {groupedRows.map((group) => (
                            <div key={group.groupName} className="overflow-hidden rounded-[1.4rem] border border-slate-200 bg-slate-50">
                                <div className="flex flex-col gap-3 border-b border-slate-200 bg-white px-4 py-4 md:flex-row md:items-center md:justify-between">
                                    <div>
                                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Group</div>
                                        <div className="mt-1 flex items-center gap-2 text-base font-semibold text-slate-950 sm:text-lg">
                                            <Building2 size={18} className="text-slate-400" />
                                            <span>{group.groupName}</span>
                                        </div>
                                    </div>
                                    <div className="text-sm text-slate-600">{group.rows.length} rows</div>
                                </div>

                                <div className="space-y-3 p-3 sm:p-4">
                                    {group.rows.map((row) => {
                                        const visibleRating = getVisibleRating(row, payload.role);
                                        const hasCustomRating = Boolean(row.draftRating);

                                        return (
                                            <article
                                                key={row.recipient_id}
                                                id={`review-row-${row.recipient_id}`}
                                                className={`rounded-[1.25rem] border p-4 shadow-sm shadow-slate-900/5 ${
                                                    !isRowCoveredForCurrentReview(row, payload.role)
                                                        ? 'border-amber-200 bg-amber-50/50'
                                                        : row.hierarchy_role === 'SENIOR'
                                                        ? 'border-cyan-200 bg-cyan-50/40'
                                                        : 'border-slate-200 bg-white'
                                                }`}
                                            >
                                                <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
                                                    <div className="space-y-3">
                                                        <div className="min-w-0">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                                                                    Row {row.row_order}
                                                                </span>
                                                                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${roleBadgeStyles[row.hierarchy_role]}`}>
                                                                    {row.role || row.hierarchy_role}
                                                                </span>
                                                                {row.showsInheritedSeniorRating && row.linked_senior_review ? (
                                                                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                                                                        <BadgeCheck size={12} />
                                                                        <span>Senior rating synced</span>
                                                                    </span>
                                                                ) : null}
                                                                {!isRowCoveredForCurrentReview(row, payload.role) ? (
                                                                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                                                                        <AlertTriangle size={12} />
                                                                        <span>{payload.role === 'HEAD' ? 'Head review required' : 'Rating required'}</span>
                                                                    </span>
                                                                ) : null}
                                                            </div>
                                                            <h2 className="mt-2 text-base font-semibold text-slate-950 sm:text-lg">
                                                                {row.recipient_name}
                                                            </h2>
                                                        </div>

                                                        <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                                                            {row.floor ? (
                                                                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
                                                                    <Building2 size={12} className="text-slate-400" />
                                                                    <span>Floor {row.floor}</span>
                                                                </span>
                                                            ) : null}
                                                            {row.room ? (
                                                                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
                                                                    <MapPin size={12} className="text-slate-400" />
                                                                    <span>Room {row.room}</span>
                                                                </span>
                                                            ) : null}
                                                            {row.phone ? (
                                                                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
                                                                    <Phone size={12} className="text-slate-400" />
                                                                    <span>{row.phone}</span>
                                                                </span>
                                                            ) : null}
                                                            {row.email ? (
                                                                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 break-all">
                                                                    <Mail size={12} className="text-slate-400" />
                                                                    <span>{row.email}</span>
                                                                </span>
                                                            ) : null}
                                                        </div>

                                                        {payload.role === 'HEAD' && row.linked_senior_review ? (
                                                            <div className="rounded-[1.05rem] border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-950">
                                                                <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
                                                                    <BadgeCheck size={13} />
                                                                    <span>Senior feedback</span>
                                                                </div>
                                                                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                                                                    <span className="font-semibold">{row.linked_senior_review.reviewer.recipient_name}</span>
                                                                    <span className="rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-xs font-semibold text-emerald-700">
                                                                        Rating {row.linked_senior_review.rating ?? '-'}
                                                                    </span>
                                                                    {row.linked_senior_review.nominationRole ? (
                                                                        <span className="rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-xs font-semibold text-emerald-700">
                                                                            {formatNominationLabel(row.linked_senior_review.nominationRole)}
                                                                        </span>
                                                                    ) : null}
                                                                </div>
                                                                {row.linked_senior_review.comment ? (
                                                                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-emerald-900">
                                                                        {row.linked_senior_review.comment}
                                                                    </p>
                                                                ) : null}
                                                            </div>
                                                        ) : null}
                                                    </div>

                                                    <div className="space-y-3">
                                                        <div className="rounded-[1.05rem] border border-slate-200 bg-slate-50 p-3">
                                                            <div className="flex items-center justify-between gap-3">
                                                                <div>
                                                                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                                                                        <Star size={13} className="text-amber-500" />
                                                                        <span>Rating</span>
                                                                    </div>
                                                                    <div className="mt-1 text-sm text-slate-600">Tap a score from 1 to 5.</div>
                                                                </div>
                                                                {(hasCustomRating || row.showsInheritedSeniorRating) ? (
                                                                    <button
                                                                        type="button"
                                                                        className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                                                                        onClick={() => handleRowChange(row.recipient_id, 'draftRating', '')}
                                                                    >
                                                                        Clear
                                                                    </button>
                                                                ) : null}
                                                            </div>

                                                            <div className="mt-3 grid grid-cols-5 gap-2">
                                                                {ratingOptions.map((option) => {
                                                                    const active = visibleRating === option;
                                                                    const inheritedActive = row.showsInheritedSeniorRating && !hasCustomRating && active;

                                                                    return (
                                                                        <button
                                                                            key={option}
                                                                            type="button"
                                                                            onClick={() => handleRowChange(row.recipient_id, 'draftRating', option)}
                                                                            className={`flex h-11 items-center justify-center rounded-xl border text-sm font-semibold transition ${
                                                                                active
                                                                                    ? inheritedActive
                                                                                        ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                                                                                        : 'border-cyan-600 bg-cyan-600 text-white'
                                                                                    : 'border-slate-200 bg-white text-slate-700 hover:border-cyan-300 hover:text-cyan-700'
                                                                            }`}
                                                                        >
                                                                            {option}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>

                                                            {row.showsInheritedSeniorRating && row.linked_senior_review ? (
                                                                <div className="mt-3 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-medium text-emerald-700">
                                                                    Synced from senior review by {row.linked_senior_review.reviewer.recipient_name}
                                                                </div>
                                                            ) : null}
                                                        </div>

                                                        <div className="rounded-[1.05rem] border border-slate-200 bg-slate-50 p-3">
                                                            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Recommendation</div>
                                                            <div className="mt-3 flex flex-wrap gap-2">
                                                                {nominationOptions.map((option) => {
                                                                    const active = row.draftNominationRole === option.value;

                                                                    return (
                                                                        <button
                                                                            key={option.value || 'empty'}
                                                                            type="button"
                                                                            onClick={() => handleRowChange(row.recipient_id, 'draftNominationRole', option.value)}
                                                                            className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${
                                                                                active
                                                                                    ? 'border-slate-900 bg-slate-900 text-white'
                                                                                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:text-slate-900'
                                                                            }`}
                                                                        >
                                                                            {option.label}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>

                                                        <div className="rounded-[1.05rem] border border-slate-200 bg-slate-50 p-3">
                                                            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                                                                <MessageSquareText size={13} className="text-slate-400" />
                                                                <span>Comment</span>
                                                            </div>
                                                            <textarea
                                                                value={row.draftComment}
                                                                onChange={(event) => handleRowChange(row.recipient_id, 'draftComment', event.target.value)}
                                                                className="mt-3 min-h-[88px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-cyan-300 focus:bg-white"
                                                                placeholder="Add a comment"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </article>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
