'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
    ArrowLeftRight,
    CheckCircle2,
    Download,
    FileSpreadsheet,
    TableProperties,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import api, { fetchCsrfToken } from '@/lib/api';
import { useRequireAuth } from '@/lib/use-auth';

import {
    downloadWorkbook as downloadRecipientWorkbook,
    getImportErrorMessage,
    getUploadHint,
    parseRecipientWorkbook,
} from './upload-utils';

export default function UploadExcelClient({ locale }: { locale: string }) {
    const { ready, isChecking, error } = useRequireAuth(locale);
    const t = useTranslations('messaging');
    const queryClient = useQueryClient();
    const hint = useMemo(() => getUploadHint(locale), [locale]);
    const [fileName, setFileName] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [previewCount, setPreviewCount] = useState<number | null>(null);
    const isArabic = locale === 'ar';
    const cardClass = 'rounded-[2rem] border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-900/5 md:p-6';

    if (isChecking) {
        return (
            <section className="py-6">
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <p className="text-sm text-slate-600">{t('loading') || 'Checking session...'}</p>
                </div>
            </section>
        );
    }

    if (!ready && error === 'network') {
        return (
            <section className="py-6">
                <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 shadow-sm">
                    <h1 className="text-lg font-semibold text-rose-900">{t('uploadUnavailableTitle') || 'Upload is temporarily unavailable'}</h1>
                    <p className="mt-2 text-sm text-rose-800">
                        {t('uploadUnavailableHint') || 'The app could not verify your session due to a network or API issue. Please refresh and try again.'}
                    </p>
                    <button type="button" className="btn-danger mt-4" onClick={() => window.location.reload()}>
                        {t('retry') || 'Retry'}
                    </button>
                </div>
            </section>
        );
    }

    if (!ready) {
        return null;
    }

    const downloadWorkbook = (kind: 'template' | 'sample') => {
        downloadRecipientWorkbook(kind);
    };

    const handleChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setFileName(file.name);
        setIsUploading(true);
        setPreviewCount(null);

        try {
            const parsedWorkbook = await parseRecipientWorkbook(file, locale);
            if (parsedWorkbook.recipients.length === 0) {
                throw new Error('No recipients were found in the file.');
            }

            await fetchCsrfToken();
            await api.post('/messaging/recipients/import', {
                source_file_name: parsedWorkbook.sourceFileName,
                recipients: parsedWorkbook.recipients,
            });
            setPreviewCount(parsedWorkbook.recipients.length);
            void queryClient.invalidateQueries({ queryKey: ['sheet-manager-cycles'] });
            void queryClient.invalidateQueries({ queryKey: ['sheet-manager'] });
            void queryClient.invalidateQueries({ queryKey: ['messaging-recipients'] });
            void queryClient.invalidateQueries({ queryKey: ['messaging-recipient-filter-options'] });
            toast.success(t('uploadSuccess') || `Imported ${parsedWorkbook.recipients.length} recipients successfully.`);
        } catch (error: any) {
            toast.error(getImportErrorMessage(error, t('uploadError') || 'Unable to import recipients.'));
        } finally {
            setIsUploading(false);
            event.target.value = '';
        }
    };

    return (
        <section className="space-y-6 py-6">
            {/* ── Top cards ── */}
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_340px]">
                <div className="rounded-[2rem] border border-slate-200/80 bg-white/95 p-6 shadow-xl shadow-slate-900/5">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-3">
                            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                                <CheckCircle2 size={14} />
                                <span>{isArabic ? 'صفحة رفع مستقلة وسريعة' : 'Dedicated upload workspace'}</span>
                            </div>
                            <div>
                                <h1 className="text-3xl font-semibold text-slate-950">{t('uploadTitle') || 'Upload Excel'}</h1>
                                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{hint}</p>
                            </div>
                        </div>

                        <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                            <div className="font-semibold text-slate-900">{isArabic ? 'الشيتات المدعومة' : 'Supported sheets'}</div>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                                {['EST1', 'EST2', 'Spare', 'Blacklist'].map((s) => (
                                    <span key={s} className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-semibold text-slate-700">{s}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className={`${cardClass} grid gap-3 sm:grid-cols-2 xl:grid-cols-1`}>
                    <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{isArabic ? 'الحالة' : 'Status'}</div>
                        <div className="mt-3 text-2xl font-semibold text-slate-950">{isUploading ? (isArabic ? 'جارٍ الرفع' : 'Uploading') : (isArabic ? 'جاهز' : 'Ready')}</div>
                    </div>
                    <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{isArabic ? 'آخر استيراد' : 'Latest import'}</div>
                        <div className="mt-3 text-2xl font-semibold text-slate-950">{previewCount ?? 0}</div>
                    </div>
                </div>
            </div>

            {/* ── Upload card + Downloads ── */}
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                <div className={cardClass}>
                    <div className="flex items-start gap-3">
                        <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700">
                            <FileSpreadsheet size={22} />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-slate-950">{isArabic ? 'رفع ملف Excel' : 'Upload Excel file'}</h2>
                            <p className="mt-2 text-sm leading-6 text-slate-500">
                                {isArabic
                                    ? 'اختر ملف الـ Excel وسيتم استيراد المستلمين من كل الشيتات (EST1, EST2, Spare, Blacklist) مباشرة.'
                                    : 'Choose the Excel workbook — all sheets (EST1, EST2, Spare, Blacklist) are imported automatically.'}
                            </p>
                        </div>
                    </div>

                    <div className="mt-6 rounded-[1.75rem] border border-dashed border-slate-300 bg-slate-50 p-4 md:p-5">
                        <label className="block text-sm font-medium text-slate-700">{t('selectFile') || 'Select Excel file'}</label>
                        <div className="mt-4">
                            <input
                                type="file"
                                accept=".xlsx,.xls"
                                disabled={isUploading}
                                className="file-input"
                                onChange={handleChange}
                            />
                        </div>
                        <div className="mt-4 rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                            {fileName || (t('noFileSelected') || 'No file selected')}
                        </div>
                        <div className="mt-4 text-xs leading-6 text-slate-500">
                            {t('uploadColumnsHint') || 'EST1, EST2, Spare and Blacklist sheets are all parsed automatically.'}
                        </div>
                    </div>

                    {/* Success banner */}
                    {previewCount !== null && (
                        <div className="mt-5 rounded-[1.5rem] border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-900">
                            <div className="flex items-center gap-2 font-semibold">
                                <CheckCircle2 size={16} className="text-emerald-600" />
                                {t('importedCount', { count: previewCount }) || `${previewCount} recipients imported.`}
                            </div>
                            <p className="mt-1.5 text-xs text-emerald-700">
                                {isArabic
                                    ? 'تم استيراد كل الشيتات بنجاح. تقدر تكمل النقل والمراجعة من صفحة المستلمين مباشرة.'
                                    : 'All sheets were imported successfully. Continue move and review actions directly from the recipients page.'}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <Link href={`/${locale}/messaging?tab=recipients`} className="btn-outline">
                                    <TableProperties size={16} />
                                    <span>{isArabic ? 'افتح صفحة المستلمين' : 'Open recipients page'}</span>
                                </Link>
                            </div>
                        </div>
                    )}
                </div>

                <aside className={`${cardClass} space-y-5`}>
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900">{t('downloadCenterTitle') || 'Download files'}</h2>
                        <p className="mt-2 text-sm leading-6 text-slate-500">
                            {t('downloadCenterHint') || 'Download a blank template or a pre-filled sample to test quickly.'}
                        </p>
                    </div>

                    <div className="space-y-3">
                        <button type="button" className="btn-outline w-full justify-between px-4" onClick={() => downloadWorkbook('template')}>
                            <span>{t('downloadTemplate') || 'Download template'}</span>
                            <Download size={16} />
                        </button>
                        <button type="button" className="btn-secondary w-full justify-between px-4" onClick={() => downloadWorkbook('sample')}>
                            <span>{t('downloadSample') || 'Download sample'}</span>
                            <Download size={16} />
                        </button>
                    </div>

                    {/* Sheet swap legend */}
                    <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 space-y-2.5">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                            {isArabic ? 'كيف يعمل التبديل' : 'How swapping works'}
                        </p>
                        <div className="space-y-2 text-xs text-slate-600">
                            <div className="flex items-start gap-2">
                                <ArrowLeftRight size={12} className="mt-0.5 shrink-0 text-amber-500" />
                                <span>{isArabic ? 'EST1/EST2 → Spare: لو المراقب اعتذر نقله للسبير.' : 'EST1/EST2 → Spare: move apologising proctors.'}</span>
                            </div>
                            <div className="flex items-start gap-2">
                                <ArrowLeftRight size={12} className="mt-0.5 shrink-0 text-sky-500" />
                                <span>{isArabic ? 'Spare → EST1/EST2: استبدل المعتذر بالسبير.' : 'Spare → EST1/EST2: replace with a spare proctor.'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 text-xs leading-6 text-slate-500">
                        {t('downloadNote') || 'The downloaded files mirror the official EST workbook structure.'}
                    </div>
                </aside>
            </div>

        </section>
    );
}
