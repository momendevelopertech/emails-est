import { redirect } from 'next/navigation';

export default function ConfirmRecipientPage({
    searchParams,
}: {
    searchParams?: { token?: string; action?: string };
}) {
    const params = new URLSearchParams();

    if (searchParams?.token) {
        params.set('token', searchParams.token);
    }

    if (searchParams?.action) {
        params.set('action', searchParams.action);
    }

    redirect(`/messaging/confirm${params.toString() ? `?${params.toString()}` : ''}`);
}
