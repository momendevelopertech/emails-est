export type RecipientSheetValue = 'LEGACY' | 'EST1' | 'EST2' | 'SPARE' | 'BLACKLIST';
export type ManagedRecipientSheet = Exclude<RecipientSheetValue, 'LEGACY'>;
export type SwappableRecipientSheet = Extract<ManagedRecipientSheet, 'EST1' | 'EST2' | 'SPARE'>;

export type ConflictComparableRecipient = {
    id: string;
    name?: string | null;
    phone?: string | null;
    sheet?: RecipientSheetValue | null;
};

export type BlacklistConflictInfo = {
    id: string;
    foundIn: SwappableRecipientSheet[];
    matchedByName: boolean;
    matchedByPhone: boolean;
};

export const SHEET_META: Record<RecipientSheetValue, {
    label: string;
    labelAr: string;
    color: string;
    bg: string;
    border: string;
    dot: string;
}> = {
    LEGACY: {
        label: 'Legacy',
        labelAr: 'بيانات قديمة',
        color: 'text-slate-700',
        bg: 'bg-slate-100',
        border: 'border-slate-200',
        dot: 'bg-slate-400',
    },
    EST1: {
        label: 'EST 1',
        labelAr: 'EST 1',
        color: 'text-sky-700',
        bg: 'bg-sky-50',
        border: 'border-sky-200',
        dot: 'bg-sky-500',
    },
    EST2: {
        label: 'EST 2',
        labelAr: 'EST 2',
        color: 'text-violet-700',
        bg: 'bg-violet-50',
        border: 'border-violet-200',
        dot: 'bg-violet-500',
    },
    SPARE: {
        label: 'Spare',
        labelAr: 'الاحتياطي',
        color: 'text-amber-700',
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        dot: 'bg-amber-500',
    },
    BLACKLIST: {
        label: 'Blacklist',
        labelAr: 'القائمة السوداء',
        color: 'text-rose-700',
        bg: 'bg-rose-50',
        border: 'border-rose-200',
        dot: 'bg-rose-500',
    },
};

export const SHEET_DISPLAY_ORDER: RecipientSheetValue[] = ['EST1', 'EST2', 'SPARE', 'BLACKLIST', 'LEGACY'];
export const MANAGED_SHEET_DISPLAY_ORDER: ManagedRecipientSheet[] = ['EST1', 'EST2', 'SPARE', 'BLACKLIST'];
export const SWAPPABLE_SHEET_ORDER: SwappableRecipientSheet[] = ['EST1', 'EST2', 'SPARE'];

export function isManagedRecipientSheet(value: RecipientSheetValue | '' | null | undefined): value is ManagedRecipientSheet {
    return value === 'EST1' || value === 'EST2' || value === 'SPARE' || value === 'BLACKLIST';
}

export function isSwappableRecipientSheet(value: RecipientSheetValue | '' | null | undefined): value is SwappableRecipientSheet {
    return value === 'EST1' || value === 'EST2' || value === 'SPARE';
}

export function getRecipientSheetLabel(sheet: RecipientSheetValue, isArabic: boolean) {
    const meta = SHEET_META[sheet];
    return isArabic ? meta.labelAr : meta.label;
}

const normalizePhone = (value?: string | null) => (value ?? '')
    .replace(/\D/g, '')
    .replace(/^0/, '')
    .slice(-9);

const normalizeName = (value?: string | null) => String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

export function buildBlacklistConflictMap(
    blacklistItems: ConflictComparableRecipient[],
    activeItems: ConflictComparableRecipient[],
) {
    const conflictMap = new Map<string, BlacklistConflictInfo>();

    for (const blacklistRecipient of blacklistItems) {
        const blacklistPhone = normalizePhone(blacklistRecipient.phone);
        const blacklistName = normalizeName(blacklistRecipient.name);
        const foundIn = new Set<SwappableRecipientSheet>();
        let matchedByName = false;
        let matchedByPhone = false;

        for (const activeRecipient of activeItems) {
            if (!isSwappableRecipientSheet(activeRecipient.sheet)) {
                continue;
            }

            const activePhone = normalizePhone(activeRecipient.phone);
            const activeName = normalizeName(activeRecipient.name);
            const phoneMatch = Boolean(blacklistPhone && activePhone && blacklistPhone === activePhone);
            const nameMatch = Boolean(blacklistName && activeName && blacklistName === activeName);

            if (!phoneMatch && !nameMatch) {
                continue;
            }

            foundIn.add(activeRecipient.sheet);
            matchedByName = matchedByName || nameMatch;
            matchedByPhone = matchedByPhone || phoneMatch;
        }

        if (!foundIn.size) {
            continue;
        }

        conflictMap.set(blacklistRecipient.id, {
            id: blacklistRecipient.id,
            foundIn: SWAPPABLE_SHEET_ORDER.filter((sheet) => foundIn.has(sheet)),
            matchedByName,
            matchedByPhone,
        });
    }

    return conflictMap;
}
