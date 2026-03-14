import ReportsClient from '@/components/ReportsClient';

export default function ReportsPage({ params }: { params: { locale: 'en' | 'ar' } }) {
    return <ReportsClient locale={params.locale} />;
}
