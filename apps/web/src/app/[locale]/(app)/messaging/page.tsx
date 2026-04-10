import MessagingWorkspaceClient from '@/components/messaging/MessagingWorkspaceClient';

export default function MessagingDashboardPage({ params }: { params: { locale: string } }) {
    return <MessagingWorkspaceClient locale={params.locale} />;
}
