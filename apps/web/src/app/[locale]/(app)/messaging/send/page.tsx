import SendCampaignClient from '@/components/messaging/SendCampaignClient';

export default function SendPage({ params }: { params: { locale: string } }) {
    return <SendCampaignClient locale={params.locale} />;
}
