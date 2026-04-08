import { ReactNode } from 'react';
import AppShell from '@/components/AppShell';
import { resolveRouteLocale } from '@/lib/route-locale';

export default async function AppLayout({
    children,
    params,
}: {
    children: ReactNode;
    params: { locale?: string } | Promise<{ locale?: string }>;
}) {
    const locale = await resolveRouteLocale(params);
    return <AppShell locale={locale}>{children}</AppShell>;
}
