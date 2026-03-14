import SettingsClient from '@/components/SettingsClient';

export default function SettingsPage({ params }: { params: { locale: 'en' | 'ar' } }) {
    return <SettingsClient locale={params.locale} />;
}
