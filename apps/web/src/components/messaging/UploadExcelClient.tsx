'use client';

import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import api, { fetchCsrfToken } from '@/lib/api';
import { useRequireAuth } from '@/lib/use-auth';

import { buildDownloadWorkbook, EXCEL_UPLOAD_HEADERS, parseRecipientWorkbook } from './upload-utils';

export default function UploadExcelClient({ locale }: { locale: string }) {
    const { ready, isChecking, error } = useRequireAuth(locale);
    const t = useTranslations('messaging');
    const hint = useMemo(
        () => t('uploadHint') || `Upload an Excel file with recipient data. Required columns: ${EXCEL_UPLOAD_HEADERS.join(', ')}.`,
        [t],
    );
    const [fileName, setFileName] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [previewCount, setPreviewCount] = useState<number | null>(null);

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
        const workbook = buildDownloadWorkbook(kind);
        const fileName = kind === 'sample' ? 'messaging-est1-sample.xlsx' : 'messaging-est1-template.xlsx';
        XLSX.writeFile(workbook, fileName);
    };

    const handleChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setFileName(file.name);
        setIsUploading(true);
        setPreviewCount(null);

        try {
            const rows = await parseRecipientWorkbook(file, locale === 'ar');
            if (rows.length === 0) {
                throw new Error('No recipients were found in the file.');
            }

            await fetchCsrfToken();
            await api.post('/messaging/recipients/import', { recipients: rows });
            setPreviewCount(rows.length);
            toast.success(t('uploadSuccess') || `Imported ${rows.length} recipients successfully.`);
        } catch (error: any) {
            toast.error(error?.message || t('uploadError') || 'Unable to import recipients.');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <section className="space-y-6 py-6">
            <div>
                <h1 className="text-3xl font-semibold">{t('uploadTitle') || 'Upload Excel'}</h1>
                <p className="mt-2 max-w-2xl text-sm text-slate-500">{hint}</p>
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <label className="block text-sm font-medium text-slate-700">{t('selectFile') || 'Select Excel file'}</label>
                    <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                        <input
                            type="file"
                            accept=".xlsx,.xls"
                            disabled={isUploading}
                            className="file-input"
                            onChange={handleChange}
                        />
                        <span className="text-sm text-slate-500">{fileName || (t('noFileSelected') || 'No file selected')}</span>
                    </div>
                    {previewCount !== null && (
                        <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
                            {t('importedCount', { count: previewCount }) || `${previewCount} recipients imported.`}
                        </div>
                    )}
                    <div className="mt-4 text-xs text-slate-500">
                        {t('uploadColumnsHint') || 'The first row must contain the same Excel headers used in the EST1 sheet.'}
                    </div>
                </div>

                <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-slate-900">{t('downloadCenterTitle') || 'Download files'}</h2>
                    <p className="mt-2 text-sm text-slate-500">
                        {t('downloadCenterHint') || 'Download a blank template or a pre-filled sample to test quickly.'}
                    </p>
                    <div className="mt-4 flex flex-col gap-3">
                        <button type="button" className="btn-outline" onClick={() => downloadWorkbook('template')}>
                            {t('downloadTemplate') || 'Download template'}
                        </button>
                        <button type="button" className="btn-secondary" onClick={() => downloadWorkbook('sample')}>
                            {t('downloadSample') || 'Download sample'}
                        </button>
                    </div>
                    <p className="mt-4 text-xs text-slate-500">
                        {t('downloadNote') || 'Template contains only headers. Sample contains one test row with the same headers.'}
                    </p>
                </aside>
            </div>
        </section>
    );
}
