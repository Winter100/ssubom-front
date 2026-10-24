'use client';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '../_components/auth-provider';
import type { SignupInput } from '../_types/auth';

export const useSignup = () => {
  const { client } = useAuth();
  return useMutation({
    mutationFn: (input: SignupInput) => client.signup(input),
    retry: false,
    gcTime: 0,
  });
};
