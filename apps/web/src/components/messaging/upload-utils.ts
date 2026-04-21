import * as XLSX from 'xlsx';

export const EXCEL_SHEET_NAMES = ['EST1', 'EST2'] as const;
export type ExcelSheetName = typeof EXCEL_SHEET_NAMES[number];

export const EXCEL_UPLOAD_HEADERS = [
    'ROOM EST1',
    'Division',
    'Full English name (at least 4 names)',
    'Arabic Name',
    'Email',
    'Mobile number',
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
    'Building',
    'Location',
    'bank divid',
    'Additional Info 1',
    'Additional Info 2',
] as const;

export const RECIPIENT_EXCEL_FIELDS = [
    'room_est1',
    'division',
    'name',
    'arabic_name',
    'email',
    'phone',
    'employer',
    'kind_of_school',
    'title',
    'insurance_number',
    'institution_tax_number',
    'national_id_number',
    'national_id_picture',
    'personal_photo',
    'preferred_proctoring_city',
    'preferred_test_center',
    'bank_account_name',
    'bank_name',
    'bank_branch_name',
    'account_number',
    'iban_number',
    'role',
    'type',
    'governorate',
    'address',
    'building',
    'location',
    'bank_divid',
    'additional_info_1',
    'additional_info_2',
] as const;

export type RecipientExcelField = typeof RECIPIENT_EXCEL_FIELDS[number];
export type ExcelRecipientRow = Record<RecipientExcelField, string> & { sheet: ExcelSheetName };
export type RecipientImportRow = ExcelRecipientRow;

type DownloadKind = 'template' | 'sample';

const FIELD_TO_HEADER: Record<RecipientExcelField, string> = {
    room_est1: EXCEL_UPLOAD_HEADERS[0],
    division: EXCEL_UPLOAD_HEADERS[1],
    name: EXCEL_UPLOAD_HEADERS[2],
    arabic_name: EXCEL_UPLOAD_HEADERS[3],
    email: EXCEL_UPLOAD_HEADERS[4],
    phone: EXCEL_UPLOAD_HEADERS[5],
    employer: EXCEL_UPLOAD_HEADERS[6],
    kind_of_school: EXCEL_UPLOAD_HEADERS[7],
    title: EXCEL_UPLOAD_HEADERS[8],
    insurance_number: EXCEL_UPLOAD_HEADERS[9],
    institution_tax_number: EXCEL_UPLOAD_HEADERS[10],
    national_id_number: EXCEL_UPLOAD_HEADERS[11],
    national_id_picture: EXCEL_UPLOAD_HEADERS[12],
    personal_photo: EXCEL_UPLOAD_HEADERS[13],
    preferred_proctoring_city: EXCEL_UPLOAD_HEADERS[14],
    preferred_test_center: EXCEL_UPLOAD_HEADERS[15],
    bank_account_name: EXCEL_UPLOAD_HEADERS[16],
    bank_name: EXCEL_UPLOAD_HEADERS[17],
    bank_branch_name: EXCEL_UPLOAD_HEADERS[18],
    account_number: EXCEL_UPLOAD_HEADERS[19],
    iban_number: EXCEL_UPLOAD_HEADERS[20],
    role: EXCEL_UPLOAD_HEADERS[21],
    type: EXCEL_UPLOAD_HEADERS[22],
    governorate: EXCEL_UPLOAD_HEADERS[23],
    address: EXCEL_UPLOAD_HEADERS[24],
    building: EXCEL_UPLOAD_HEADERS[25],
    location: EXCEL_UPLOAD_HEADERS[26],
    bank_divid: EXCEL_UPLOAD_HEADERS[27],
    additional_info_1: EXCEL_UPLOAD_HEADERS[28],
    additional_info_2: EXCEL_UPLOAD_HEADERS[29],
};

