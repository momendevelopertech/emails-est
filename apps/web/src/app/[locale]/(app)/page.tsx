import { redirect } from 'next/navigation';

export default function DashboardPage({ params }: { params: { locale: 'en' | 'ar' } }) {
    redirect(`/${params.locale}/messaging/upload`);
}
