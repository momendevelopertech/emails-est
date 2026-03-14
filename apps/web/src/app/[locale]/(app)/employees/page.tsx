import EmployeesClient from '@/components/EmployeesClient';

export default function EmployeesPage({ params }: { params: { locale: 'en' | 'ar' } }) {
    return <EmployeesClient locale={params.locale} />;
}
