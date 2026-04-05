import { differenceInCalendarDays, startOfDay } from 'date-fns';

/** Parse YYYY-MM-DD as local calendar date (no UTC shift). */
export function parseLocalDateInput(value: string): Date {
    const datePart = value.split('T')[0];
    const [year, month, day] = datePart.split('-').map((part) => Number(part));
    if (year && month && day) {
        return new Date(year, month - 1, day);
    }
    return startOfDay(new Date(value));
}

/**
 * Inclusive calendar days between start and end (same as counting each day on the wall).
 * Replaces differenceInBusinessDays which only counts Mon–Fri and breaks ranges like 5→7 = 3 days.
 */
export function countInclusiveCalendarDays(start: Date, end: Date): number {
    const s = startOfDay(start);
    const e = startOfDay(end);
    if (e < s) return 0;
    return differenceInCalendarDays(e, s) + 1;
}
