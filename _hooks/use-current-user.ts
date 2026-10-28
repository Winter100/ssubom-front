'use client';
import { useQuery } from '@tanstack/react-query';
import {
  currentUserKey,
  useAuth,
} from '../_features/login/components/auth-provider';

export const useCurrentUser = () => {
  const { client, status } = useAuth();
  return useQuery({
    queryKey: currentUserKey,
    queryFn: () => client.currentUser(),
    enabled: status === 'authenticated',
    refetchOnMount: 'always',
    retry: false,
  });
};
