'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import api, { clearApiCache, clearBrowserRuntimeCache } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { KeyRound, Languages, LogOut, Moon, Sun } from 'lucide-react';
import toast from 'react-hot-toast';
import PwaInstallButton from './PwaInstallButton';

export default function TopNav({ locale }: { locale: string }) {
    const t = useTranslations('nav');
    const router = useRouter();
    const pathname = usePathname();
    const { user, setUser, setBootstrapped } = useAuthStore();
    const [theme, setTheme] = useState<'light' | 'dark'>('light');
    const [pwaEnabled, setPwaEnabled] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const stored = typeof window !== 'undefined' ? window.localStorage.getItem('theme') : null;
        const next = stored === 'dark' ? 'dark' : 'light';
        setTheme(next);
        if (typeof document !== 'undefined') {
            document.documentElement.dataset.theme = next;
        }
    }, []);

    useEffect(() => {
        if (!user) return;
        api.get('/settings/work-schedule')
            .then((res) => setPwaEnabled(!!res.data?.pwaInstallEnabled))
            .catch(() => null);
    }, [user]);

    useEffect(() => {
        const handler = (event: MouseEvent) => {
            if (!menuRef.current) return;
            if (!menuRef.current.contains(event.target as Node)) {
                setMenuOpen(false);
            }
        };
        window.addEventListener('click', handler);
        return () => window.removeEventListener('click', handler);
    }, []);

    const toggleTheme = () => {
        const next = theme === 'dark' ? 'light' : 'dark';
        setTheme(next);
        if (typeof document !== 'undefined') {
            document.documentElement.dataset.theme = next;
        }
        if (typeof window !== 'undefined') {
            window.localStorage.setItem('theme', next);
        }
    };

    const switchLocale = (nextLocale: string) => {
        const segments = pathname.split('/');
        segments[1] = nextLocale;
        router.push(segments.join('/'));
    };

    const logout = async () => {
        if (typeof window !== 'undefined') {
            window.sessionStorage.setItem('sphinx-logged-out', '1');
        }
        try {
            await api.post('/auth/logout');
        } catch {
            // Ignore logout network errors and continue client-side sign out.
        }
        await clearBrowserRuntimeCache();
        clearApiCache();
        setUser(null);
        setBootstrapped(false);
        router.push(`/${locale}/login`);
    };

    const requestPasswordReset = async () => {
        if (!user?.email) {
            toast.error(locale === 'ar' ? 'لا يوجد بريد إلكتروني مسجل لهذا المستخدم.' : 'No email found for this user.');
            return;
        }
        try {
            await api.post('/auth/forgot-password', { email: user.email, locale });
            toast.success(locale === 'ar' ? 'تم إرسال رابط تغيير كلمة المرور إلى بريدك الإلكتروني.' : 'Password reset link sent to your email.');
            setMenuOpen(false);
        } catch (error: any) {
            toast.error(error?.message || (locale === 'ar' ? 'تعذر إرسال الرابط.' : 'Failed to send reset link.'));
        }
    };

    const miniDays = locale === 'ar' ? ['س', 'ح', 'ن', 'ث', 'ر', 'خ', 'ج'] : ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const miniCalendar = useMemo(() => {
        const today = new Date();
        const y = today.getFullYear();
        const m = today.getMonth();
        const first = new Date(y, m, 1);
        const start = (first.getDay() + 1) % 7;
        const daysInMonth = new Date(y, m + 1, 0).getDate();
        const prevDays = new Date(y, m, 0).getDate();
        const cells: Array<{ n: number; out: boolean; today: boolean }> = [];
        for (let i = 0; i < start; i += 1) {
            cells.push({ n: prevDays - start + i + 1, out: true, today: false });
        }
        for (let i = 1; i <= daysInMonth; i += 1) {
            cells.push({ n: i, out: false, today: i === today.getDate() });
        }
        while (cells.length < 35) {
            cells.push({ n: cells.length - (start + daysInMonth) + 1, out: true, today: false });
        }
        return cells;
    }, []);

    return (
        <div className="sidebar-top">
            <div className="sidebar-brand">
                <div className="sidebar-brand-mark">SX</div>
                <div>
                    <div className="sidebar-brand-name">SPHINX HR</div>
                    <div className="sidebar-brand-sub">{locale === 'ar' ? 'نظام الموارد البشرية' : 'Human Resources System'}</div>
                </div>
            </div>
            <div className="mini-cal">
                <div className="mini-cal-head">
                    <span className="mini-month">{new Date().toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', { month: 'long', year: 'numeric' })}</span>
                </div>
                <div className="mini-grid">
                    {miniDays.map((day) => <div key={day} className="mini-dname">{day}</div>)}
                    {miniCalendar.map((day, index) => (
                        <div key={`${day.n}-${index}`} className={`mini-day ${day.out ? 'other' : ''} ${day.today ? 'today' : ''}`}>
                            {day.n}
                        </div>
                    ))}
                </div>
            </div>
            <div className="sidebar-footer" ref={menuRef}>
                <div className="sidebar-tools">
                    <button className="tb-icon" onClick={() => switchLocale(locale === 'ar' ? 'en' : 'ar')}>
                        <Languages size={14} />
                    </button>
                    <button className="tb-icon" onClick={toggleTheme}>
                        {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
                    </button>
                    <PwaInstallButton enabled={pwaEnabled} />
                </div>
                <button className="user-row" onClick={() => setMenuOpen((v) => !v)}>
                    <div className="uav">{user?.fullName?.slice(0, 1) || 'U'}</div>
                    <div>
                        <div className="uname">{user?.fullName || t('profile')}</div>
                        <div className="urole">{user?.role || ''}</div>
                    </div>
                </button>
                {menuOpen && (
                    <div className="sidebar-menu">
                        <button className="sidebar-menu-item" onClick={requestPasswordReset}><KeyRound size={14} />{locale === 'ar' ? 'تغيير كلمة المرور' : 'Change Password'}</button>
                        <button className="sidebar-menu-item text-rose-600" onClick={() => { setMenuOpen(false); logout(); }}><LogOut size={14} />{t('logout')}</button>
                    </div>
                )}
            </div>
        </div>
    );
}
