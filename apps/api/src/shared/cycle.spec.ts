import { getCycleRange } from './cycle';

describe('getCycleRange', () => {
    it('returns current cycle when day >= 11', () => {
        const date = new Date(2026, 1, 15); // Feb 15, 2026
        const { start, end } = getCycleRange(date, { endOfDay: true });

        expect(start.getFullYear()).toBe(2026);
        expect(start.getMonth()).toBe(1);
        expect(start.getDate()).toBe(11);
        expect(end.getFullYear()).toBe(2026);
        expect(end.getMonth()).toBe(2);
        expect(end.getDate()).toBe(10);
    });

    it('returns previous cycle when day < 11', () => {
        const date = new Date(2026, 2, 5); // Mar 5, 2026
        const { start, end } = getCycleRange(date, { endOfDay: true });

        expect(start.getFullYear()).toBe(2026);
        expect(start.getMonth()).toBe(1);
        expect(start.getDate()).toBe(11);
        expect(end.getFullYear()).toBe(2026);
        expect(end.getMonth()).toBe(2);
        expect(end.getDate()).toBe(10);
    });

    it('supports start-of-day end bounds', () => {
        const date = new Date(2026, 1, 20);
        const { end } = getCycleRange(date, { endOfDay: false });
        expect(end.getHours()).toBe(0);
        expect(end.getMinutes()).toBe(0);
        expect(end.getSeconds()).toBe(0);
    });
});
