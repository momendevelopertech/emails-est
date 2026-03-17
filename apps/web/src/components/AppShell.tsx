'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import TopNav from './TopNav';
import NavLinks from './NavLinks';

export default function AppShell({ locale, children }: { locale: string; children: ReactNode }) {
    const pathname = usePathname();
    const hideShell = pathname.includes('/requests/print/');

    if (hideShell) {
        return <div className="min-h-screen">{children}</div>;
    }

    return (
        <div className="app-shell min-h-screen">
            <aside className="app-sidebar">
                <TopNav locale={locale} />
                <NavLinks locale={locale} />
            </aside>
            <div className="app-main">{children}</div>
        </div>
    );
}
