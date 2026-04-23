import { RecipientSheet } from '@prisma/client';

export const RECIPIENT_TEXT_FILTER_FIELDS = [
    'room',
    'room_est1',
    'division',
    'name',
    'arabic_name',
    'email',
    'phone',
    'employer',
    'title',
    'role',
    'type',
    'governorate',
    'address',
    'building',
    'location',
    'preferred_proctoring_city',
    'preferred_test_center',
    'bank_name',
    'bank_branch_name',
    'account_number',
    'iban_number',
    'additional_info_1',
    'additional_info_2',
] as const;

type RecipientImportInput = Partial<Record<
    | 'cycleId'
    | 'division'
    | 'name'
    | 'arabic_name'
    | 'email'
    | 'phone'
    | 'mobile_number'
    | 'employer'
    | 'kind_of_school'
    | 'title'
    | 'insurance_number'
    | 'institution_tax_number'
    | 'national_id_number'
    | 'national_id_picture'
    | 'personal_photo'
    | 'preferred_proctoring_city'
    | 'preferred_test_center'
    | 'bank_account_name'
    | 'bank_name'
    | 'bank_branch_name'
    | 'account_number'
    | 'iban_number'
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
    | 'bank_divid'
    | 'additional_info_1'
    | 'additional_info_2'
    | 'arrival_time'
    | 'sheet',
    unknown
>>;

export type NormalizedRecipientImport = {
    cycleId: string | null;
    division: string | null;
    name: string;
    arabic_name: string | null;
    email: string | null;
    phone: string | null;
    employer: string | null;
    kind_of_school: string | null;
    title: string | null;
    insurance_number: string | null;
    institution_tax_number: string | null;
    national_id_number: string | null;
    national_id_picture: string | null;
    personal_photo: string | null;
    preferred_proctoring_city: string | null;
    preferred_test_center: string | null;
    bank_account_name: string | null;
    bank_name: string | null;
    bank_branch_name: string | null;
    account_number: string | null;
    iban_number: string | null;
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
    bank_divid: string | null;
    additional_info_1: string | null;
    additional_info_2: string | null;
    arrival_time: string | null;
    confirmation_token?: string | null;
    sheet: RecipientSheet;
};

const SIMPLE_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

export function normalizeRecipientImport(recipient: RecipientImportInput): NormalizedRecipientImport {
    const cycleId = normalizeImportValue(recipient.cycleId);
    const roomValue = normalizeImportValue(recipient.room_est1) ?? normalizeImportValue(recipient.room);
    const phoneValue = normalizeImportValue(recipient.phone) ?? normalizeImportValue(recipient.mobile_number);
    const employer = normalizeImportValue(recipient.employer) ?? normalizeImportValue(recipient.faculty);
    const preferredProctoringCity = normalizeImportValue(recipient.preferred_proctoring_city);
    const preferredTestCenter = normalizeImportValue(recipient.preferred_test_center) ?? normalizeImportValue(recipient.test_center);
    const building = normalizeImportValue(recipient.building) ?? preferredTestCenter ?? employer;
    const location = normalizeImportValue(recipient.location) ?? normalizeImportValue(recipient.map_link);
    const role = normalizeImportValue(recipient.role) ?? normalizeImportValue(recipient.title);
    const type = normalizeImportValue(recipient.type) ?? normalizeImportValue(recipient.kind_of_school);
    const governorate = normalizeImportValue(recipient.governorate) ?? preferredProctoringCity;

    return {
        cycleId,
        division: normalizeImportValue(recipient.division),
        name: normalizeImportValue(recipient.name) ?? '',
        arabic_name: normalizeImportValue(recipient.arabic_name),
        email: normalizeEmail(recipient.email),
        phone: phoneValue,
        employer,
        kind_of_school: normalizeImportValue(recipient.kind_of_school),
        title: normalizeImportValue(recipient.title),
        insurance_number: normalizeImportValue(recipient.insurance_number),
        institution_tax_number: normalizeImportValue(recipient.institution_tax_number),
        national_id_number: normalizeImportValue(recipient.national_id_number),
        national_id_picture: normalizeImportValue(recipient.national_id_picture),
        personal_photo: normalizeImportValue(recipient.personal_photo),
        preferred_proctoring_city: preferredProctoringCity,
        preferred_test_center: preferredTestCenter,
        bank_account_name: normalizeImportValue(recipient.bank_account_name),
        bank_name: normalizeImportValue(recipient.bank_name),
        bank_branch_name: normalizeImportValue(recipient.bank_branch_name),
        account_number: normalizeImportValue(recipient.account_number),
        iban_number: normalizeImportValue(recipient.iban_number),
        exam_type: normalizeImportValue(recipient.exam_type),
        role,
        day: normalizeImportValue(recipient.day),
        date: normalizeImportValue(recipient.date),
        test_center: preferredTestCenter ?? building,
        faculty: employer,
        room: roomValue,
        room_est1: roomValue,
        type,
        governorate,
        address: normalizeImportValue(recipient.address),
        building,
        location,
        map_link: location,
        bank_divid: normalizeImportValue(recipient.bank_divid),
        additional_info_1: normalizeImportValue(recipient.additional_info_1),
        additional_info_2: normalizeImportValue(recipient.additional_info_2),
        arrival_time: normalizeImportValue(recipient.arrival_time),
        sheet: normalizeRecipientSheet(recipient.sheet),
    };
}

export function normalizeImportValue(value: unknown): string | null {
    if (value === null || value === undefined || value === '') {
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
    const normalized = normalizeImportValue(value)
        ?.toUpperCase()
        .replace(/[\s_-]+/g, '');

    if (normalized?.includes('BLACKLIST')) {
        return RecipientSheet.BLACKLIST;
    }

    if (normalized?.includes('SPARE')) {
        return RecipientSheet.SPARE;
    }

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
        recipient.phone,
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
