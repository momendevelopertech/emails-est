import NotificationsClient from '@/components/NotificationsClient';

export default function NotificationsPage({ params }: { params: { locale: 'en' | 'ar' } }) {
    return <NotificationsClient locale={params.locale} />;
}
