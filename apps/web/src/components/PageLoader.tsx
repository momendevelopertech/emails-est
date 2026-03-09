'use client';

export default function PageLoader({ text }: { text?: string }) {
    return (
        <div className="px-6 py-10">
            <div className="card flex items-center justify-center gap-3 p-6">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-ink/30 border-t-ink" />
                <span className="text-sm text-ink/70">{text || 'Loading...'}</span>
            </div>
        </div>
    );
}
