export type RecipientSheetValue = 'LEGACY' | 'EST1' | 'EST2' | 'SPARE' | 'BLACKLIST';
export type ManagedRecipientSheet = Exclude<RecipientSheetValue, 'LEGACY'>;
export type SwappableRecipientSheet = Extract<ManagedRecipientSheet, 'EST1' | 'EST2' | 'SPARE'>;

export type ConflictComparableRecipient = {
    id: string;
    cycleId?: string | null;
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

export type SheetAssignmentTemplateRecipient = {
    id: string;
    cycleId?: string | null;
    room?: string | null;
    room_est1?: string | null;
    division?: string | null;
    building?: string | null;
    location?: string | null;
    address?: string | null;
    governorate?: string | null;
    role?: string | null;
    type?: string | null;
    exam_type?: string | null;
    day?: string | null;
    date?: string | null;
    test_center?: string | null;
    faculty?: string | null;
    map_link?: string | null;
    additional_info_1?: string | null;
    additional_info_2?: string | null;
    arrival_time?: string | null;
    preferred_test_center?: string | null;
    preferred_proctoring_city?: string | null;
};

export type SheetAssignmentOption = {
    value: string;
    templateRecipientId: string;
    building: string;
    floorKey: string;
    room: string;
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

const normalizeText = (value?: string | null) => {
    const normalized = String(value || '').trim().replace(/\s+/g, ' ');
    return normalized || null;
};

const CYCLELESS_KEY = '__no_cycle__';

const resolveCycleKey = (cycleId?: string | null) => cycleId || CYCLELESS_KEY;

const compareNatural = (left: string, right: string) => left.localeCompare(right, undefined, {
    numeric: true,
    sensitivity: 'base',
});

export function resolveRecipientFloorKey(roomValue?: string | null) {
    const normalizedRoom = normalizeText(roomValue);

    if (!normalizedRoom) {
        return 'general';
    }

    if (/floor|دور/i.test(normalizedRoom)) {
        return normalizedRoom;
    }

    const numericMatch = normalizedRoom.match(/\d+/)?.[0] || '';
    if (numericMatch.length >= 3) {
        return numericMatch.slice(0, numericMatch.length - 2);
    }

    return 'general';
}

export function formatRecipientFloorLabel(floorKey: string, isArabic: boolean) {
    if (!floorKey || floorKey === 'general') {
        return isArabic ? 'بدون دور محدد' : 'Unassigned floor';
    }

    if (/^\d+$/.test(floorKey)) {
        return isArabic ? `الدور ${floorKey}` : `Floor ${floorKey}`;
    }

    return floorKey;
}

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

export function buildBlacklistConflictMapByCycle(
    blacklistItems: ConflictComparableRecipient[],
    activeItems: ConflictComparableRecipient[],
) {
    const activeByCycle = new Map<string, ConflictComparableRecipient[]>();

    for (const activeRecipient of activeItems) {
        const cycleKey = resolveCycleKey(activeRecipient.cycleId);
        const scopedRecipients = activeByCycle.get(cycleKey) ?? [];
        scopedRecipients.push(activeRecipient);
        activeByCycle.set(cycleKey, scopedRecipients);
    }

    const conflictMap = new Map<string, BlacklistConflictInfo>();

    for (const blacklistRecipient of blacklistItems) {
        const cycleKey = resolveCycleKey(blacklistRecipient.cycleId);
        const scopedConflicts = buildBlacklistConflictMap(
            [blacklistRecipient],
            activeByCycle.get(cycleKey) ?? [],
        );
        const conflict = scopedConflicts.get(blacklistRecipient.id);

        if (conflict) {
            conflictMap.set(blacklistRecipient.id, conflict);
        }
    }

    return conflictMap;
}

export function buildSheetAssignmentOptions(recipients: SheetAssignmentTemplateRecipient[]) {
    const options: SheetAssignmentOption[] = [];
    const seenKeys = new Set<string>();

    for (const recipient of recipients) {
        const room = normalizeText(recipient.room_est1) ?? normalizeText(recipient.room);

        if (!room) {
            continue;
        }

        const building = normalizeText(recipient.building) ?? 'Unassigned building';
        const floorKey = resolveRecipientFloorKey(room);
        const uniqueKey = `${building.toLowerCase()}|${floorKey.toLowerCase()}|${room.toLowerCase()}`;

        if (seenKeys.has(uniqueKey)) {
            continue;
        }

        seenKeys.add(uniqueKey);
        options.push({
            value: uniqueKey,
            templateRecipientId: recipient.id,
            building,
            floorKey,
            room,
        });
    }

    return options.sort((left, right) => (
        compareNatural(left.building, right.building)
        || compareNatural(left.floorKey, right.floorKey)
        || compareNatural(left.room, right.room)
    ));
}
