'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';
import { useMe } from '@/_features/auth/hooks/use-auth';
import { authKeys } from '@/_features/auth/constant/auth.keys';
import { clearSession } from '@/_features/auth/lib/session';
import { api, ApiError } from '@/_lib/api/api';
import { apiPath } from '@/_constant/api-path';

export type WithdrawalStatus = {
  requestedAt: string | null;
  scheduledAt: string | null;
};

type WithdrawalAction =
  | { type: 'request'; password: string }
  | { type: 'cancel' };

const subscribe = (): (() => void) => () => {};
const getClientSnapshot = (): boolean => true;
const getServerSnapshot = (): boolean => false;

export const WITHDRAWAL_RESTRICTION =
  '탈퇴 예약 중에는 변경을 할 수 없습니다. 마이페이지에서 탈퇴 예약을 취소해 주세요.';

export const getWithdrawal = async (
  signal?: AbortSignal,
): Promise<WithdrawalStatus> =>
  (await api.get<WithdrawalStatus>(apiPath.withdrawal, { signal })).data;

export const useWithdrawal = () => {
  const hydrated = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot,
  );
  const { data: user, isPending: checkingUser } = useMe();
  const queryClient = useQueryClient();
  const status = useQuery({
    queryKey: authKeys.withdrawal(user?.id ?? 0),
    enabled: Boolean(user),
    queryFn: async ({ signal }) => {
      try {
        return await getWithdrawal(signal);
      } catch (error: unknown) {
        if (error instanceof ApiError && error.status === 404) {
          clearSession(queryClient);
        }
        throw error;
      }
    },
    staleTime: 0,
    retry: false,
    refetchOnWindowFocus: 'always',
  });
  return {
    ...status,
    data: hydrated ? status.data : undefined,
    isPending: !hydrated || checkingUser || Boolean(user && status.isPending),
    isError: hydrated && status.isError,
    assertAllowed: async (): Promise<void> => {
      const result = await status.refetch();
      if (result.error) throw result.error;
      if (!result.data || result.data.scheduledAt) {
        throw new Error(WITHDRAWAL_RESTRICTION);
      }
    },
    blocked:
      !hydrated ||
      checkingUser ||
      Boolean(
        user &&
        (status.isPending || status.isError || status.data?.scheduledAt),
      ),
  };
};

export const useWithdrawalAction = (memberId: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: WithdrawalAction): Promise<WithdrawalStatus> => {
      if (
        queryClient.getQueryData<{ id: number } | null>(authKeys.me())?.id !==
        memberId
      ) {
        throw new Error('로그인 정보가 변경되었습니다. 다시 로그인해 주세요.');
      }
      if (input.type === 'request') {
        const response = await api.post<WithdrawalStatus>(apiPath.withdrawal, {
          password: input.password,
        });
        return response.data;
      }
      await api.delete<void>(apiPath.withdrawal);
      return { requestedAt: null, scheduledAt: null };
    },
    onSuccess: async (data) => {
      if (
        queryClient.getQueryData<{ id: number } | null>(authKeys.me())?.id !==
        memberId
      )
        return;
      await queryClient.cancelQueries({
        queryKey: authKeys.withdrawal(memberId),
      });
      if (
        queryClient.getQueryData<{ id: number } | null>(authKeys.me())?.id !==
        memberId
      )
        return;
      queryClient.setQueryData(authKeys.withdrawal(memberId), data);
      void queryClient.invalidateQueries({
        queryKey: authKeys.withdrawal(memberId),
      });
    },
    retry: false,
    gcTime: 0,
  });
};
