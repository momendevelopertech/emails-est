import LogsClient from '@/components/messaging/LogsClient';
import { resolveRouteLocale } from '@/lib/route-locale';

export default async function LogsPage({
    params,
}: {
    params: { locale?: string } | Promise<{ locale?: string }>;
}) {
    const locale = await resolveRouteLocale(params);
    return <LogsClient locale={locale} />;
}
