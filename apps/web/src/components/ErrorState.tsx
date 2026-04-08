import Link from 'next/link';

export default function ErrorState({
  title,
  description,
  ctaHref,
  ctaLabel,
}: {
  title: string;
  description: string;
  ctaHref: string;
  ctaLabel: string;
}) {
  return (
    <main className="min-h-screen bg-atmosphere px-6 py-16 flex items-center justify-center">
      <section className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm text-center space-y-4">
        <h1 className="text-3xl font-semibold text-slate-900">{title}</h1>
        <p className="text-slate-600">{description}</p>
        <Link href={ctaHref} className="btn-primary inline-flex">
          {ctaLabel}
        </Link>
      </section>
    </main>
  );
}
