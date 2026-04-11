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
};

const HEADER_FIELD_MAP: Record<string, keyof ExcelRecipientRow> = {
  room_est1: 'room_est1',
  'full_english_name_(at_least_4_names)': 'name',
  email: 'email',
  role: 'role',
  type: 'type',
  governorate: 'governorate',
  address: 'address',
  building: 'building',
  location: 'location',
};

export const normalizeHeader = (value: string) => value.trim().toLowerCase().replace(/\s+/g, '_');

export function getAlternatingTestEmail(index: number) {
  return TEST_RECIPIENT_EMAILS[index % TEST_RECIPIENT_EMAILS.length];
}

export function validateUploadHeaders(headers: string[]) {
  const normalized = headers.map((header) => normalizeHeader(header));
  const required = EXCEL_UPLOAD_HEADERS.map((header) => normalizeHeader(header));
  const missing = required.filter((header) => !normalized.includes(header));

  return { normalized, missing };
}

export function buildDownloadWorkbook(kind: 'template' | 'sample') {
  const workbook = XLSX.utils.book_new();
  const rows: string[][] = [
    [...EXCEL_UPLOAD_HEADERS],
    ...(kind === 'sample'
      ? [[
        'AASTM-Abuqir',
        'Ahmed Ali Hassan Mahmoud',
        getAlternatingTestEmail(0),
        'Head of EST',
        'IP',
        'Alexandria',
        'Arab Academy, Abu Qir, Alexandria',
        'Arab Academy Abu Qir Faculty of Pharmacy',
        'https://maps.app.goo.gl/example',
      ]]
      : []),
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, worksheet, EXCEL_SHEET_NAME);
  return workbook;
}

export async function parseRecipientWorkbook(file: File, isArabic: boolean) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });

  if (rows.length < 2 || !Array.isArray(rows[0])) {
    throw new Error(isArabic
      ? 'الملف يجب أن يحتوي على صف عناوين وصف بيانات واحد على الأقل.'
      : 'The sheet must contain a header row and at least one data row.');
  }

  const rawHeaders = rows[0].map((value) => String(value || ''));
  const { missing } = validateUploadHeaders(rawHeaders);
  if (missing.length) {
    throw new Error(isArabic
      ? `الأعمدة الناقصة: ${missing.join(', ')}`
      : `Missing required headers: ${missing.join(', ')}`);
  }

  const headerIndexes = rawHeaders.reduce((acc, header, index) => {
    const mappedField = HEADER_FIELD_MAP[normalizeHeader(header)];
    if (mappedField) {
      acc[mappedField] = index;
    }
    return acc;
  }, {} as Record<keyof ExcelRecipientRow, number>);

  return rows
    .slice(1)
    .map((row, rowIndex) => {
      const values = Array.isArray(row) ? row : [];
      const item = Object.keys(headerIndexes).reduce((acc, key) => {
        const typedKey = key as keyof ExcelRecipientRow;
        acc[typedKey] = String(values[headerIndexes[typedKey]] ?? '').trim();
        return acc;
      }, {} as ExcelRecipientRow);

      item.email = getAlternatingTestEmail(rowIndex);
      return item;
    })
    .filter((item) => item.name || item.room_est1 || item.role || item.type || item.governorate || item.address || item.building);
}
