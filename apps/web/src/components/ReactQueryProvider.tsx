'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';
import { isAuthError } from '@/lib/api/axios';

export default function ReactQueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        retry: (failureCount, error) => {
          if (isAuthError(error)) {
            return false;
          }
          return failureCount < 1;
        },
      },
    },
  }));
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
