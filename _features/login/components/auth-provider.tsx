'use client';

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createAuthClient,
  getAuthErrorMessage,
  isUnauthorized,
  type AuthClient,
} from '../../../_lib/auth-client';
import type { AuthStatus, User } from '../../../_types/auth';
import { apiPath } from '../../../_constant/api-path';
import { api } from '@/_lib/api/api';

export const currentUserKey = ['auth', 'currentUser'] as const;
type AuthContextValue = {
  client: AuthClient;
  user: User | null;
  status: AuthStatus;
  error: string;
  completeLogin: (user: User) => void;
};
const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [error, setError] = useState('');
  const [client] = useState(() =>
    createAuthClient(api, apiPath, () => {
      setStatus('anonymous');
      queryClient.removeQueries({ queryKey: ['auth'] });
    }),
  );
  // 사용자 정보를 같은 캐시에서 읽어 헤더와 마이페이지가 함께 갱신됩니다.
  const { data: user } = useQuery({
    queryKey: currentUserKey,
    queryFn: () => client.currentUser(),
    enabled: false,
    retry: false,
  });
  const loginRevision = useRef(0);

  useEffect(() => {
    let active = true;
    const revision = loginRevision.current;
    const restore = async (): Promise<void> => {
      try {
        await client.refresh();
        const restoredUser = await client.currentUser();
        if (!active || revision !== loginRevision.current) return;
        queryClient.setQueryData(currentUserKey, restoredUser);
        setStatus('authenticated');
      } catch (cause: unknown) {
        if (!active || revision !== loginRevision.current) return;
        setStatus(isUnauthorized(cause) ? 'anonymous' : 'error');
        if (!isUnauthorized(cause))
          setError(
            getAuthErrorMessage(
              cause,
              '로그인 상태를 확인하지 못했습니다. 다시 로그인해 주세요.',
            ),
          );
      }
    };
    void restore();
    return () => {
      active = false;
    };
  }, [client, queryClient]);

  const completeLogin = (nextUser: User): void => {
    loginRevision.current++;
    setStatus('authenticated');
    setError('');
    queryClient.setQueryData(currentUserKey, nextUser);
  };

  return (
    <AuthContext.Provider
      value={{
        client,
        user: status === 'authenticated' ? (user ?? null) : null,
        status,
        error,
        completeLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('AuthProvider 안에서 사용해 주세요.');
  return context;
};
