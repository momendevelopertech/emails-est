import { defaultLocale, locales } from '@/i18n/routing';

type LocaleParams = { locale?: string };

export async function resolveRouteLocale(params: LocaleParams | Promise<LocaleParams>) {
    const resolvedParams = await params;
    const candidate = resolvedParams?.locale;
    return locales.includes(candidate as (typeof locales)[number]) ? candidate : defaultLocale;
}
