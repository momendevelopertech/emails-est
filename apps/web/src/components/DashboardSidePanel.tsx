'use client';

type SideItem = {
    id: string;
    name: string;
    type: string;
    time?: string;
    color: 'accent' | 'amber' | 'teal' | 'violet' | 'rose';
};

export default function DashboardSidePanel({
    locale,
    todayItems,
    pendingItems,
}: {
    locale: 'en' | 'ar';
    todayItems: SideItem[];
    pendingItems: SideItem[];
}) {
    const isAr = locale === 'ar';
    return (
        <aside className="right-panel-ui">
            <div>
                <div className="rp-section-title">{isAr ? 'أحداث اليوم' : "Today's events"}</div>
                <div className="today-list">
                    {todayItems.map((item) => (
                        <div key={item.id} className={`today-item tone-${item.color}`}>
                            <div className="ti-time">{item.time || (isAr ? 'طوال اليوم' : 'All day')}</div>
                            <div>
                                <div className="ti-name">{item.name}</div>
                                <div className="ti-type">{item.type}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div>
                <div className="rp-section-title">{isAr ? 'بانتظار موافقتك' : 'Pending approvals'}</div>
                <div className="pend-list">
                    {pendingItems.map((item) => (
                        <div key={item.id}>
                            <div className="pend-item">
                                <div className={`pend-av tone-${item.color}`}>{item.name.slice(0, 2)}</div>
                                <div>
                                    <div className="pend-name">{item.name}</div>
                                    <div className="pend-type">{item.type}</div>
                                </div>
                                <span className="pend-tag">{isAr ? 'معلق' : 'Pending'}</span>
                            </div>
                            <div className="action-row">
                                <button className="act-btn approve">{isAr ? '✓ موافقة' : '✓ Approve'}</button>
                                <button className="act-btn reject">{isAr ? '✕ رفض' : '✕ Reject'}</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </aside>
    );
}
