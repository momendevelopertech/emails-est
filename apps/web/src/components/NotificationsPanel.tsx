'use client';

import { useTranslations } from 'next-intl';

type NotificationItem = {
    id: string;
    title: string;
    body: string;
    titleAr?: string | null;
    bodyAr?: string | null;
    createdAt: string;
    isRead: boolean;
};

export default function NotificationsPanel({ items, locale }: { items: NotificationItem[]; locale: 'en' | 'ar' }) {
    const t = useTranslations('notifications');
    const dateLocale = locale === 'ar' ? 'ar-EG' : 'en-US';

    return (
        <div className="card p-5">
            <div className="flex items-center justify-between">
                <p className="text-sm uppercase tracking-[0.2em] text-ink/50">{t('title')}</p>
                <span className="pill bg-ink/10 text-ink">{items.length} {t('new')}</span>
            </div>
            <div className="mt-4 space-y-3">
                {items.length === 0 && <p className="text-sm text-ink/60">{t('allCaughtUp')}</p>}
                {items.slice(0, 5).map((item) => (
                    <div key={item.id} className="rounded-xl border border-ink/10 bg-white/70 p-3">
                        <p className="text-sm font-semibold">{locale === 'ar' ? item.titleAr || item.title : item.title}</p>
                        <p className="text-xs text-ink/60">{locale === 'ar' ? item.bodyAr || item.body : item.body}</p>
                        <p className="mt-2 text-[11px] text-ink/40">
                            {new Date(item.createdAt).toLocaleString(dateLocale)}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}

