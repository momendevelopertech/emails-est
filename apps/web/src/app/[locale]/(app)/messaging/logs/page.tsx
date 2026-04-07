import LogsClient from '@/components/messaging/LogsClient';

export default function LogsPage({ params }: { params: { locale: string } }) {
    return <LogsClient locale={params.locale} />;
}
