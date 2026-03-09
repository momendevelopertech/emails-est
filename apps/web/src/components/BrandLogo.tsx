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
    const width = compact ? 170 : 220;
    const height = compact ? 48 : 60;

    return (
        <Link href={`/${locale}`} className="inline-flex items-center" aria-label="SPHINX Home">
            <Image
                src="/brand/sphinx-logo.svg"
                alt="SPHINX Logo"
                width={width}
                height={height}
                priority
            />
        </Link>
    );
}
