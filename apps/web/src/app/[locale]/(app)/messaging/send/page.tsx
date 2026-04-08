import SendCampaignClient from '@/components/messaging/SendCampaignClient';
import { resolveRouteLocale } from '@/lib/route-locale';

export default async function SendPage({
    params,
}: {
    params: { locale?: string } | Promise<{ locale?: string }>;
}) {
    const locale = await resolveRouteLocale(params);
    return <SendCampaignClient locale={locale} />;
}
