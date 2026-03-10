'use client';

import Image from 'next/image';
import Link from 'next/link';

export default function BrandLogo({
    locale,
    compact = false,
}: {
    locale: string;
    compact?: boolean;
}) {
    const cssWidth = compact ? 170 : 280;
    const intrinsicWidth = 280;
    const intrinsicHeight = 112;

    return (
        <Link href={`/${locale}`} className="inline-flex items-center" aria-label="SPHINX Home">
            <Image
                src="/brand/sphinx-logo.svg"
                alt="SPHINX Logo"
                width={intrinsicWidth}
                height={intrinsicHeight}
                style={{ width: cssWidth, height: 'auto' }}
                priority
            />
        </Link>
    );
}
