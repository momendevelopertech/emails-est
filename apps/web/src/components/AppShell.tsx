'use client';

import { ReactNode } from 'react';
import TopNav from './TopNav';

export default function AppShell({ locale, children }: { locale: string; children: ReactNode }) {
    return (
        <div className="app-shell min-h-screen">
            <div className="app-main">
                <TopNav locale={locale} collapsed={false} onToggle={() => {}} showToggle={false} />
                {children}
            </div>
        </div>
    );
}
