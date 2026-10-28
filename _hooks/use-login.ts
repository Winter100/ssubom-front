'use client';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '../_features/login/components/auth-provider';
import type { LoginInput } from '../_types/auth';

export const useLogin = () => {
  const { client, completeLogin } = useAuth();
  return useMutation({
    mutationFn: (input: LoginInput) => client.login(input),
    onSuccess: ({ member }) => completeLogin(member),
    retry: false,
    gcTime: 0,
  });
};
