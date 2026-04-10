'use client';

import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useRequireAuth } from '@/lib/use-auth';

import { REQUIRED_UPLOAD_COLUMNS, validateUploadHeaders } from './upload-utils';

export default function UploadExcelClient({ locale }: { locale: string }) {
    const { ready, isChecking, error } = useRequireAuth(locale);
    const t = useTranslations('messaging');
    const hint = useMemo(
        () => t('uploadHint') || 'Upload an Excel file with recipient data. Required columns: name, email, phone, exam_type, role, day, date, test_center, faculty, room, address, map_link, arrival_time.',
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
        const workbook = XLSX.utils.book_new();
        const rows: string[][] = [
            [...REQUIRED_UPLOAD_COLUMNS],
            ...(kind === 'sample'
                ? [[
                    'Ahmed Ali',
                    'ahmed.ali@example.com',
                    '+201001234567',
                    'EST 1',
                    'Senior',
                    'Friday',
                    '2026-04-10',
                    'Nasr City Center',
                    'Engineering',
                    'A-12',
                    'Nasr City, Cairo',
                    'https://maps.app.goo.gl/example',
                    '08:30',
                ]]
                : []),
        ];

        const worksheet = XLSX.utils.aoa_to_sheet(rows);
        XLSX.utils.book_append_sheet(workbook, worksheet, 'recipients');
        XLSX.writeFile(
            workbook,
            kind === 'sample' ? 'messaging-recipients-sample.xlsx' : 'messaging-recipients-template.xlsx',
        );
    };

    const parseWorkbook = async (file: File) => {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });

        if (rows.length < 2 || !Array.isArray(rows[0])) {
            throw new Error('The sheet must contain a header row and at least one data row.');
        }

        const rawHeaders = rows[0].map((value) => String(value || ''));
        const { normalized: headers, missing } = validateUploadHeaders(rawHeaders);
        if (missing.length) {
            throw new Error(`Missing required headers: ${missing.join(', ')}`);
        }
        const data = rows.slice(1).map((row) => {
            const values = Array.isArray(row) ? row : [];
            return headers.reduce((acc, header, index) => {
                acc[header] = values[index] ?? '';
                return acc;
            }, {} as Record<string, unknown>);
        });

        return data
            .map((row) => ({
                name: String(row.name || '').trim(),
                email: String(row.email || '').trim(),
                phone: String(row.phone || '').trim(),
                exam_type: String(row.exam_type || '').trim(),
                role: String(row.role || '').trim(),
                day: String(row.day || '').trim(),
                date: String(row.date || '').trim(),
                test_center: String(row.test_center || '').trim(),
                faculty: String(row.faculty || '').trim(),
                room: String(row.room || '').trim(),
                address: String(row.address || '').trim(),
                map_link: String(row.map_link || '').trim(),
                arrival_time: String(row.arrival_time || '').trim(),
            }))
            .filter((item) => item.name || item.email || item.phone);
    };

    const handleChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setFileName(file.name);
        setIsUploading(true);
        setPreviewCount(null);

        try {
            const rows = await parseWorkbook(file);
            if (rows.length === 0) {
                throw new Error('No recipients were found in the file.');
            }

            await api.get('/auth/csrf', { headers: { 'x-skip-activity': '1' } });
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
                        {t('uploadColumnsHint') || 'The first row must contain header names matching the field list.'}
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
