'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMessages } from 'next-intl';
import toast from 'react-hot-toast';
import api, { AppApiError, setAccessToken } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import BrandLogo from '@/components/BrandLogo';

export default function LoginPage({ params }: { params: { locale: 'en' | 'ar' } }) {
  const messages = useMessages() as Record<string, unknown>;
  const authMessages = (messages.auth as Record<string, unknown> | undefined) ?? {};
  const router = useRouter();
  const { setUser, setBootstrapped } = useAuthStore();
  const [identifier, setIdentifier] = useState('superadmin@sphinx.com');
  const [password, setPassword] = useState('Admin@123456');
  const [pending, setPending] = useState(false);
  const [errorDetails, setErrorDetails] = useState<{
    title: string;
    description: string;
    meta?: string;
  } | null>(null);

  const getMessage = (key: string, fallback: string) => {
    const value = authMessages[key];
    return typeof value === 'string' ? value : fallback;
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      toast.error(getMessage('loginPasswordRequired', 'Please enter your password.'));
      return;
    }

    setPending(true);
    setErrorDetails(null);
    try {
      await api.get('/auth/csrf');
      const response = await api.post('/auth/login', { identifier, password });
      setAccessToken(response.data?.accessToken || null);
      setUser(response.data?.user || null);
      setBootstrapped(true);
      router.push(`/${params.locale}/messaging/upload`);
    } catch (error) {
      const message = error instanceof AppApiError ? error.message : getMessage('loginInvalid', 'Login failed.');
      if (error instanceof AppApiError) {
        const statusLabel = error.status ? `HTTP ${error.status}` : params.locale === 'ar' ? 'بدون كود HTTP' : 'No HTTP status';
        const endpoint = typeof error.details?.endpoint === 'string' ? error.details.endpoint : '/auth/login';
        const code = typeof error.details?.code === 'string' ? error.details.code : null;
        const extraParts = [statusLabel, `endpoint: ${endpoint}`];
        if (code) extraParts.push(`code: ${code}`);

        setErrorDetails({
          title: params.locale === 'ar' ? 'فشل تسجيل الدخول' : 'Login failed',
          description: message,
          meta: extraParts.join(' • '),
        });
      } else {
        setErrorDetails({
          title: params.locale === 'ar' ? 'فشل تسجيل الدخول' : 'Login failed',
          description: params.locale === 'ar'
            ? 'حدث خطأ غير متوقع. حاول مرة أخرى.'
            : 'Unexpected error happened. Please retry.',
        });
      }
      console.error('[login] submit failed', error);
      toast.error(message);
    } finally {
      setPending(false);
    }
  };

  const fieldClassName = [
    'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3',
    'text-sm text-slate-900 shadow-sm transition',
    'placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100',
    'disabled:cursor-not-allowed disabled:bg-slate-100',
  ].join(' ');

  return (
    <main className="min-h-screen bg-atmosphere px-4 py-8 sm:px-6 flex items-center justify-center">
      <form onSubmit={onSubmit} className="w-full max-w-lg rounded-[2rem] border border-slate-200/80 bg-white/95 p-6 shadow-xl shadow-emerald-950/5 backdrop-blur sm:p-8">
        <div className="space-y-6">
          <div className="flex justify-center">
            <BrandLogo locale={params.locale} />
          </div>

          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-semibold text-slate-900">{getMessage('loginTitle', getMessage('login', 'Login'))}</h1>
            <p className="text-sm text-slate-500">
              {params.locale === 'ar'
                ? 'البيانات مُسجلة تلقائيًا. اضغط تسجيل الدخول مباشرة أو عدلها إذا أردت.'
                : 'Credentials are already filled in. Click sign in directly or edit them if needed.'}
            </p>
          </div>

          <div className="rounded-3xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            <div className="font-semibold">{params.locale === 'ar' ? 'بيانات الدخول الجاهزة' : 'Ready-to-use credentials'}</div>
            <div className="mt-1 font-mono text-xs sm:text-sm" dir="ltr">
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
                onChange={(e) => setIdentifier(e.target.value)}
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
                onChange={(e) => setPassword(e.target.value)}
                disabled={pending}
              />
            </label>
          </div>

          <button className="btn-primary w-full !rounded-2xl !py-3 text-base font-semibold" type="submit" disabled={pending}>
            {pending ? getMessage('loading', 'Loading...') : getMessage('loginButton', getMessage('login', 'Login'))}
          </button>

          {errorDetails && (
            <div
              role="alert"
              className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-start text-sm text-rose-900"
            >
              <div className="font-semibold">{errorDetails.title}</div>
              <div className="mt-1">{errorDetails.description}</div>
              {errorDetails.meta ? (
                <div className="mt-2 font-mono text-xs text-rose-700/90" dir="ltr">
                  {errorDetails.meta}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </form>
    </main>
  );
}
