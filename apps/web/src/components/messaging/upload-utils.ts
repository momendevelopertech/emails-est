import * as XLSX from 'xlsx';

export const TEST_RECIPIENT_EMAILS = [
    'momenellaban210@gmail.com',
    'momen.developer.tech@gmail.com',
] as const;

export const EXCEL_SHEET_NAME = 'EST1 All';

export const EXCEL_UPLOAD_HEADERS = [
    'ROOM EST1',
    'Full English name (at least 4 names)',
    'Email',
    'Role',
    'Type',
    'Governorate',
    'Address',
    'Building',
    'Location',
] as const;

export const EXCEL_FILTER_FIELDS = [
    'room_est1',
    'name',
    'email',
    'role',
    'type',
    'governorate',
    'address',
    'building',
    'location',
] as const;

export type RecipientImportRow = {
    room_est1: string;
    name: string;
    email: string;
    role: string;
    type: string;
    governorate: string;
    address: string;
    building: string;
    location: string;
    exam_type?: string;
    test_center?: string;
    faculty?: string;
    room?: string;
    map_link?: string;
    phone?: string;
    day?: string;
    date?: string;
    arrival_time?: string;
};

type DownloadKind = 'template' | 'sample';
type SupportedSheetFormat = 'est' | 'legacy';

const LEGACY_UPLOAD_COLUMNS = [
    'name',
    'email',
    'phone',
    'exam_type',
    'role',
    'day',
    'date',
    'test_center',
    'faculty',
    'room',
    'address',
    'map_link',
    'arrival_time',
    'room_est1',
    'type',
    'governorate',
    'building',
    'location',
] as const;

const EST_DOWNLOAD_SHEETS = [
    {
        name: 'EST1 All',
        headers: [
            'ROOM EST1',
            'Full English name (at least 4 names)',
            'Email',
            'Role',
            'Type',
            'Governorate',
            'Address ',
            'Building',
            'Location',
        ],
        sampleRows: [
            [
                '201',
                'Ahmed Ali Hassan Mohamed',
                'ahmed.ali@example.com',
                'Head',
                'IP',
                'Alexandria',
                'عنوان عربي تجريبي',
                'Arab Academy Abu Qir Faculty of Pharmacy',
                'https://maps.app.goo.gl/example-est1',
            ],
        ],
    },
    {
        name: 'EST2',
        headers: [
            'ROOM EST1',
            'Division',
            'Full English name (at least 4 names)',
            'Email',
            'Role',
            'Type',
            'Governorate',
            'Address In Arabic',
            'Building',
            'Location',
        ],
        sampleRows: [
            [
                '302',
                'Sphinx Alex',
                'Mona Adel Ibrahim Hassan',
                'mona.adel@example.com',
                'Control room assistant',
                'IP',
                'Alexandria',
                'عنوان عربي تجريبي',
                'Arab Academy Abu Qir Faculty of Pharmacy',
                'https://maps.app.goo.gl/example-est2',
            ],
        ],
    },
] as const;

const isArabicInput = (value?: string | boolean) => value === true || value === 'ar';

export const normalizeHeader = (value: string) => value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const normalizeCell = (value: unknown) => String(value ?? '').trim();

const buildHeaderIndex = (headers: string[]) => new Map(headers.map((header, index) => [header, index]));

const getIndexedValue = (values: unknown[], headerIndex: Map<string, number>, header: string) => {
    const index = headerIndex.get(header);
    return index === undefined ? '' : normalizeCell(values[index]);
};

const hasMeaningfulValue = (row: RecipientImportRow) => Boolean(
    row.name
    || row.room_est1
    || row.role
    || row.type
    || row.governorate
    || row.address
    || row.building
    || row.location,
);

