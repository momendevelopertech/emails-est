import DepartmentsClient from '@/components/DepartmentsClient';

export default function DepartmentsPage({ params }: { params: { locale: 'en' | 'ar' } }) {
    return <DepartmentsClient locale={params.locale} />;
}
