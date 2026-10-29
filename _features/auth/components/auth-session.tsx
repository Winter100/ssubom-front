'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { onAuthExpired } from '@/_lib/api/api';
import { clearSession } from '../lib/session';

export const AuthSession = () => {
  const queryClient = useQueryClient();

  useEffect(() => onAuthExpired(() => clearSession(queryClient)), [queryClient]);

  return null;
};
