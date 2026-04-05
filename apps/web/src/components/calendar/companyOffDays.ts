'use client';

const FRIDAY_DAY_INDEX = 5;

export type CalendarOffDayType = 'est1' | 'est2' | 'holiday';
export type CompanyOffDayKind = 'friday' | CalendarOffDayType | null;

export type CalendarOffDayRule = {
    id: string;
    type: CalendarOffDayType;
    nameAr: string;
    nameEn: string;
    startDate: string;
    endDate: string;
    isRecurringAnnual?: boolean;
    enabled?: boolean;
};

export type CompanyOffDayInfo = {
    kind: Exclude<CompanyOffDayKind, null>;
    label: string;
    nameAr: string;
    nameEn: string;
    icon: string;
    rule?: CalendarOffDayRule;
};

const FRIDAY_LABELS = {
    en: { label: 'Day off', name: 'Friday weekly day off', icon: '💤' },
    ar: { label: 'يوم إجازة', name: 'إجازة يوم الجمعة الأسبوعية', icon: '💤' },
} as const;

const DEFAULT_CALENDAR_OFF_DAYS: CalendarOffDayRule[] = [
    { id: 'est-jan-1', type: 'est1', nameAr: 'EST I', nameEn: 'EST I', startDate: '2026-01-23', endDate: '2026-01-23', isRecurringAnnual: true, enabled: true },
    { id: 'est-jan-2', type: 'est2', nameAr: 'EST II', nameEn: 'EST II', startDate: '2026-01-24', endDate: '2026-01-24', isRecurringAnnual: true, enabled: true },
    { id: 'est-mar-1', type: 'est1', nameAr: 'EST I', nameEn: 'EST I', startDate: '2026-03-27', endDate: '2026-03-27', isRecurringAnnual: true, enabled: true },
    { id: 'est-mar-2', type: 'est2', nameAr: 'EST II', nameEn: 'EST II', startDate: '2026-03-28', endDate: '2026-03-28', isRecurringAnnual: true, enabled: true },
    { id: 'est-may-1', type: 'est1', nameAr: 'EST I', nameEn: 'EST I', startDate: '2026-05-15', endDate: '2026-05-15', isRecurringAnnual: true, enabled: true },
    { id: 'est-may-2', type: 'est2', nameAr: 'EST II', nameEn: 'EST II', startDate: '2026-05-16', endDate: '2026-05-16', isRecurringAnnual: true, enabled: true },
    { id: 'est-jul-1', type: 'est1', nameAr: 'EST I', nameEn: 'EST I', startDate: '2026-07-03', endDate: '2026-07-03', isRecurringAnnual: true, enabled: true },
    { id: 'est-jul-2', type: 'est2', nameAr: 'EST II', nameEn: 'EST II', startDate: '2026-07-04', endDate: '2026-07-04', isRecurringAnnual: true, enabled: true },
    { id: 'est-oct-1', type: 'est1', nameAr: 'EST I', nameEn: 'EST I', startDate: '2026-10-09', endDate: '2026-10-09', isRecurringAnnual: true, enabled: true },
    { id: 'est-oct-2', type: 'est2', nameAr: 'EST II', nameEn: 'EST II', startDate: '2026-10-10', endDate: '2026-10-10', isRecurringAnnual: true, enabled: true },
    { id: 'est-dec-1', type: 'est1', nameAr: 'EST I', nameEn: 'EST I', startDate: '2026-12-11', endDate: '2026-12-11', isRecurringAnnual: true, enabled: true },
    { id: 'est-dec-2', type: 'est2', nameAr: 'EST II', nameEn: 'EST II', startDate: '2026-12-12', endDate: '2026-12-12', isRecurringAnnual: true, enabled: true },
    { id: 'holiday-2026-christmas', type: 'holiday', nameAr: 'عيد الميلاد المجيد', nameEn: 'Coptic Christmas', startDate: '2026-01-07', endDate: '2026-01-07', isRecurringAnnual: true, enabled: true },
    { id: 'holiday-2026-police', type: 'holiday', nameAr: 'ثورة 25 يناير وعيد الشرطة', nameEn: 'January 25 Revolution and Police Day', startDate: '2026-01-29', endDate: '2026-01-29', enabled: true },
    { id: 'holiday-2026-eid-fitr', type: 'holiday', nameAr: 'عيد الفطر المبارك', nameEn: 'Eid al-Fitr', startDate: '2026-03-19', endDate: '2026-03-23', enabled: true },
    { id: 'holiday-2026-sham-elnessim', type: 'holiday', nameAr: 'عيد شم النسيم', nameEn: 'Sham El-Nessim', startDate: '2026-04-13', endDate: '2026-04-13', enabled: true },
    { id: 'holiday-2026-sinai', type: 'holiday', nameAr: 'عيد تحرير سيناء', nameEn: 'Sinai Liberation Day', startDate: '2026-04-25', endDate: '2026-04-25', isRecurringAnnual: true, enabled: true },
    { id: 'holiday-2026-labour', type: 'holiday', nameAr: 'عيد العمال', nameEn: 'Labour Day', startDate: '2026-05-01', endDate: '2026-05-01', isRecurringAnnual: true, enabled: true },
    { id: 'holiday-2026-arafa', type: 'holiday', nameAr: 'وقفة عيد الأضحى المبارك', nameEn: 'Arafat Day', startDate: '2026-05-26', endDate: '2026-05-26', enabled: true },
    { id: 'holiday-2026-eid-adha', type: 'holiday', nameAr: 'عيد الأضحى المبارك', nameEn: 'Eid al-Adha', startDate: '2026-05-27', endDate: '2026-05-29', enabled: true },
    { id: 'holiday-2026-hijri', type: 'holiday', nameAr: 'رأس السنة الهجرية', nameEn: 'Islamic New Year', startDate: '2026-06-17', endDate: '2026-06-17', enabled: true },
    { id: 'holiday-2026-june-30', type: 'holiday', nameAr: 'ثورة 30 يونيو', nameEn: 'June 30 Revolution', startDate: '2026-06-30', endDate: '2026-06-30', isRecurringAnnual: true, enabled: true },
    { id: 'holiday-2026-july-23', type: 'holiday', nameAr: 'ثورة 23 يوليو 1952', nameEn: 'July 23 Revolution', startDate: '2026-07-23', endDate: '2026-07-23', isRecurringAnnual: true, enabled: true },
    { id: 'holiday-2026-mawlid', type: 'holiday', nameAr: 'المولد النبوي الشريف', nameEn: 'Prophet Muhammad Birthday', startDate: '2026-08-26', endDate: '2026-08-26', enabled: true },
    { id: 'holiday-2026-october-war', type: 'holiday', nameAr: 'عيد القوات المسلحة', nameEn: 'Armed Forces Day', startDate: '2026-10-06', endDate: '2026-10-06', isRecurringAnnual: true, enabled: true },
];

