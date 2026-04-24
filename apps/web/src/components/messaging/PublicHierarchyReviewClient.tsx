'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Building2, Download, Loader2, Save, Star, Users } from 'lucide-react';
import * as XLSX from 'xlsx';
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

    const handleRowChange = (
        recipientId: string,
        field: 'draftRating' | 'draftComment' | 'draftNominationRole',
        value: string,
    ) => {
        setRows((current) => current.map((row) => (
            row.recipient_id === recipientId
                ? {
                    ...row,
                    [field]: value,
                    ...(field === 'draftRating' ? { showsInheritedSeniorRating: false } : {}),
                }
                : row
        )));
    };

    const saveAllReviews = async () => {
        if (!payload) {
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
            <div className="mx-auto max-w-[1700px] space-y-5">
                <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-900/5">
                    <div className="bg-[#171717] px-6 py-8 text-white md:px-8">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="min-w-0">
                                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-white/80">
                                    <Users size={14} />
                                    <span>{payload.role === 'HEAD' ? 'Head review sheet' : 'Senior review sheet'}</span>
                                </div>
                                <h1 className="mt-4 text-3xl font-semibold leading-tight text-white sm:text-4xl">
                                    {payload.reviewer.recipient_name}
                                </h1>
                                <p className="mt-3 max-w-3xl text-sm leading-7 text-white/75">
                                    This sheet is public and does not require login. Rate the listed people from 1 to 5, add comments,
                                    and recommend who can step up to roaming or senior responsibilities.
                                </p>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="rounded-[1.2rem] border border-white/10 bg-white/10 px-4 py-3 text-sm">
                                    <div className="text-white/60">Building</div>
                                    <div className="mt-1 font-semibold text-white">{payload.building}</div>
                                </div>
                                <div className="rounded-[1.2rem] border border-white/10 bg-white/10 px-4 py-3 text-sm">
                                    <div className="text-white/60">Floor / Scope</div>
                                    <div className="mt-1 font-semibold text-white">{payload.floor || 'Full building'}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="border-b border-slate-200 bg-slate-50 px-6 py-5 md:px-8">
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                            <div className="grid gap-3 sm:grid-cols-3">
                                <div className="rounded-[1.1rem] border border-slate-200 bg-white px-4 py-3 text-sm">
                                    <div className="text-slate-500">Rows</div>
                                    <div className="mt-1 text-lg font-semibold text-slate-950">{payload.summary.total_rows}</div>
                                </div>
                                <div className="rounded-[1.1rem] border border-slate-200 bg-white px-4 py-3 text-sm">
                                    <div className="text-slate-500">Saved by this sheet</div>
                                    <div className="mt-1 text-lg font-semibold text-slate-950">{payload.summary.reviewed_rows}</div>
                                </div>
                                <div className="rounded-[1.1rem] border border-slate-200 bg-white px-4 py-3 text-sm">
                                    <div className="text-slate-500">Senior updates</div>
                                    <div className="mt-1 text-lg font-semibold text-slate-950">{payload.summary.senior_reviewed_rows}</div>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-3">
                                <button
                                    type="button"
                                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                                    onClick={exportExcel}
                                >
                                    <Download size={16} />
                                    <span>Export Excel</span>
                                </button>
                                <button
                                    type="button"
                                    className="inline-flex items-center gap-2 rounded-xl bg-cactus px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                                    onClick={() => void saveAllReviews()}
                                    disabled={viewState === 'saving'}
                                >
                                    {viewState === 'saving' ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                                    <span>{viewState === 'saving' ? 'Saving...' : 'Save changes'}</span>
                                </button>
                            </div>
                        </div>

                        <div className="mt-3 rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                            {message}
                            <div className="mt-1 text-xs text-slate-500">Snapshot generated on {formatDateTime(payload.generated_at)}</div>
                        </div>
                    </div>

                    <div className="space-y-5 px-6 py-6 md:px-8">
                        {groupedRows.map((group) => (
                            <div key={group.groupName} className="overflow-hidden rounded-[1.6rem] border border-slate-200 bg-slate-50">
                                <div className="flex flex-col gap-3 border-b border-slate-200 bg-white px-4 py-4 md:flex-row md:items-center md:justify-between">
                                    <div>
                                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Group</div>
                                        <div className="mt-1 flex items-center gap-2 text-lg font-semibold text-slate-950">
                                            <Building2 size={18} className="text-slate-400" />
                                            <span>{group.groupName}</span>
                                        </div>
                                    </div>
                                    <div className="text-sm text-slate-600">{group.rows.length} rows</div>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="min-w-[1250px] divide-y divide-slate-200 text-left text-sm">
                                        <thead className="bg-slate-100 text-slate-600">
                                            <tr>
                                                <th className="px-3 py-3 text-left">Row</th>
                                                <th className="px-3 py-3 text-left">Rating</th>
                                                <th className="px-3 py-3 text-left">Name</th>
                                                <th className="px-3 py-3 text-left">Role</th>
                                                <th className="px-3 py-3 text-left">Floor</th>
                                                <th className="px-3 py-3 text-left">Room</th>
                                                <th className="px-3 py-3 text-left">Phone</th>
                                                <th className="px-3 py-3 text-left">Email</th>
                                                <th className="px-3 py-3 text-left">Comment</th>
                                                <th className="px-3 py-3 text-left">Recommendation</th>
                                                {payload.role === 'HEAD' ? (
                                                    <th className="px-3 py-3 text-left">Senior feedback</th>
                                                ) : null}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 bg-white">
                                            {group.rows.map((row) => (
                                                <tr key={row.recipient_id} className={row.hierarchy_role === 'SENIOR' ? 'bg-cyan-50/50' : ''}>
                                                    <td className="px-3 py-3 align-top text-slate-700">{row.row_order}</td>
                                                    <td className="px-3 py-3 align-top">
                                                        <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
                                                            <Star size={14} className="text-amber-500" />
                                                            <select
                                                                value={getVisibleRating(row, payload.role)}
                                                                onChange={(event) => handleRowChange(row.recipient_id, 'draftRating', event.target.value)}
                                                                className="bg-transparent text-sm font-medium text-slate-900 outline-none"
                                                            >
                                                                <option value="">-</option>
                                                                <option value="1">1</option>
                                                                <option value="2">2</option>
                                                                <option value="3">3</option>
                                                                <option value="4">4</option>
                                                                <option value="5">5</option>
                                                            </select>
                                                        </div>
                                                        {row.showsInheritedSeniorRating && row.linked_senior_review ? (
                                                            <div className="mt-2 text-xs font-medium text-emerald-700">
                                                                Synced from senior: {row.linked_senior_review.reviewer.recipient_name}
                                                            </div>
                                                        ) : null}
                                                    </td>
                                                    <td className="px-3 py-3 align-top">
                                                        <div className="font-semibold text-slate-950">{row.recipient_name}</div>
                                                        {row.group_name && payload.role === 'HEAD' && row.hierarchy_role === 'INVIGILATOR' ? (
                                                            <div className="mt-1 text-xs text-slate-500">Senior: {row.group_name}</div>
                                                        ) : null}
                                                    </td>
                                                    <td className="px-3 py-3 align-top">
                                                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${roleBadgeStyles[row.hierarchy_role]}`}>
                                                            {row.role || row.hierarchy_role}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-3 align-top text-slate-700">{row.floor || '-'}</td>
                                                    <td className="px-3 py-3 align-top text-slate-700">{row.room || '-'}</td>
                                                    <td className="px-3 py-3 align-top text-slate-700">{row.phone || '-'}</td>
                                                    <td className="px-3 py-3 align-top text-slate-700">{row.email || '-'}</td>
                                                    <td className="px-3 py-3 align-top">
                                                        <textarea
                                                            value={row.draftComment}
                                                            onChange={(event) => handleRowChange(row.recipient_id, 'draftComment', event.target.value)}
                                                            className="min-h-[78px] w-[260px] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-cyan-300 focus:bg-white"
                                                            placeholder="Add a comment"
                                                        />
                                                    </td>
                                                    <td className="px-3 py-3 align-top">
                                                        <select
                                                            value={row.draftNominationRole}
                                                            onChange={(event) => handleRowChange(row.recipient_id, 'draftNominationRole', event.target.value)}
                                                            className="min-w-[190px] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-cyan-300 focus:bg-white"
                                                        >
                                                            {nominationOptions.map((option) => (
                                                                <option key={option.value || 'empty'} value={option.value}>
                                                                    {option.label}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    {payload.role === 'HEAD' ? (
                                                        <td className="px-3 py-3 align-top">
                                                            {row.linked_senior_review ? (
                                                                <div className="w-[260px] rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-xs text-emerald-900">
                                                                    <div className="font-semibold">{row.linked_senior_review.reviewer.recipient_name}</div>
                                                                    <div className="mt-1">Rating: {row.linked_senior_review.rating ?? '-'}</div>
                                                                    <div className="mt-1">Recommendation: {formatNominationLabel(row.linked_senior_review.nominationRole)}</div>
                                                                    <div className="mt-1 whitespace-pre-wrap text-emerald-800">{row.linked_senior_review.comment || '-'}</div>
                                                                </div>
                                                            ) : (
                                                                <span className="text-xs text-slate-400">No senior feedback yet</span>
                                                            )}
                                                        </td>
                                                    ) : null}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
