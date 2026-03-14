import DashboardClient from '@/components/DashboardClient';

export default function DashboardPage({ params }: { params: { locale: 'en' | 'ar' } }) {
    return <DashboardClient locale={params.locale} />;
}
