import AppShell from '@/components/AppShell';
import SettingsClient from '@/components/SettingsClient';

export default function SettingsPage({ params }: { params: { locale: 'en' | 'ar' } }) {
    return (
        <AppShell locale={params.locale}>
            <SettingsClient locale={params.locale} />
        </AppShell>
    );
}