const HEADER_ALIASES: Array<{ field: RecipientExcelField; aliases: string[] }> = [
    { field: 'room_est1', aliases: ['roomest1', 'roomest2', 'room', 'roomest'] },
    { field: 'division', aliases: ['division'] },
    { field: 'name', aliases: ['fullenglishnameatleast4names', 'fullenglishname', 'englishname', 'name'] },
    { field: 'arabic_name', aliases: ['arabicname', 'fullnameinarabic', 'nameinarabic'] },
    { field: 'email', aliases: ['email', 'mail', 'emailaddress'] },
    { field: 'phone', aliases: ['mobilenumber', 'mobile', 'phone', 'phonenumber', 'whatsappnumber'] },
    { field: 'employer', aliases: ['employerschoolorganizationname', 'employer', 'schoolorganizationname', 'organizationname', 'schoolname'] },
    { field: 'kind_of_school', aliases: ['kindofschool', 'schoolkind', 'schooltype'] },
    { field: 'title', aliases: ['title', 'jobtitle'] },
    { field: 'insurance_number', aliases: ['insurancenumber'] },
    { field: 'institution_tax_number', aliases: ['institutiontaxnumber'] },
    { field: 'national_id_number', aliases: ['nationalidnumber'] },
    { field: 'national_id_picture', aliases: ['nationalidpicture'] },
    { field: 'personal_photo', aliases: ['personalphoto'] },
    { field: 'preferred_proctoring_city', aliases: ['preferredproctoringcity'] },
    { field: 'preferred_test_center', aliases: ['preferredtestcenter', 'testcenter'] },
    { field: 'bank_account_name', aliases: ['fullnameasperbankaccount', 'bankaccountname'] },
    { field: 'bank_name', aliases: ['nameofbank', 'bankname'] },
    { field: 'bank_branch_name', aliases: ['branchname', 'bankbranchname'] },
    { field: 'account_number', aliases: ['accountnumber'] },
    { field: 'iban_number', aliases: ['ibannumberpleasecontactyourbanktogetit', 'ibannumber'] },
    { field: 'role', aliases: ['role'] },
    { field: 'type', aliases: ['type'] },
    { field: 'governorate', aliases: ['governorate', 'governorates'] },
    { field: 'address', aliases: ['address', 'addressinarabic', 'addressinenglish'] },
    { field: 'building', aliases: ['building'] },
    { field: 'location', aliases: ['location', 'map', 'maplink', 'googlemaps', 'googlemap'] },
    { field: 'bank_divid', aliases: ['bankdivid', 'bankdivision'] },
    { field: 'additional_info_1', aliases: ['additionalinfo1'] },
    { field: 'additional_info_2', aliases: ['additionalinfo2'] },
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

const headerMatchesAlias = (normalized: string, alias: string) => {
    if (normalized === alias) {
        return true;
    }

    return alias.length > 4 && normalized.includes(alias);
};

const resolveHeaderField = (header: unknown): RecipientExcelField | null => {
    const normalized = normalizeHeader(header);
    if (!normalized || normalized.startsWith('unnamed')) {
        return null;
    }

    const match = HEADER_ALIASES.find((entry) => entry.aliases.some((alias) => headerMatchesAlias(normalized, alias)));
    return match?.field ?? null;
};

const createEmptyRow = (sheet: ExcelSheetName): ExcelRecipientRow => ({
    room_est1: '',
    division: '',
    name: '',
    arabic_name: '',
    email: '',
    phone: '',
    employer: '',
    kind_of_school: '',
    title: '',
    insurance_number: '',
    institution_tax_number: '',
    national_id_number: '',
    national_id_picture: '',
    personal_photo: '',
    preferred_proctoring_city: '',
    preferred_test_center: '',
    bank_account_name: '',
    bank_name: '',
    bank_branch_name: '',
    account_number: '',
    iban_number: '',
    role: '',
    type: '',
    governorate: '',
    address: '',
    building: '',
    location: '',
    bank_divid: '',
    additional_info_1: '',
    additional_info_2: '',
    sheet,
});

const hasRowValues = (item: ExcelRecipientRow) => RECIPIENT_EXCEL_FIELDS.some((field) => Boolean(item[field]));

function buildSheetRows(rows: unknown[][], sheet: ExcelSheetName, isArabic: boolean) {
    if (rows.length < 2 || !Array.isArray(rows[0])) {
        return [] as ExcelRecipientRow[];
    }

    const rawHeaders = rows[0].map((value) => String(value || ''));

    return rows
        .slice(1)
        .map((row) => {
            const values = Array.isArray(row) ? row : [];
            const item = createEmptyRow(sheet);

            for (let i = 0; i < rawHeaders.length; i += 1) {
                const field = resolveHeaderField(rawHeaders[i]);
                if (!field) {
                    continue;
                }

                item[field] = String(values[i] ?? '').trim();
            }

            return item;
        })
        .filter(hasRowValues);
}

const getSheetHeaderRow = (sheet: ExcelSheetName) => [
    sheet === 'EST2' ? 'ROOM EST2' : 'ROOM EST1',
    ...EXCEL_UPLOAD_HEADERS.slice(1),
];

const mapRecipientToSheetRow = (recipient: Record<RecipientExcelField, string>) => RECIPIENT_EXCEL_FIELDS.map((field) => recipient[field] || '');

export function buildRecipientExcelRow(recipient: Partial<Record<RecipientExcelField, string>>) {
    return RECIPIENT_EXCEL_FIELDS.reduce((acc, field) => {
        acc[FIELD_TO_HEADER[field]] = recipient[field] || '';
        return acc;
    }, {} as Record<string, string>);
}

export function buildDownloadWorkbook(kind: DownloadKind) {
    const workbook = XLSX.utils.book_new();

    for (const sheet of EXCEL_SHEET_NAMES) {
        const rows: string[][] = [
            getSheetHeaderRow(sheet),
            ...(kind === 'sample'
                ? [[
                    'AASTM-Abuqir',
                    'EST Alex',
                    'Mr. Osama El-Mahdy',
                    'اسامة محمد زكى المهدى',
                    'osama.elmahdy@york-press.com',
                    '201223199310',
                    'EST Alex',
                    '',
                    '',
                    '',
                    '',
                    '26303210201093',
                    '',
                    '',
                    '',
                    '',
                    '',
                    'National Bank of Egypt (NBE)',
                    '',
                    '',
                    '146',
                    'Head of EST',
                    'IP',
                    'Alexandria',
                    'الاكاديمية العربية شارع الأكاديمية البحرية طوسون خلف مساكن الضباط ابو قير',
                    'Arab Academy Abu Qir Faculty of Pharmacy',
                    'https://goo.gl/maps/cewVB2jrAMJy8Bxp6',
                    'Internal Transfer',
                    '',
                    '146',
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
        return 'ارفع ملف EST الرسمي مباشرة. النظام يقرأ EST1 وEST2، يحفظ كل أعمدة المراقب كما هي، وينشئ دورة مستقلة لكل عملية رفع.';
    }

    return 'Upload the official EST workbook directly. EST1 and EST2 are parsed automatically, all proctor profile columns are preserved, and every upload is stored as a separate cycle.';
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
