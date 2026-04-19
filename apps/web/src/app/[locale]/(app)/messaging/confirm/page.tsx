'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import api from '@/lib/api';
import Link from 'next/link';

export default function ConfirmRecipientPage({ params }: { params: { locale: string } }) {
    const searchParams = useSearchParams();
    const locale = params.locale;
    const t = useTranslations('messaging');
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('');

    useEffect(() => {
        const token = searchParams.get('token');
        if (!token) {
            setStatus('error');
            setMessage(t('confirmInvalidToken') || 'Invalid confirmation link.');
            return;
        }

        api.post('/public/recipients/confirm', { token })
            .then((response) => {
                setStatus('success');
                setMessage(response?.data?.message || (t('confirmSuccess') || 'Your assignment has been confirmed.'));
            })
            .catch((error) => {
                setStatus('error');
                setMessage(
                    error?.response?.data?.message
                    || error?.message
                    || (t('confirmFailed') || 'Unable to confirm your assignment. Please try again.')
                );
            });
    }, [searchParams, t]);

    return (
        <section className="min-h-[70vh] px-4 py-10 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl rounded-[2rem] border border-slate-200 bg-white p-8 shadow-xl shadow-slate-900/5">
                <h1 className="text-3xl font-semibold text-slate-950">{t('confirmTitle') || 'Confirm your assignment'}</h1>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                    {t('confirmSubtitle') || 'Click the button below to complete your exam confirmation.'}
                </p>
                <div className="mt-8 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-6 text-slate-700">
                    <div className="text-lg font-semibold">
                        {status === 'loading' && (t('confirmLoading') || 'Confirming your assignment...')}
                        {status === 'success' && (t('confirmSuccess') || 'Confirmed successfully')}
                        {status === 'error' && (t('confirmFailedTitle') || 'Confirmation failed')}
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{message}</p>
                    <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                        <Link href={`/${locale}/messaging?tab=recipients`} className="btn-outline w-full text-center sm:w-auto">
                            {t('confirmReturnToDashboard') || 'Return to dashboard'}
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
}
