import * as XLSX from 'xlsx';

export const EXCEL_SHEET_NAMES = ['EST1', 'EST2'] as const;
export type ExcelSheetName = typeof EXCEL_SHEET_NAMES[number];

export const EXCEL_UPLOAD_HEADERS = [
    'ROOM',
    'Division',
    'Full English name (at least 4 names)',
    'Arabic Name',
    'Email',
    'Employer (School/Organization name)',
    'Kind of School',
    'Title',
    'Insurance number (الرقم التأمينى)',
    'Institution tax number (الرقم الضريبي للمنشأة أو المدرسة)',
    'National ID number',
    'National ID picture',
    'Personal Photo',
    'Preferred proctoring city',
    'Preferred test center',
    'Full name (as per bank account)',
    'Name of bank',
    'branch name',
    'Account number',
    'IBAN number (please contact your bank to get it)',
    'Role',
    'Type',
    'Governorate',
    'Address',
    'Location',
    'bank divid',
    'Additional Info 1',
    'Additional Info 2',
] as const;

export type ExcelRecipientRow = Record<string, string> & { sheet: ExcelSheetName };

export type RecipientImportRow = ExcelRecipientRow;

type HeaderField =
    | 'room_est1'
    | 'name'
    | 'email'
    | 'role'
    | 'type'
    | 'governorate'
    | 'address'
    | 'building'
    | 'location';
type DownloadKind = 'template' | 'sample';

const HEADER_ALIASES: Array<{ field: HeaderField; aliases: string[] }> = [
    {
        field: 'room_est1',
        aliases: ['room', 'roomest1', 'roomest2', 'est1room', 'est2room', 'roomest'],
    },
    {
        field: 'name',
        aliases: [
            'fullenglishnameatleast4names',
            'fullenglishname',
            'englishname',
            'fullname',
            'name',
            'fullnameasperbankaccount',
        ],
    },
    { field: 'email', aliases: ['email', 'mail', 'emailaddress', 'emailaddress'] },
    { field: 'role', aliases: ['role', 'title', 'jobtitle'] },
    { field: 'type', aliases: ['type', 'kindofschool', 'schooltype', 'kindofschoolname'] },
    { field: 'governorate', aliases: ['governorate', 'governorates', 'preferredproctoringcity', 'city'] },
    { field: 'address', aliases: ['address', 'schooladdress', 'organizationaddress'] },
    {
        field: 'building',
        aliases: [
            'building',
            'preferredtestcenter',
            'testcenter',
            'testcentername',
            'faculty',
            'employer',
            'organizationname',
        ],
    },
    { field: 'location', aliases: ['location', 'map', 'maplink', 'googlemap', 'locationonsite'] },
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

            for (const [header, index] of rawHeaders.entries()) {
                const normalizedKey = normalizeHeader(header);
                const value = String(values[index as number] ?? '').trim();
                const field = resolveHeaderField(header);

                if (field) {
                    item[field] = value;
                }

                if (normalizedKey && normalizedKey !== 'sheet') {
                    item[normalizedKey] = value;
                }
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
                    'A1',
                    'North Region',
                    'Ahmed Ali Hassan Mahmoud',
                    'أحمد علي حسن محمود',
                    'proctor@example.com',
                    'Al Amal School',
                    'Private School',
                    'Senior Supervisor',
                    '123456789',
                    '123456789',
                    '12345678901234',
                    'national-id.jpg',
                    'photo.jpg',
                    'Cairo',
                    'Al-Azhar Secondary',
                    'Ahmed Salah',
                    'National Bank',
                    'Downtown',
                    '1234567890',
                    'EG123456789012345678901234',
                    'Lead Invigilator',
                    'Written',
                    'Cairo',
                    '123 Tahrir Street',
                    'Cairo Exam Center',
                    'Bank Division',
                    'Extra info 1',
                    'Extra info 2',
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
