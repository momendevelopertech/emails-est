import UploadExcelClient from '@/components/messaging/UploadExcelClient';
import { resolveRouteLocale } from '@/lib/route-locale';

export default async function UploadPage({
    params,
}: {
    params: { locale?: string } | Promise<{ locale?: string }>;
}) {
    const locale = await resolveRouteLocale(params);
    return <UploadExcelClient locale={locale} />;
}
