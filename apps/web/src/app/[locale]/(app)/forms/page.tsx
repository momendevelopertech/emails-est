import FormsBuilderClient from '@/components/FormsBuilderClient';

export default function FormsPage({ params }: { params: { locale: 'en' | 'ar' } }) {
    return <FormsBuilderClient locale={params.locale} />;
}
