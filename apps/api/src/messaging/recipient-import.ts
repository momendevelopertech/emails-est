export const TEST_RECIPIENT_EMAILS = [
    'momenellaban210@gmail.com',
    'momen.developer.tech@gmail.com',
] as const;

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
    | 'arrival_time',
    unknown
>>;

export type NormalizedRecipientImport = {
    name: string;
    email: string;
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
};

export function getAlternatingTestEmail(index: number) {
    return TEST_RECIPIENT_EMAILS[index % TEST_RECIPIENT_EMAILS.length];
}

export function normalizeRecipientImport(
    recipient: RecipientImportInput,
    index: number,
): NormalizedRecipientImport {
    const roomEst1 = normalizeImportValue(recipient.room_est1) ?? normalizeImportValue(recipient.room);
    const building = normalizeImportValue(recipient.building) ?? normalizeImportValue(recipient.test_center);
    const location = normalizeImportValue(recipient.location) ?? normalizeImportValue(recipient.map_link);

    return {
        name: normalizeImportValue(recipient.name) ?? '',
        email: getAlternatingTestEmail(index),
        phone: normalizeImportValue(recipient.phone),
        exam_type: normalizeImportValue(recipient.exam_type),
        role: normalizeImportValue(recipient.role),
        day: normalizeImportValue(recipient.day),
        date: normalizeImportValue(recipient.date),
        test_center: building,
        faculty: normalizeImportValue(recipient.faculty),
        room: roomEst1,
        room_est1: roomEst1,
        type: normalizeImportValue(recipient.type),
        governorate: normalizeImportValue(recipient.governorate),
        address: normalizeImportValue(recipient.address),
        building,
        location,
        map_link: location,
        arrival_time: normalizeImportValue(recipient.arrival_time),
    };
}

export function normalizeImportValue(value: unknown): string | null {
    if (value === null || value === undefined) {
        return null;
    }

    const normalized = String(value).trim();
    return normalized.length ? normalized : null;
}
