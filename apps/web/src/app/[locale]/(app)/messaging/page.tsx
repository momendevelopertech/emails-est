import MessagingDashboardClient from '@/components/messaging/MessagingDashboardClient';
import { resolveRouteLocale } from '@/lib/route-locale';

export default async function MessagingDashboardPage({
    params,
}: {
    params: { locale?: string } | Promise<{ locale?: string }>;
}) {
    const locale = await resolveRouteLocale(params);
    return <MessagingDashboardClient locale={locale} />;
}
