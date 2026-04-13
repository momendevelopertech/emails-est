'use client';

import { FormEvent, KeyboardEvent, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMessages } from 'next-intl';
import toast from 'react-hot-toast';
import api, { AppApiError, fetchCsrfToken, setAccessToken } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import BrandLogo from '@/components/BrandLogo';

export default function LoginPage({ params }: { params: { locale: 'en' | 'ar' } }) {
    const messages = useMessages() as Record<string, unknown>;
    const authMessages = (messages.auth as Record<string, unknown> | undefined) ?? {};
    const router = useRouter();
    const { setUser, setBootstrapped } = useAuthStore();
    const formRef = useRef<HTMLFormElement>(null);
    const [identifier, setIdentifier] = useState('superadmin@sphinx.com');
    const [password, setPassword] = useState('Admin@123456');
    const [pending, setPending] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const getMessage = (key: string, fallback: string) => {
        const value = authMessages[key];
        return typeof value === 'string' ? value : fallback;
    };

    const onSubmit = async (event: FormEvent) => {
        event.preventDefault();
        const trimmedIdentifier = identifier.trim();

        if (!trimmedIdentifier || !password.trim()) {
            toast.error(getMessage('loginPasswordRequired', 'Please enter your password.'));
            return;
        }

        setPending(true);
        setErrorMessage(null);

        try {
            await fetchCsrfToken();
            const response = await api.post('/auth/login', { identifier: trimmedIdentifier, password });
            setAccessToken(response.data?.accessToken || null);
            setUser(response.data?.user || null);
            setBootstrapped(true);
            router.replace(`/${params.locale}/messaging/upload`);
        } catch (error) {
            const message = error instanceof AppApiError
                ? error.message
                : getMessage('loginInvalid', 'Login failed.');

            setErrorMessage(message);
            console.error('[login] submit failed', error);
            toast.error(message);
        } finally {
            setPending(false);
        }
    };

    const handleFieldKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key !== 'Enter' || event.nativeEvent.isComposing || pending) {
            return;
        }

        event.preventDefault();
        formRef.current?.requestSubmit();
    };

    const fieldClassName = [
        'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3',
        'text-sm text-slate-900 shadow-sm transition',
        'placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100',
        'disabled:cursor-not-allowed disabled:bg-slate-100',
    ].join(' ');

    return (
        <main className="flex min-h-screen items-center justify-center bg-atmosphere px-4 py-8 sm:px-6">
            <form
                ref={formRef}
                onSubmit={onSubmit}
                className="w-full max-w-md rounded-[1.75rem] border border-slate-200/80 bg-white/95 p-6 shadow-lg shadow-slate-900/5 sm:p-8"
            >
                <div className="space-y-5">
                    <div className="flex justify-center">
                        <BrandLogo locale={params.locale} />
                    </div>

                    <div className="space-y-2 text-center">
                        <h1 className="text-3xl font-semibold text-slate-900">
                            {getMessage('loginTitle', getMessage('login', 'Login'))}
                        </h1>
                        <p className="text-sm text-slate-500">
                            {params.locale === 'ar'
                                ? 'تسجيل دخول مباشر وبسيط. عدل البريد أو كلمة المرور فقط إذا احتجت.'
                                : 'Simple sign in. Edit the email or password only if you need to.'}
                        </p>
                    </div>

                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-center text-sm text-emerald-900">
                        <div className="font-medium">
                            {params.locale === 'ar' ? 'حساب جاهز للتجربة السريعة' : 'Ready-to-use test account'}
                        </div>
                        <div className="mt-1 font-mono text-xs" dir="ltr">
                            superadmin@sphinx.com / Admin@123456
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label className="block space-y-2 text-start">
                            <span className="text-sm font-medium text-slate-700">
                                {params.locale === 'ar' ? 'البريد الإلكتروني أو اسم المستخدم' : 'Email or username'}
                            </span>
                            <input
                                className={fieldClassName}
                                dir="ltr"
                                autoComplete="username"
                                placeholder={getMessage('loginIdentifierPlaceholder', getMessage('email', 'Email or username'))}
                                value={identifier}
                                onChange={(event) => setIdentifier(event.target.value)}
                                onKeyDown={handleFieldKeyDown}
                                disabled={pending}
                            />
                        </label>

                        <label className="block space-y-2 text-start">
                            <span className="text-sm font-medium text-slate-700">
                                {params.locale === 'ar' ? 'كلمة المرور' : 'Password'}
                            </span>
                            <input
                                className={fieldClassName}
                                type="password"
                                dir="ltr"
                                autoComplete="current-password"
                                placeholder={getMessage('loginPasswordPlaceholder', getMessage('password', 'Password'))}
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                onKeyDown={handleFieldKeyDown}
                                disabled={pending}
                            />
                        </label>
                    </div>

                    <button className="btn-primary w-full !rounded-2xl !py-3 text-base font-semibold" type="submit" disabled={pending}>
                        {pending ? getMessage('loading', 'Loading...') : getMessage('loginButton', getMessage('login', 'Login'))}
                    </button>

                    {errorMessage ? (
                        <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-start text-sm text-rose-900">
                            <div className="font-semibold">{params.locale === 'ar' ? 'فشل تسجيل الدخول' : 'Sign in failed'}</div>
                            <div className="mt-1">{errorMessage}</div>
                        </div>
                    ) : null}
                </div>
            </form>
        </main>
    );
}