const DEFAULT_RULE_BY_ID = new Map(DEFAULT_CALENDAR_OFF_DAYS.map((rule) => [rule.id, rule]));

const isBrokenLocalizedLabel = (value: string) => /\?{2,}/.test(value.trim());

const OFF_DAY_TYPE_META: Record<Exclude<CompanyOffDayKind, 'friday' | null>, { icon: string; fallbackAr: string; fallbackEn: string }> = {
    est1: { icon: '🏢', fallbackAr: 'EST I', fallbackEn: 'EST I' },
    est2: { icon: '🏢', fallbackAr: 'EST II', fallbackEn: 'EST II' },
    holiday: { icon: '🎉', fallbackAr: 'إجازة رسمية', fallbackEn: 'Official holiday' },
};

const parseDateOnly = (value?: string | null) => {
    if (!value) return null;
    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
};

const compareDateOnly = (left: Date, right: Date) =>
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate();

const normalizeDateOnly = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate());

const isWithinInclusiveRange = (value: Date, start: Date, end: Date) => {
    const safeValue = normalizeDateOnly(value).getTime();
    const safeStart = normalizeDateOnly(start).getTime();
    const safeEnd = normalizeDateOnly(end).getTime();
    return safeValue >= safeStart && safeValue <= safeEnd;
};

const getRuleDateRangeForYear = (rule: CalendarOffDayRule, year: number) => {
    const start = parseDateOnly(rule.startDate);
    const end = parseDateOnly(rule.endDate || rule.startDate);
    if (!start || !end) return null;

    if (!rule.isRecurringAnnual) {
        return { start, end };
    }

    return {
        start: new Date(year, start.getMonth(), start.getDate()),
        end: new Date(year, end.getMonth(), end.getDate()),
    };
};

export const getDefaultCalendarOffDays = (): CalendarOffDayRule[] =>
    DEFAULT_CALENDAR_OFF_DAYS.map((rule) => ({ ...rule }));

