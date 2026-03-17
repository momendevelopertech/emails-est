'use client';

type SideItem = {
    id: string;
    name: string;
    type: string;
    time?: string;
    color: 'accent' | 'amber' | 'teal' | 'violet' | 'rose';
};

type StatItem = {
    id: string;
    label: string;
    value: string;
    color: 'accent' | 'amber' | 'teal' | 'violet' | 'rose';
};

export default function DashboardSidePanel({
    locale,
    quickGlance,
    pendingStats,
    todayItems,
    approvalItems,
    deductionStats,
    deductionHint,
}: {
    locale: 'en' | 'ar';
    quickGlance: StatItem[];
    pendingStats: StatItem[];
    todayItems: SideItem[];
    approvalItems: SideItem[];
    deductionStats: StatItem[];
    deductionHint?: string;
}) {
    const isAr = locale === 'ar';
    return (
        <aside className="right-panel-ui">
            <div>
                <div className="rp-section-title">{isAr ? 'نظرة سريعة' : 'Quick glance'}</div>
                <div className="glance-grid">
                    {quickGlance.length === 0 && (
                        <div className="panel-empty">{isAr ? 'لا توجد بيانات بعد.' : 'No data yet.'}</div>
                    )}
                    {quickGlance.map((item) => (
                        <div key={item.id} className={`glance-card tone-${item.color}`}>
                            <div className="glance-label">{item.label}</div>
                            <div className="glance-value">{item.value}</div>
                        </div>
                    ))}
                </div>
            </div>

            <div>
                <div className="rp-section-title">{isAr ? 'طلبات معلقة' : 'Pending requests'}</div>
                <div className="summary-list">
                    {pendingStats.length === 0 && (
                        <div className="panel-empty">{isAr ? 'لا توجد طلبات معلقة.' : 'No pending requests.'}</div>
                    )}
                    {pendingStats.map((item) => (
                        <div key={item.id} className={`summary-row tone-${item.color}`}>
                            <span className="summary-label">{item.label}</span>
                            <span className="summary-value">{item.value}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div>
                <div className="rp-section-title">{isAr ? 'أحداث اليوم' : "Today's events"}</div>
                <div className="today-list">
                    {todayItems.length === 0 && (
                        <div className="panel-empty">{isAr ? 'لا توجد أحداث اليوم.' : 'No events today.'}</div>
                    )}
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
                <div className="rp-section-title">{isAr ? 'بانتظار موافقتك' : 'Awaiting your approval'}</div>
                <div className="pend-list">
                    {approvalItems.length === 0 && (
                        <div className="panel-empty">{isAr ? 'لا توجد طلبات تنتظر الموافقة.' : 'Nothing awaiting approval.'}</div>
                    )}
                    {approvalItems.map((item) => (
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
                                <button className="act-btn approve" type="button">{isAr ? '✓ موافقة' : '✓ Approve'}</button>
                                <button className="act-btn reject" type="button">{isAr ? '✕ رفض' : '✕ Reject'}</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div>
                <div className="rp-section-title">{isAr ? 'الخصومات' : 'Deductions'}</div>
                <div className="summary-list">
                    {deductionStats.length === 0 && (
                        <div className="panel-empty">{isAr ? 'لا توجد خصومات.' : 'No deductions.'}</div>
                    )}
                    {deductionStats.map((item) => (
                        <div key={item.id} className={`summary-row tone-${item.color}`}>
                            <span className="summary-label">{item.label}</span>
                            <span className="summary-value">{item.value}</span>
                        </div>
                    ))}
                </div>
                {deductionHint && <div className="panel-hint">{deductionHint}</div>}
            </div>
        </aside>
    );
}
