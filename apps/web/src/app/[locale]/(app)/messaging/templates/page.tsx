import TemplatesClient from '@/components/messaging/TemplatesClient';

export default function TemplatesPage({ params }: { params: { locale: string } }) {
    return <TemplatesClient locale={params.locale} />;
}