export const normalizeCalendarOffDays = (input: unknown): CalendarOffDayRule[] => {
    if (!Array.isArray(input)) {
        return getDefaultCalendarOffDays();
    }

    const sanitized = input
        .map<CalendarOffDayRule | null>((item, index) => {
            if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
            const candidate = item as Record<string, unknown>;
            const type = candidate.type;
            if (type !== 'est1' && type !== 'est2' && type !== 'holiday') return null;
            const startDate = typeof candidate.startDate === 'string' ? candidate.startDate : '';
            const endDate = typeof candidate.endDate === 'string' ? candidate.endDate : startDate;
            const nameAr = typeof candidate.nameAr === 'string' ? candidate.nameAr.trim() : '';
            const nameEn = typeof candidate.nameEn === 'string' ? candidate.nameEn.trim() : '';
            if (!startDate || !endDate || !nameAr || !nameEn) return null;

            const id = typeof candidate.id === 'string' && candidate.id.trim() ? candidate.id : `${type}-${index + 1}`;
            const defaultRule = DEFAULT_RULE_BY_ID.get(id);

            return {
                id,
                type,
                nameAr: isBrokenLocalizedLabel(nameAr) && defaultRule ? defaultRule.nameAr : nameAr,
                nameEn,
                startDate,
                endDate,
                isRecurringAnnual: candidate.isRecurringAnnual === true,
                enabled: candidate.enabled !== false,
            } satisfies CalendarOffDayRule;
        })
        .filter((item): item is CalendarOffDayRule => item !== null);

    return sanitized.length > 0 ? sanitized : getDefaultCalendarOffDays();
};

export const sortCalendarOffDays = (rules: CalendarOffDayRule[]) =>
    [...rules].sort((left, right) => {
        if (left.startDate !== right.startDate) return left.startDate.localeCompare(right.startDate);
        if (left.endDate !== right.endDate) return left.endDate.localeCompare(right.endDate);
        return left.nameEn.localeCompare(right.nameEn);
    });

export const getCompanyOffDayInfo = (
    date: Date,
    locale: 'en' | 'ar' = 'en',
    rules?: CalendarOffDayRule[] | null,
): CompanyOffDayInfo | null => {
    const normalizedRules = normalizeCalendarOffDays(rules);
    const year = date.getFullYear();

    const matchedRule = normalizedRules.find((rule) => {
        if (rule.enabled === false) return false;
        const range = getRuleDateRangeForYear(rule, year);
        if (!range) return false;
        return isWithinInclusiveRange(date, range.start, range.end);
    });

    if (matchedRule) {
        const meta = OFF_DAY_TYPE_META[matchedRule.type];
        return {
            kind: matchedRule.type,
            label: locale === 'ar' ? `${meta.icon} ${matchedRule.nameAr}` : `${meta.icon} ${matchedRule.nameEn}`,
            nameAr: matchedRule.nameAr || meta.fallbackAr,
            nameEn: matchedRule.nameEn || meta.fallbackEn,
            icon: meta.icon,
            rule: matchedRule,
        };
    }

    if (date.getDay() === FRIDAY_DAY_INDEX) {
        const labels = FRIDAY_LABELS[locale];
        return {
            kind: 'friday',
            label: `${labels.icon} ${labels.label}`,
            nameAr: FRIDAY_LABELS.ar.name,
            nameEn: FRIDAY_LABELS.en.name,
            icon: labels.icon,
        };
    }

    return null;
};

export const getCompanyOffDayKind = (date: Date, rules?: CalendarOffDayRule[] | null): CompanyOffDayKind =>
    getCompanyOffDayInfo(date, 'en', rules)?.kind || null;

export const getCompanyOffDayLabel = (
    date: Date,
    locale: 'en' | 'ar' = 'en',
    rules?: CalendarOffDayRule[] | null,
) => getCompanyOffDayInfo(date, locale, rules)?.label || null;

export const isCompanyFixedOffDay = (date: Date, rules?: CalendarOffDayRule[] | null) => {
    const info = getCompanyOffDayInfo(date, 'en', rules);
    return info?.kind === 'est1' || info?.kind === 'est2' || info?.kind === 'holiday';
};

export const isCompanyOffDay = (date: Date, rules?: CalendarOffDayRule[] | null) =>
    getCompanyOffDayKind(date, rules) !== null;

export const findCalendarOffDayRuleByDate = (date: Date, rules?: CalendarOffDayRule[] | null) => {
    const info = getCompanyOffDayInfo(date, 'en', rules);
    return info?.rule || null;
};

export const isSameDateOnly = (left: string, right: string) => {
    const leftDate = parseDateOnly(left);
    const rightDate = parseDateOnly(right);
    if (!leftDate || !rightDate) return false;
    return compareDateOnly(leftDate, rightDate);
};
