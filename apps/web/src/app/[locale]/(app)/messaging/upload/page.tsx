import UploadExcelClient from '@/components/messaging/UploadExcelClient';

export default function UploadPage({ params }: { params: { locale: string } }) {
    return <UploadExcelClient locale={params.locale} />;
}
