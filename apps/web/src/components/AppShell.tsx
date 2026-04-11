'use client';

import Link from 'next/link';
import { ReactNode, useMemo, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { FileSpreadsheet, LayoutPanelTop, LogOut, Menu, SendHorizontal, Settings } from 'lucide-react';
import TopNav from './TopNav';
import { useAuthContext } from '@/context/AuthContext';
import { useAuthStore } from '@/stores/auth-store';

export default function AppShell({ locale, children }: { locale: string; children: ReactNode }) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { logout } = useAuthContext();
    const { user } = useAuthStore();
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const activeTab = searchParams.get('tab') || 'recipients';
    const isMessagingRoute = pathname?.includes('/messaging');
    const isSuperAdmin = user?.role === 'SUPER_ADMIN';
    const initials = useMemo(() => {
        const value = user?.fullName?.trim();
        if (!value) return 'HR';
        return value
            .split(/\s+/)
            .slice(0, 2)
            .map((part) => part[0]?.toUpperCase())
            .join('') || 'HR';
    }, [user?.fullName]);

    const navItems = [
        {
            id: 'recipients',
            href: `/${locale}/messaging?tab=recipients`,
            label: locale === 'ar' ? 'المستلمين والرفع' : 'Recipients',
            icon: FileSpreadsheet,
            active: isMessagingRoute && activeTab === 'recipients',
        },
        {
            id: 'templates',
            href: `/${locale}/messaging?tab=templates`,
            label: locale === 'ar' ? 'القوالب' : 'Templates',
            icon: LayoutPanelTop,
            active: isMessagingRoute && activeTab === 'templates',
        },
        {
            id: 'campaign',
            href: `/${locale}/messaging?tab=campaign`,
            label: locale === 'ar' ? 'الإرسال والسجل' : 'Campaign',
            icon: SendHorizontal,
            active: isMessagingRoute && activeTab === 'campaign',
        },
        ...(isSuperAdmin ? [{
            id: 'settings',
            href: `/${locale}/messaging?tab=settings`,
            label: locale === 'ar' ? 'الإعدادات' : 'Settings',
            icon: Settings,
            active: isMessagingRoute && activeTab === 'settings',
        }] : []),
    ];

    const closeMobile = () => setMobileOpen(false);

    return (
        <div className="app-shell min-h-screen">
            <button
                type="button"
                className="mobile-nav-trigger"
                onClick={() => setMobileOpen(true)}
                aria-label={locale === 'ar' ? 'فتح القائمة' : 'Open navigation'}
            >
                <Menu size={18} />
            </button>

            {mobileOpen && (
                <button
                    type="button"
                    className="mobile-sidebar-backdrop"
                    aria-label={locale === 'ar' ? 'إغلاق القائمة' : 'Close navigation'}
                    onClick={closeMobile}
                />
            )}

            <aside className={`app-sidebar ${collapsed ? 'is-collapsed' : ''} ${mobileOpen ? 'is-mobile-open' : ''}`}>
                <TopNav
                    locale={locale}
                    collapsed={collapsed}
                    onToggle={() => setCollapsed((value) => !value)}
                    showToggle
                />

                <div className={`nav-scroll ${collapsed ? 'is-collapsed' : ''}`}>
                    <div className="nav-section-label">{locale === 'ar' ? 'لوحة الرسائل' : 'Messaging'}</div>
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.id}
                                href={item.href}
                                onClick={closeMobile}
                                className={`nav-item ${collapsed ? 'is-collapsed' : ''} ${item.active ? 'active' : ''}`}
                                title={item.label}
                            >
                                <Icon className="nav-ic" />
                                <span className="nav-text">{item.label}</span>
                            </Link>
                        );
                    })}
                </div>

                <div className="sidebar-footer">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            {locale === 'ar' ? 'حسابك الحالي' : 'Current Session'}
                        </div>
                        <div className="mt-3 flex items-center gap-3">
                            <div className="uav">{initials}</div>
                            {!collapsed && (
                                <div className="min-w-0">
                                    <div className="truncate text-sm font-semibold text-slate-900">{user?.fullName || 'SPHINX Admin'}</div>
                                    <div className="truncate text-xs text-slate-500">{user?.email || 'superadmin@sphinx.com'}</div>
                                </div>
                            )}
                        </div>
                    </div>

                    <button type="button" className="btn-outline mt-3 w-full" onClick={logout}>
                        <LogOut size={16} />
                        <span>{locale === 'ar' ? 'تسجيل الخروج' : 'Log out'}</span>
                    </button>
                </div>
            </aside>

            <div className="app-main px-4 pb-10 md:px-6 xl:px-8">
                {children}
            </div>
        </div>
    );
}