const compactRecipientRow = (row: Partial<RecipientImportRow>): RecipientImportRow => {
    const compacted = {} as RecipientImportRow;

    (Object.entries(row) as Array<[keyof RecipientImportRow, string | undefined]>).forEach(([key, value]) => {
        const normalized = normalizeCell(value);
        if (normalized) {
            compacted[key] = normalized;
        }
    });

    compacted.name = compacted.name || '';
    compacted.email = compacted.email || '';
    compacted.role = compacted.role || '';
    compacted.type = compacted.type || '';
    compacted.governorate = compacted.governorate || '';
    compacted.address = compacted.address || '';
    compacted.building = compacted.building || '';
    compacted.location = compacted.location || '';
    compacted.room_est1 = compacted.room_est1 || '';

    return compacted;
};

const detectSheetFormat = (normalizedHeaders: string[]): SupportedSheetFormat | null => {
    const headerSet = new Set(normalizedHeaders.filter(Boolean));

    const isEstFormat = headerSet.has('full_english_name_at_least_4_names')
        && headerSet.has('role')
        && headerSet.has('building')
        && headerSet.has('location');

    if (isEstFormat) {
        return 'est';
    }

    const isLegacyFormat = headerSet.has('name')
        && headerSet.has('role')
        && (headerSet.has('email') || headerSet.has('phone') || headerSet.has('room') || headerSet.has('room_est1'));

    if (isLegacyFormat) {
        return 'legacy';
    }

    return null;
};

const parseSheetRows = (sheet: XLSX.WorkSheet) => XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: '',
});

const buildEstRecipient = (values: unknown[], normalizedHeaders: string[], emailIndex: number) => {
    const headerIndex = buildHeaderIndex(normalizedHeaders);
    const roomEst1 = getIndexedValue(values, headerIndex, 'room_est1');
    const type = getIndexedValue(values, headerIndex, 'type');
    const governorate = getIndexedValue(values, headerIndex, 'governorate');
    const division = getIndexedValue(values, headerIndex, 'division');
    const building = getIndexedValue(values, headerIndex, 'building');
    const address = getIndexedValue(values, headerIndex, 'address_in_arabic')
        || getIndexedValue(values, headerIndex, 'address');
    const location = getIndexedValue(values, headerIndex, 'location');

    return compactRecipientRow({
        room_est1: roomEst1,
        room: roomEst1,
        name: getIndexedValue(values, headerIndex, 'full_english_name_at_least_4_names'),
        email: getAlternatingTestEmail(emailIndex),
        role: getIndexedValue(values, headerIndex, 'role'),
        type,
        exam_type: type,
        governorate,
        address,
        building,
        faculty: division,
        test_center: division || governorate,
        location,
        map_link: location,
    });
};

const buildLegacyRecipient = (values: unknown[], normalizedHeaders: string[], emailIndex: number) => {
    const headerIndex = buildHeaderIndex(normalizedHeaders);
    const roomEst1 = getIndexedValue(values, headerIndex, 'room_est1')
        || getIndexedValue(values, headerIndex, 'room');
    const type = getIndexedValue(values, headerIndex, 'type')
        || getIndexedValue(values, headerIndex, 'exam_type');
    const building = getIndexedValue(values, headerIndex, 'building')
        || getIndexedValue(values, headerIndex, 'test_center');
    const location = getIndexedValue(values, headerIndex, 'location')
        || getIndexedValue(values, headerIndex, 'map_link');

    return compactRecipientRow({
        room_est1: roomEst1,
        room: roomEst1,
        name: getIndexedValue(values, headerIndex, 'name'),
        email: getAlternatingTestEmail(emailIndex),
        role: getIndexedValue(values, headerIndex, 'role'),
        type,
        exam_type: getIndexedValue(values, headerIndex, 'exam_type') || type,
        governorate: getIndexedValue(values, headerIndex, 'governorate'),
        address: getIndexedValue(values, headerIndex, 'address'),
        building,
        faculty: getIndexedValue(values, headerIndex, 'faculty'),
        test_center: getIndexedValue(values, headerIndex, 'test_center'),
        location,
        map_link: getIndexedValue(values, headerIndex, 'map_link') || location,
        phone: getIndexedValue(values, headerIndex, 'phone'),
        day: getIndexedValue(values, headerIndex, 'day'),
        date: getIndexedValue(values, headerIndex, 'date'),
        arrival_time: getIndexedValue(values, headerIndex, 'arrival_time'),
    });
};

