'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import TopNav from './TopNav';
import NavLinks from './NavLinks';

export default function AppShell({ locale, children }: { locale: string; children: ReactNode }) {
    const pathname = usePathname();
    const hideShell = pathname.includes('/requests/print/');

    return (
        <div className="min-h-screen">
            {!hideShell && <TopNav locale={locale} />}
            {!hideShell && <NavLinks locale={locale} />}
            {children}
        </div>
    );
}
