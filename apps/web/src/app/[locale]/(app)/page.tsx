import { redirect } from 'next/navigation';
import { resolveRouteLocale } from '@/lib/route-locale';

export default async function DashboardPage({
    params,
}: {
    params: { locale?: string } | Promise<{ locale?: string }>;
}) {
    const locale = await resolveRouteLocale(params);
    redirect(`/${locale}/messaging/upload`);
}
