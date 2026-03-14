import { ReactNode } from 'react';
import AppShell from '@/components/AppShell';

export default function AppLayout({
    children,
    params,
}: {
    children: ReactNode;
    params: { locale: string };
}) {
    return <AppShell locale={params.locale}>{children}</AppShell>;
}
