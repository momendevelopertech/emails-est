import MessagingDashboardClient from '@/components/messaging/MessagingDashboardClient';

export default function MessagingDashboardPage({ params }: { params: { locale: string } }) {
    return <MessagingDashboardClient locale={params.locale} />;
}
