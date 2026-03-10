import SupportChatPageClient from '@/components/SupportChatPageClient';

export default function SupportPage({ params }: { params: { locale: string } }) {
    return <SupportChatPageClient locale={params.locale} />;
}
