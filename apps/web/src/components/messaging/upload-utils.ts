import * as XLSX from 'xlsx';

export const EXCEL_SHEET_NAMES = ['EST1', 'EST2'] as const;
export type ExcelSheetName = typeof EXCEL_SHEET_NAMES[number];

export const EXCEL_UPLOAD_HEADERS = [
    'ROOM',
    'Full English name (at least 4 names)',
    'Email',
    'Role',
    'Type',
    'Governorate',
    'Address',
    'Building',
    'Location',
] as const;

export type ExcelRecipientRow = {
    room_est1: string;
    name: string;
    email: string;
    role: string;
    type: string;
    governorate: string;
    address: string;
    building: string;
    location: string;
    sheet: ExcelSheetName;
};

export type RecipientImportRow = ExcelRecipientRow;

type HeaderField = keyof Omit<ExcelRecipientRow, 'sheet'>;
type DownloadKind = 'template' | 'sample';

const HEADER_ALIASES: Array<{ field: HeaderField; aliases: string[] }> = [
    { field: 'room_est1', aliases: ['room', 'roomest1', 'roomest2', 'est1room', 'est2room'] },
    {
        field: 'name',
        aliases: [
            'fullenglishnameatleast4names',
            'fullenglishname',
            'englishname',
            'fullname',
            'name',
        ],
    },
    { field: 'email', aliases: ['email', 'mail', 'emailaddress'] },
    { field: 'role', aliases: ['role'] },
    { field: 'type', aliases: ['type'] },
    { field: 'governorate', aliases: ['governorate', 'governorates'] },
    { field: 'address', aliases: ['address'] },
    { field: 'building', aliases: ['building'] },
    { field: 'location', aliases: ['location', 'map', 'maplink', 'googlemap'] },
];

const isArabicInput = (value?: string | boolean) => value === true || value === 'ar';

const normalizeHeader = (value: unknown) => String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[_\s\t\r\n-]+/g, '')
    .replace(/[()]/g, '')
    .replace(/[^a-z0-9]/g, '');

const detectSheetName = (value: string): ExcelSheetName | null => {
    const normalized = value.trim().toUpperCase();
    if (normalized.startsWith('EST1')) return 'EST1';
    if (normalized.startsWith('EST2')) return 'EST2';
    return null;
};

const resolveHeaderField = (header: unknown): HeaderField | null => {
    const normalized = normalizeHeader(header);
    if (!normalized) return null;

    const match = HEADER_ALIASES.find((entry) => entry.aliases.some((alias) => normalized.includes(alias)));
    return match?.field ?? null;
};

const createEmptyRow = (sheet: ExcelSheetName): ExcelRecipientRow => ({
    room_est1: '',
    name: '',
    email: '',
    role: '',
    type: '',
    governorate: '',
    address: '',
    building: '',
    location: '',
    sheet,
});

function buildSheetRows(rows: unknown[][], sheet: ExcelSheetName, isArabic: boolean) {
    if (rows.length < 2 || !Array.isArray(rows[0])) {
        return [] as ExcelRecipientRow[];
    }

    const rawHeaders = rows[0].map((value) => String(value || ''));
    const headerIndexes = rawHeaders.reduce((acc, header, index) => {
        const field = resolveHeaderField(header);
        if (field && acc[field] === undefined) {
            acc[field] = index;
        }
        return acc;
    }, {} as Partial<Record<HeaderField, number>>);

    const requiredFields: HeaderField[] = ['room_est1', 'name', 'email', 'role', 'type', 'governorate', 'address', 'building', 'location'];
    const missing = requiredFields.filter((field) => headerIndexes[field] === undefined);
    if (missing.length) {
        const message = isArabic
            ? `الأعمدة الناقصة في شيت ${sheet}: ${missing.join(', ')}`
            : `Missing required headers in ${sheet}: ${missing.join(', ')}`;
        throw new Error(message);
    }

    return rows
        .slice(1)
        .map((row) => {
            const values = Array.isArray(row) ? row : [];
            const item = createEmptyRow(sheet);

            for (const field of requiredFields) {
                const index = headerIndexes[field];
                item[field] = String(index === undefined ? '' : values[index] ?? '').trim();
            }

            return item;
        })
        .filter((item) => Object.entries(item).some(([key, value]) => key === 'sheet' ? false : Boolean(value)));
}

export function buildDownloadWorkbook(kind: DownloadKind) {
    const workbook = XLSX.utils.book_new();

    for (const sheet of EXCEL_SHEET_NAMES) {
        const headerRow = [
            sheet === 'EST2' ? 'ROOM EST2' : 'ROOM',
            ...EXCEL_UPLOAD_HEADERS.slice(1),
        ];

        const rows: string[][] = [
            headerRow,
            ...(kind === 'sample'
                ? [[
                    'AASTM-Abuqir',
                    'Ahmed Ali Hassan Mahmoud',
                    'proctor@example.com',
                    sheet === 'EST1' ? 'Head of EST' : 'Control room assistant',
                    'IP',
                    'Alexandria',
                    'Arab Academy, Abu Qir, Alexandria',
                    'Arab Academy Abu Qir Faculty of Pharmacy',
                    'https://maps.app.goo.gl/example',
                ]]
                : []),
        ];

        const worksheet = XLSX.utils.aoa_to_sheet(rows);
        XLSX.utils.book_append_sheet(workbook, worksheet, sheet);
    }

    return workbook;
}

export function downloadWorkbook(kind: DownloadKind) {
    const workbook = buildDownloadWorkbook(kind);
    const fileName = kind === 'sample' ? 'messaging-est-cycle-sample.xlsx' : 'messaging-est-cycle-template.xlsx';
    XLSX.writeFile(workbook, fileName);
}

export function getUploadHint(locale?: string | boolean) {
    if (isArabicInput(locale)) {
        return 'ارفع ملف EST الرسمي مباشرة. النظام يقرأ EST1 وEST2، يقبل اختلافات الهيدر الشائعة، ويحفظ كل رفع داخل دورة مستقلة جديدة.';
    }

    return 'Upload the official EST workbook directly. EST1 and EST2 are parsed automatically, flexible headers are supported, and every upload is stored as a separate cycle.';
}

export function getImportErrorMessage(error: any, fallback: string) {
    return error?.response?.data?.message || error?.message || fallback;
}

export async function parseRecipientWorkbook(file: File, localeOrArabic: string | boolean) {
    const isArabic = isArabicInput(localeOrArabic);
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const matchingSheets = workbook.SheetNames
        .map((sheetName) => ({ sheetName, normalized: detectSheetName(sheetName) }))
        .filter((entry): entry is { sheetName: string; normalized: ExcelSheetName } => !!entry.normalized);

    if (!matchingSheets.length) {
        throw new Error(isArabic
            ? 'الملف يجب أن يحتوي على شيت EST1 أو EST2 على الأقل.'
            : 'The workbook must contain at least one EST1 or EST2 sheet.');
    }

    const recipients = matchingSheets.flatMap(({ sheetName, normalized }) => {
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });
        return buildSheetRows(rows, normalized, isArabic);
    });

    return {
        sourceFileName: file.name,
        recipients,
    };
}
