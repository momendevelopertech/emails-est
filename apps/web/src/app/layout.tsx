import { ReactNode } from 'react';

export const metadata = {
    manifest: '/manifest.json',
    themeColor: '#1f3a52',
};

export default function RootLayout({ children }: { children: ReactNode }) {
    return children;
}
