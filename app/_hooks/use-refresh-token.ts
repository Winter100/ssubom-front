'use client';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '../_components/auth-provider';

export const useRefreshToken = () => {
  const { client } = useAuth();
  return useMutation({ mutationFn: () => client.refresh(), retry: false, gcTime: 0 });
};
