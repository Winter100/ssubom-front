'use client';

import {
  isServer,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { AuthSession } from '../_features/auth/components/auth-session';

const createQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      // queries: { staleTime: 60 * 1000 },
    },
  });

let browserQueryClient: QueryClient | undefined;

const getQueryClient = (): QueryClient => {
  if (isServer) return createQueryClient();
  browserQueryClient ??= createQueryClient();
  return browserQueryClient;
};

const Providers = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={getQueryClient()}>
    <AuthSession />
    {children}
  </QueryClientProvider>
);

export default Providers;
