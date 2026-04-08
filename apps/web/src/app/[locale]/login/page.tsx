'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import api, { AppApiError, setAccessToken } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import BrandLogo from '@/components/BrandLogo';

export default function LoginPage({ params }: { params: { locale: 'en' | 'ar' } }) {
  const t = useTranslations('auth');
  const router = useRouter();
  const { setUser, setBootstrapped } = useAuthStore();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      toast.error(t('loginPasswordRequired'));
      return;
    }

    setPending(true);
    try {
      await api.get('/auth/csrf');
      const response = await api.post('/auth/login', { identifier, password });
      setAccessToken(response.data?.accessToken || null);
      setUser(response.data?.user || null);
      setBootstrapped(true);
      router.push(`/${params.locale}/messaging/upload`);
    } catch (error) {
      const message = error instanceof AppApiError ? error.message : t('loginFailed');
      toast.error(message);
    } finally {
      setPending(false);
    }
  };

  return (
    <main className="min-h-screen bg-atmosphere p-6 flex items-center justify-center">
      <form onSubmit={onSubmit} className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm space-y-5">
        <BrandLogo locale={params.locale} />
        <h1 className="text-2xl font-semibold">{t('loginTitle')}</h1>
        <input className="input" placeholder={t('loginIdentifierPlaceholder')} value={identifier} onChange={(e) => setIdentifier(e.target.value)} disabled={pending} />
        <input className="input" type="password" placeholder={t('loginPasswordPlaceholder')} value={password} onChange={(e) => setPassword(e.target.value)} disabled={pending} />
        <button className="btn-primary w-full" type="submit" disabled={pending}>{pending ? t('loading') : t('loginButton')}</button>
      </form>
    </main>
  );
}
