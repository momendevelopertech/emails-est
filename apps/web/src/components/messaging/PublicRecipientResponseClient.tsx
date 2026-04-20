'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Clock3, HeartHandshake, MapPin, Sparkles, XCircle } from 'lucide-react';
import api from '@/lib/api';

type ResponseStatus = 'PENDING' | 'CONFIRMED' | 'DECLINED';
type ResponseAction = 'confirm' | 'decline';

type PublicRecipientPayload = {
    id: string;
    name?: string | null;
    arabic_name?: string | null;
    email?: string | null;
    phone?: string | null;
    role?: string | null;
    type?: string | null;
    room_est1?: string | null;
    governorate?: string | null;
    building?: string | null;
    address?: string | null;
    location?: string | null;
};

const STATUS_STYLES: Record<ResponseStatus, string> = {
    PENDING: 'border border-slate-200 bg-slate-100 text-slate-700',
    CONFIRMED: 'border border-emerald-200 bg-emerald-50 text-emerald-800',
    DECLINED: 'border border-rose-200 bg-rose-50 text-rose-800',
};

const STATUS_LABELS: Record<ResponseStatus, string> = {
    PENDING: 'Pending response',
    CONFIRMED: 'Confirmed',
    DECLINED: 'Apologized',
};

const STATUS_MESSAGES: Record<ResponseStatus, { title: string; body: string }> = {
    PENDING: {
        title: 'Please choose your response',
        body: 'Review the assignment summary below, then choose the response that reflects the proctor\'s availability.',
    },
    CONFIRMED: {
        title: 'Your attendance has been confirmed',
        body: 'Thank you for confirming your attendance. We appreciate your support and wish you a smooth exam day.',
    },
    DECLINED: {
        title: 'Your apology has been accepted',
        body: 'Thank you for letting us know. We appreciate your response, and we wish you better luck next time.',
    },
};

const EMPTY_VALUE_LABEL = 'empty';

