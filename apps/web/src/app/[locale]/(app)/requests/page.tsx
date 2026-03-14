import RequestsClient from '@/components/RequestsClient';

export default function RequestsPage({ params }: { params: { locale: 'en' | 'ar' } }) {
    return <RequestsClient locale={params.locale} />;
}
