import TemplatesClient from '@/components/messaging/TemplatesClient';
import { resolveRouteLocale } from '@/lib/route-locale';

export default async function TemplatesPage({
    params,
}: {
    params: { locale?: string } | Promise<{ locale?: string }>;
}) {
    const locale = await resolveRouteLocale(params);
    return <TemplatesClient locale={locale} />;
}
