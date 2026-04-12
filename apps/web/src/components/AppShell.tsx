'use client';

import Link from 'next/link';
import { ReactNode, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { FileSpreadsheet, LayoutPanelTop, LogOut, Menu, SendHorizontal, Settings } from 'lucide-react';
import TopNav from './TopNav';
import ConfirmDialog from './ConfirmDialog';
import { useAuthContext } from '@/context/AuthContext';
import { useAuthStore } from '@/stores/auth-store';

export default function AppShell({ locale, children }: { locale: string; children: ReactNode }) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { logout } = useAuthContext();
    const { user } = useAuthStore();
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
    const activeTab = searchParams.get('tab') || 'recipients';
    const isMessagingRoute = pathname?.includes('/messaging');
    const isUploadRoute = pathname?.includes('/messaging/upload');
    const isTemplatesRoute = pathname?.includes('/messaging/templates');
    const isWorkspaceRoute = isMessagingRoute && !isUploadRoute && !isTemplatesRoute;
    const isSuperAdmin = user?.role === 'SUPER_ADMIN';

    const navItems = [
        {
            id: 'upload',
            href: `/${locale}/messaging/upload`,
            label: locale === 'ar' ? 'رفع Excel' : 'Upload Excel',
            icon: FileSpreadsheet,
            active: Boolean(isUploadRoute),
        },
        {
            id: 'recipients',
            href: `/${locale}/messaging?tab=recipients`,
            label: locale === 'ar' ? 'المستلمين' : 'Recipients',
            icon: FileSpreadsheet,
            active: Boolean(isWorkspaceRoute && activeTab === 'recipients'),
        },
        {
            id: 'templates',
            href: `/${locale}/messaging?tab=templates`,
            label: locale === 'ar' ? 'القوالب' : 'Templates',
            icon: LayoutPanelTop,
            active: Boolean(isTemplatesRoute || (isWorkspaceRoute && activeTab === 'templates')),
        },
        {
            id: 'campaign',
            href: `/${locale}/messaging?tab=campaign`,
            label: locale === 'ar' ? 'الإرسال' : 'Campaign',
            icon: SendHorizontal,
            active: Boolean(isWorkspaceRoute && activeTab === 'campaign'),
        },
        ...(isSuperAdmin ? [{
            id: 'settings',
            href: `/${locale}/messaging?tab=settings`,
            label: locale === 'ar' ? 'الإعدادات' : 'Settings',
            icon: Settings,
            active: Boolean(isWorkspaceRoute && activeTab === 'settings'),
        }] : []),
    ];

    const closeMobile = () => setMobileOpen(false);
    const handleLogout = () => {
        setIsLogoutDialogOpen(false);
        logout();
    };

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
                    <button type="button" className="btn-outline w-full" onClick={() => setIsLogoutDialogOpen(true)}>
                        <LogOut size={16} />
                        <span>{locale === 'ar' ? 'تسجيل الخروج' : 'Log out'}</span>
                    </button>
                </div>
            </aside>

            <div className="app-main px-4 pb-10 md:px-6 xl:px-8">
                {children}
            </div>

            <ConfirmDialog
                open={isLogoutDialogOpen}
                title={locale === 'ar' ? 'تأكيد تسجيل الخروج' : 'Confirm logout'}
                description={locale === 'ar' ? 'هل أنت متأكد أنك تريد تسجيل الخروج؟' : 'Are you sure you want to log out?'}
                confirmLabel={locale === 'ar' ? 'تسجيل الخروج' : 'Log out'}
                cancelLabel={locale === 'ar' ? 'إلغاء' : 'Cancel'}
                onCancel={() => setIsLogoutDialogOpen(false)}
                onConfirm={handleLogout}
            />
        </div>
    );
}
