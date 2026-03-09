'use client';

import { Calendar, dateFnsLocalizer, View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, isSameDay, addMonths, addWeeks, addDays, endOfWeek } from 'date-fns';
import { enUS, arSA } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

const locales = {
    en: enUS,
    ar: arSA,
};

type CalendarEvent = {
    title: string;
    start: Date;
    end: Date;
    allDay?: boolean;
    resource?: any;
};

export default function CalendarView({
    locale,
    events,
    onSelectSlot,
}: {
    locale: 'en' | 'ar';
    events: CalendarEvent[];
    onSelectSlot: (date: Date) => void;
}) {
    const t = useTranslations('calendar');
    const localizer = useMemo(
        () =>
            dateFnsLocalizer({
                format,
                parse,
                startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 6 }),
                getDay,
                locales,
            }),
        [],
    );

    const [view, setView] = useState<View>('month');
    const [currentDate, setCurrentDate] = useState<Date>(new Date());
    const weekdayFormat = (date: Date) =>
        format(date, locale === 'ar' ? 'EEEE' : 'EEEE', { locale: locale === 'ar' ? arSA : enUS });

    const eventPropGetter = (event: CalendarEvent) => {
        const key = event.resource?.key;
        if (key === 'leave') return { style: { backgroundColor: '#2f6b5f', borderColor: '#2f6b5f' } };
        if (key === 'absence') return { style: { backgroundColor: '#b45309', borderColor: '#b45309' } };
        if (key === 'mission') return { style: { backgroundColor: '#0f766e', borderColor: '#0f766e' } };
        if (key === 'personal') return { style: { backgroundColor: '#1f3a52', borderColor: '#1f3a52' } };
        if (key === 'form') return { style: { backgroundColor: '#6b7280', borderColor: '#6b7280' } };
        return { style: { backgroundColor: '#475569', borderColor: '#475569' } };
    };

    const title = useMemo(() => {
        const dateLocale = locale === 'ar' ? arSA : enUS;
        if (view === 'month') {
            return format(currentDate, 'MMMM yyyy', { locale: dateLocale });
        }
        if (view === 'week') {
            const start = startOfWeek(currentDate, { weekStartsOn: 6 });
            const end = endOfWeek(currentDate, { weekStartsOn: 6 });
            return `${format(start, 'd MMM', { locale: dateLocale })} - ${format(end, 'd MMM yyyy', { locale: dateLocale })}`;
        }
        return format(currentDate, 'PPPP', { locale: dateLocale });
    }, [currentDate, locale, view]);

    const navigate = (direction: 'prev' | 'next') => {
        const multiplier = direction === 'next' ? 1 : -1;
        if (view === 'month') {
            setCurrentDate((prev) => addMonths(prev, multiplier));
            return;
        }
        if (view === 'week') {
            setCurrentDate((prev) => addWeeks(prev, multiplier));
            return;
        }
        setCurrentDate((prev) => addDays(prev, multiplier));
    };

    return (
        <div className="card p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                    <p className="text-xs uppercase tracking-[0.2em] text-ink/50">{t('title')}</p>
                    <p className="text-lg font-semibold text-ink">{t('createRequest')}</p>
                    <p className="text-sm text-ink/70">{title}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button className="btn-outline" onClick={() => navigate('prev')}>
                        {t('previous')}
                    </button>
                    <button className="btn-outline" onClick={() => navigate('next')}>
                        {t('next')}
                    </button>
                    <button className={`btn-outline ${view === 'month' ? 'bg-ink/10' : ''}`} onClick={() => setView('month')}>
                        {t('month')}
                    </button>
                    <button className={`btn-outline ${view === 'week' ? 'bg-ink/10' : ''}`} onClick={() => setView('week')}>
                        {t('week')}
                    </button>
                    <button className={`btn-outline ${view === 'day' ? 'bg-ink/10' : ''}`} onClick={() => setView('day')}>
                        {t('day')}
                    </button>
                </div>
            </div>
            <Calendar
                localizer={localizer}
                culture={locale}
                events={events}
                view={view}
                views={['month', 'week', 'day']}
                toolbar={false}
                date={currentDate}
                onNavigate={(date) => setCurrentDate(date)}
                onView={setView}
                selectable
                onSelectSlot={(slot) => {
                    const selected = slot.start as Date;
                    if (selected.getDay() === 5) return;
                    onSelectSlot(selected);
                }}
                startAccessor="start"
                endAccessor="end"
                eventPropGetter={eventPropGetter}
                formats={{ weekdayFormat }}
                style={{ height: 520 }}
                dayPropGetter={(date) => {
                    if (date.getDay() === 5) {
                        return { style: { backgroundColor: '#e5e7eb', color: '#6b7280' } };
                    }
                    if (isSameDay(date, new Date())) {
                        return { style: { backgroundColor: '#fef3c7' } };
                    }
                    return { style: { backgroundColor: 'rgba(255,255,255,0.6)' } };
                }}
            />
        </div>
    );
}