export function getAlternatingTestEmail(index: number) {
    return TEST_RECIPIENT_EMAILS[index % TEST_RECIPIENT_EMAILS.length];
}

export function validateUploadHeaders(headers: string[]) {
    const normalized = headers.map((header) => normalizeHeader(header));
    const required = EXCEL_UPLOAD_HEADERS.map((header) => normalizeHeader(header));
    const missing = required.filter((header) => !normalized.includes(header));

    return { normalized, missing };
}

export function getUploadHint(locale?: string | boolean) {
    if (isArabicInput(locale)) {
        return 'ارفع ملف EST الرسمي مباشرة، وسيتم قبول الشيتات المدعومة مثل EST1 All وEST2، مع استبدال الإيميلات تلقائيًا بإيميلات التست أثناء الاستيراد.';
    }

    return 'Upload the official EST workbook directly. Supported sheets like EST1 All and EST2 are imported automatically, and recipient emails are replaced with the configured test addresses during import.';
}

export function buildDownloadWorkbook(kind: DownloadKind) {
    const workbook = XLSX.utils.book_new();

    EST_DOWNLOAD_SHEETS.forEach((sheetDef) => {
        const rows = [
            [...sheetDef.headers],
            ...(kind === 'sample' ? sheetDef.sampleRows.map((row) => [...row]) : []),
        ];
        const worksheet = XLSX.utils.aoa_to_sheet(rows);
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetDef.name);
    });

    return workbook;
}

export function downloadWorkbook(kind: DownloadKind) {
    const workbook = buildDownloadWorkbook(kind);
    const fileName = kind === 'sample'
        ? 'messaging-est-recipients-sample.xlsx'
        : 'messaging-est-recipients-template.xlsx';

    XLSX.writeFile(workbook, fileName);
}

export async function parseRecipientWorkbook(file: File, locale?: string | boolean) {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    let emailIndex = 0;

    const parsedRows = workbook.SheetNames.flatMap((sheetName) => {
        const sheet = workbook.Sheets[sheetName];
        const rows = parseSheetRows(sheet);

        if (rows.length < 2 || !Array.isArray(rows[0])) {
            return [];
        }

        const normalizedHeaders = rows[0].map((value) => normalizeHeader(String(value || '')));
        const format = detectSheetFormat(normalizedHeaders);
        if (!format) {
            return [];
        }

        return rows
            .slice(1)
            .map((row) => {
                const values = Array.isArray(row) ? row : [];
                const currentEmailIndex = emailIndex;
                emailIndex += 1;

                return format === 'est'
                    ? buildEstRecipient(values, normalizedHeaders, currentEmailIndex)
                    : buildLegacyRecipient(values, normalizedHeaders, currentEmailIndex);
            })
            .filter(hasMeaningfulValue);
    });

    if (!parsedRows.length) {
        throw new Error(isArabicInput(locale)
            ? 'صيغة الملف غير مدعومة. ارفع ملف EST الرسمي أو استخدم التيمبلت الحالي الخاص بالرسائل.'
            : 'Unsupported workbook format. Upload the official EST workbook or use the current messaging template.');
    }

    return parsedRows;
}

export async function parseWorkbook(file: File, locale?: string | boolean) {
    return parseRecipientWorkbook(file, locale);
}

export function getImportErrorMessage(error: any, fallbackMessage: string) {
    const serverMessage = error?.response?.data?.message;

    if (Array.isArray(serverMessage)) {
        return serverMessage.join(', ');
    }

    if (typeof serverMessage === 'string' && serverMessage.trim()) {
        return serverMessage;
    }

    return error?.message || fallbackMessage;
}

export const LEGACY_TEMPLATE_HEADERS = [...LEGACY_UPLOAD_COLUMNS];
