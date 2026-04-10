import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default function DashboardPage({ params }: { params: { locale: 'en' | 'ar' } }) {
    const cookieStore = cookies();
    const hasSession =
        cookieStore.has('access_token') ||
        cookieStore.has('refresh_token') ||
        cookieStore.has('sphinx_session');

    redirect(`/${params.locale}/${hasSession ? 'messaging/upload' : 'login'}`);
}