export default function PublicRecipientResponseClient() {
    const searchParams = useSearchParams();
    const token = searchParams.get('token') || '';
    const requestedAction = searchParams.get('action');
    const autoActionHandledRef = useRef(false);
    const [viewState, setViewState] = useState<'loading' | 'ready' | 'submitting' | 'error'>('loading');
    const [status, setStatus] = useState<ResponseStatus>('PENDING');
    const [message, setMessage] = useState('Checking your assignment...');
    const [recipient, setRecipient] = useState<PublicRecipientPayload | null>(null);

    const statusCopy = STATUS_MESSAGES[status];
    const isFinalState = viewState === 'ready' && status !== 'PENDING';

    const submitAction = async (action: ResponseAction) => {
        if (!token) {
            setViewState('error');
            setMessage('Invalid confirmation link.');
            return;
        }

        if (status !== 'PENDING') {
            setViewState('ready');
            setMessage(
                status === 'CONFIRMED'
                    ? 'You already confirmed attendance for this assignment.'
                    : 'You already sent an apology for this assignment.',
            );
            return;
        }

        setViewState('submitting');
        setMessage(action === 'confirm' ? 'Confirming your assignment...' : 'Recording your apology...');

        try {
            const endpoint = action === 'confirm' ? '/public/recipients/confirm' : '/public/recipients/decline';
            const response = await api.post(endpoint, { token });
            const nextStatus = response?.data?.status as ResponseStatus | undefined;
            setStatus(nextStatus || (action === 'confirm' ? 'CONFIRMED' : 'DECLINED'));
            setMessage(
                response?.data?.message
                || (action === 'confirm' ? 'Your assignment has been confirmed successfully.' : 'Your apology has been recorded successfully.')
            );
            setViewState('ready');
        } catch (error: any) {
            setViewState('error');
            setMessage(
                error?.response?.data?.message
                || error?.message
                || 'Unable to process your request right now. Please try again.',
            );
        }
    };

    useEffect(() => {
        if (!token) {
            setViewState('error');
            setMessage('Invalid confirmation link.');
            return;
        }

        setViewState('loading');
        api.get('/public/recipients/response', { params: { token } })
            .then((response) => {
                const nextStatus = (response?.data?.status as ResponseStatus) || 'PENDING';
                setRecipient(response?.data?.recipient || null);
                setStatus(nextStatus);
                setMessage(
                    nextStatus === 'CONFIRMED'
                        ? 'This assignment has already been confirmed.'
                        : nextStatus === 'DECLINED'
                            ? 'This assignment has already been apologized for.'
                            : 'Please choose how you want to respond to this assignment.',
                );
                setViewState('ready');
            })
            .catch((error: any) => {
                setViewState('error');
                setMessage(
                    error?.response?.data?.message
                    || error?.message
                    || 'Unable to load this assignment response page.',
                );
            });
    }, [token]);

    useEffect(() => {
        if (viewState !== 'ready' || autoActionHandledRef.current) {
            return;
        }

        if (status !== 'PENDING') {
            if (requestedAction === 'confirm' && status === 'CONFIRMED') {
                setMessage('You already confirmed attendance for this assignment.');
            }

            if (requestedAction === 'decline' && status === 'DECLINED') {
                setMessage('You already sent an apology for this assignment.');
            }
            return;
        }

        if (requestedAction === 'confirm') {
            autoActionHandledRef.current = true;
            void submitAction('confirm');
            return;
        }

        if (requestedAction === 'decline') {
            autoActionHandledRef.current = true;
            void submitAction('decline');
        }
    }, [requestedAction, status, viewState]);

    return (
        <section className="min-h-screen bg-atmosphere px-4 py-10 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-4xl rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5 md:p-8">
                <div className="rounded-[1.8rem] border border-slate-200 bg-slate-50 p-6">
                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-white text-slate-700 shadow-sm">
                        {status === 'CONFIRMED' ? <HeartHandshake size={28} className="text-emerald-600" /> : status === 'DECLINED' ? <Sparkles size={28} className="text-rose-600" /> : <Clock3 size={28} className="text-slate-500" />}
                    </div>
                    <div className="mt-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0">
                            <div className="inline-flex max-w-full items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                                <Clock3 size={14} />
                                <span>EST assignment response</span>
                            </div>
                            <h1 className="mt-4 break-words text-2xl font-semibold leading-tight text-slate-950 sm:text-3xl">{statusCopy.title}</h1>
                            <p className="mt-3 max-w-2xl break-words text-sm leading-6 text-slate-600 [overflow-wrap:anywhere]">
                                {statusCopy.body}
                            </p>
                        </div>
                        <div className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${STATUS_STYLES[status]}`}>
                            {status === 'CONFIRMED' ? <CheckCircle2 size={16} /> : status === 'DECLINED' ? <XCircle size={16} /> : <Clock3 size={16} />}
                            <span>{STATUS_LABELS[status]}</span>
                        </div>
                    </div>
                </div>

                <div className="mt-8 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                    <div className="text-lg font-semibold text-slate-900 break-words [overflow-wrap:anywhere]">
                        {recipient?.name || 'Assignment response'}
                    </div>
                    {recipient?.arabic_name ? (
                        <div className="mt-1 break-words text-sm text-slate-600 [overflow-wrap:anywhere]">{recipient.arabic_name}</div>
                    ) : null}

                    <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-[1.2rem] border border-slate-200 bg-white p-4">
                            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Room</div>
                            <div className="mt-2 break-words text-sm font-semibold text-slate-900 [overflow-wrap:anywhere]">{recipient?.room_est1 || EMPTY_VALUE_LABEL}</div>
                        </div>
                        <div className="rounded-[1.2rem] border border-slate-200 bg-white p-4">
                            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Role</div>
                            <div className="mt-2 break-words text-sm font-semibold text-slate-900 [overflow-wrap:anywhere]">{recipient?.role || EMPTY_VALUE_LABEL}</div>
                        </div>
                        <div className="rounded-[1.2rem] border border-slate-200 bg-white p-4">
                            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Type</div>
                            <div className="mt-2 break-words text-sm font-semibold text-slate-900 [overflow-wrap:anywhere]">{recipient?.type || EMPTY_VALUE_LABEL}</div>
                        </div>
                        <div className="rounded-[1.2rem] border border-slate-200 bg-white p-4">
                            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Governorate</div>
                            <div className="mt-2 break-words text-sm font-semibold text-slate-900 [overflow-wrap:anywhere]">{recipient?.governorate || EMPTY_VALUE_LABEL}</div>
                        </div>
                    </div>

                    {(recipient?.building || recipient?.address || recipient?.location) ? (
                        <div className="mt-4 rounded-[1.2rem] border border-slate-200 bg-white p-4 text-sm text-slate-700">
                            <div className="flex items-start gap-2">
                                <MapPin size={16} className="mt-0.5 shrink-0 text-slate-400" />
                                <div className="min-w-0 space-y-1 break-words [overflow-wrap:anywhere]">
                                    {recipient?.building ? <div><strong>Building:</strong> {recipient.building}</div> : null}
                                    {recipient?.address ? <div><strong>Address:</strong> {recipient.address}</div> : null}
                                    {recipient?.location ? <div><strong>Location:</strong> {recipient.location}</div> : null}
                                </div>
                            </div>
                        </div>
                    ) : null}
                </div>

                <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-white px-5 py-4">
                    <div className="text-sm font-semibold text-slate-900">Current message</div>
                    <p className="mt-2 break-words text-sm leading-6 text-slate-600 [overflow-wrap:anywhere]">{message}</p>
                </div>

                {!isFinalState ? (
                    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                        <button
                            type="button"
                            className="inline-flex min-h-12 items-center justify-center rounded-[1.2rem] bg-emerald-600 px-6 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                            onClick={() => void submitAction('confirm')}
                            disabled={viewState === 'loading' || viewState === 'submitting'}
                        >
                            Confirm assignment
                        </button>
                        <button
                            type="button"
                            className="inline-flex min-h-12 items-center justify-center rounded-[1.2rem] border border-rose-200 bg-rose-50 px-6 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                            onClick={() => void submitAction('decline')}
                            disabled={viewState === 'loading' || viewState === 'submitting'}
                        >
                            Send apology
                        </button>
                    </div>
                ) : null}
            </div>
        </section>
    );
}
