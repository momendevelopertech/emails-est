'use client';

import { ReactNode, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import TopNav from './TopNav';
import NavLinks from './NavLinks';
import SidebarFooter from './SidebarFooter';

export default function AppShell({ locale, children }: { locale: string; children: ReactNode }) {
    const pathname = usePathname();
    const hideShell = pathname.includes('/requests/print/');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const stored = window.localStorage.getItem('sphinx-sidebar-collapsed');
        if (stored !== null) {
            setSidebarCollapsed(stored === '1');
        }
    }, []);

    const toggleSidebar = () => {
        setSidebarCollapsed((prev) => {
            const next = !prev;
            if (typeof window !== 'undefined') {
                window.localStorage.setItem('sphinx-sidebar-collapsed', next ? '1' : '0');
            }
            return next;
        });
    };

    if (hideShell) {
        return <div className="min-h-screen">{children}</div>;
    }

    return (
        <div className="app-shell min-h-screen">
            <aside className={`app-sidebar ${sidebarCollapsed ? 'is-collapsed' : ''}`}>
                <TopNav locale={locale} collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
                <NavLinks locale={locale} collapsed={sidebarCollapsed} />
                <SidebarFooter locale={locale} collapsed={sidebarCollapsed} />
            </aside>
            <div className="app-main">{children}</div>
        </div>
    );
}
