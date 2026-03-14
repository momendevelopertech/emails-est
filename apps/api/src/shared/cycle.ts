import { addMonths, endOfDay, setDate, startOfDay } from 'date-fns';

export type CycleRange = {
    start: Date;
    end: Date;
};

type CycleOptions = {
    endOfDay?: boolean;
};

export const getCycleRange = (date: Date, options: CycleOptions = {}): CycleRange => {
    const endAtDayEnd = options.endOfDay ?? true;
    const day = date.getDate();
    let start: Date;
    let end: Date;

    if (day >= 11) {
        start = startOfDay(setDate(date, 11));
        const endDate = setDate(addMonths(date, 1), 10);
        end = endAtDayEnd ? endOfDay(endDate) : startOfDay(endDate);
    } else {
        const prevMonth = addMonths(date, -1);
        start = startOfDay(setDate(prevMonth, 11));
        const endDate = setDate(date, 10);
        end = endAtDayEnd ? endOfDay(endDate) : startOfDay(endDate);
    }

    return { start, end };
};
