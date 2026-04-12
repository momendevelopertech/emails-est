import { RecipientSheet } from '@prisma/client';

export const RECIPIENT_TEXT_FILTER_FIELDS = [
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
    'room_est1',
    'type',
    'governorate',
    'address',
    'building',
    'location',
    'map_link',
    'arrival_time',
] as const;

type RecipientImportInput = Partial<Record<
    | 'cycleId'
    | 'name'
    | 'email'
    | 'phone'
    | 'exam_type'
    | 'role'
    | 'day'
    | 'date'
    | 'test_center'
    | 'faculty'
    | 'room'
    | 'room_est1'
    | 'type'
    | 'governorate'
    | 'address'
    | 'building'
    | 'location'
    | 'map_link'
    | 'arrival_time'
    | 'sheet',
    unknown
>>;

export type NormalizedRecipientImport = {
    cycleId: string | null;
    name: string;
    email: string | null;
    phone: string | null;
    exam_type: string | null;
    role: string | null;
    day: string | null;
    date: string | null;
    test_center: string | null;
    faculty: string | null;
    room: string | null;
    room_est1: string | null;
    type: string | null;
    governorate: string | null;
    address: string | null;
    building: string | null;
    location: string | null;
    map_link: string | null;
    arrival_time: string | null;
    sheet: RecipientSheet;
};

const SIMPLE_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

export function normalizeRecipientImport(recipient: RecipientImportInput): NormalizedRecipientImport {
    const roomValue = normalizeImportValue(recipient.room_est1) ?? normalizeImportValue(recipient.room);
    const building = normalizeImportValue(recipient.building) ?? normalizeImportValue(recipient.test_center);
    const location = normalizeImportValue(recipient.location) ?? normalizeImportValue(recipient.map_link);

    return {
        cycleId: normalizeImportValue(recipient.cycleId),
        name: normalizeImportValue(recipient.name) ?? '',
        email: normalizeEmail(recipient.email),
        phone: normalizeImportValue(recipient.phone),
        exam_type: normalizeImportValue(recipient.exam_type),
        role: normalizeImportValue(recipient.role),
        day: normalizeImportValue(recipient.day),
        date: normalizeImportValue(recipient.date),
        test_center: building,
        faculty: normalizeImportValue(recipient.faculty),
        room: roomValue,
        room_est1: roomValue,
        type: normalizeImportValue(recipient.type),
        governorate: normalizeImportValue(recipient.governorate),
        address: normalizeImportValue(recipient.address),
        building,
        location,
        map_link: location,
        arrival_time: normalizeImportValue(recipient.arrival_time),
        sheet: normalizeRecipientSheet(recipient.sheet),
    };
}

export function normalizeImportValue(value: unknown): string | null {
    if (value === null || value === undefined) {
        return null;
    }

    const normalized = String(value).trim();
    return normalized.length ? normalized : null;
}

export function normalizeEmail(value: unknown): string | null {
    const normalized = normalizeImportValue(value);
    return normalized ? normalized.toLowerCase() : null;
}

export function isValidEmail(value?: string | null) {
    return !!value && SIMPLE_EMAIL_REGEX.test(value);
}

export function normalizeRecipientSheet(value: unknown): RecipientSheet {
    const normalized = normalizeImportValue(value)?.toUpperCase();

    if (normalized?.includes('EST2')) {
        return RecipientSheet.EST2;
    }

    if (normalized?.includes('EST1')) {
        return RecipientSheet.EST1;
    }

    return RecipientSheet.LEGACY;
}

export function buildRecipientDuplicateKey(recipient: NormalizedRecipientImport) {
    return [
        recipient.sheet,
        recipient.name,
        recipient.email,
        recipient.role,
        recipient.type,
        recipient.governorate,
        recipient.address,
        recipient.building,
        recipient.location,
        recipient.room_est1,
    ]
        .map((value) => (value || '').trim().toLowerCase())
        .join('|');
}
