import { useRef, useState, type SubmitEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { authKeys } from '@/_features/auth/constant/auth.keys';
import { getReportSessionSignal } from '@/_features/auth/lib/session';
import { reportTypeKey } from '@/_features/review/constant/review.keys';
import { ApiError } from '@/_lib/api/api';
import type { User } from '@/_types/auth';
import {
  adminReportsKey,
  adminReviewApi,
  adminTypesKey,
  type AdminReportType,
} from '../admin-review-api';
import { getAdminErrorMessage, moveOrderedItem } from '../admin-list-utils';


export const useAdminReportTypes = (memberId: number) => {
  const client = useQueryClient();
  const key = adminTypesKey(memberId);
  const [draft, setDraft] = useState<AdminReportType[]>();
  const [editing, setEditing] = useState<AdminReportType>();
  const [name, setName] = useState('');
  const [active, setActive] = useState(true);
  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState('');
  const [orderError, setOrderError] = useState('');
  const [formError, setFormError] = useState('');
  const saving = useRef(false);
  const nameInput = useRef<HTMLInputElement>(null);
  const types = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => adminReviewApi.getTypes(signal),
    retry: false,
    refetchOnWindowFocus: draft === undefined,
    refetchOnReconnect: draft === undefined,
  });
  const rows = draft ?? types.data ?? [];
  const canEdit = types.isSuccess && !draft && !working;

  const resetForm = () => {
    setName('');
    setEditing(undefined);
    setActive(true);
    setFormError('');
  };

  const move = (id: number, to: number) => {
    if (saving.current) return;
    const next = moveOrderedItem(
      rows,
      rows.findIndex((row) => row.id === id),
      to,
    );
    if (next === rows) return;
    const original = types.data;
    const unchanged =
      original?.length === next.length &&
      next.every((row, index) => row.id === original[index].id);
    setDraft(unchanged ? undefined : next);
    setOrderError('');
    setNotice(
      unchanged
        ? '저장된 순서로 돌아왔습니다.'
        : next[to].name + ', ' + (to + 1) + '번째로 이동했습니다.',
    );
  };

  const assertAdmin = () => {
    const user = client.getQueryData<User | null>(authKeys.me());
    if (user?.id !== memberId || user.role !== 'ADMIN')
      throw new Error('관리자 권한이 필요합니다.');
  };

  const saveOrder = async () => {
    if (!draft || saving.current) return;
    saving.current = true;
    setWorking(true);
    setOrderError('');
    setNotice('');
    const signal = getReportSessionSignal();
    try {
      assertAdmin();
      const ordered = await adminReviewApi.reorderTypes(
        draft.map(({ id }) => id),
        signal,
      );
      if (signal.aborted) return;
      await client.cancelQueries({ queryKey: key, exact: true });
      if (signal.aborted) return;
      client.setQueryData(key, ordered);
      setDraft(undefined);
      setNotice('표시 순서를 저장했습니다.');
      await client.invalidateQueries({ queryKey: reportTypeKey });
    } catch (cause: unknown) {
      if (signal.aborted) return;
      if (cause instanceof ApiError && cause.status === 409) {
        setDraft(undefined);
        setOrderError(
          '신고 사유 목록이 변경되었습니다. 최신 목록에서 순서를 다시 지정해 주세요.',
        );
        await types.refetch();
      } else {
        setOrderError(
          getAdminErrorMessage(cause, '순서를 저장하지 못했습니다.'),
        );
      }
    } finally {
      saving.current = false;
      setWorking(false);
    }
  };

  const submit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canEdit || saving.current) return;
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > 100) {
      setFormError('사유 이름은 1~100자로 입력해 주세요.');
      return;
    }
    saving.current = true;
    setWorking(true);
    setFormError('');
    setNotice('');
    const signal = getReportSessionSignal();
    try {
      assertAdmin();
      if (editing) {
        await adminReviewApi.updateType(
          { id: editing.id, name: trimmed, active },
          signal,
        );
      } else {
        await adminReviewApi.createType(
          { name: trimmed, displayOrder: 2_147_483_647 },
          signal,
        );
      }
      if (signal.aborted) return;
      resetForm();
      setNotice('신고 사유를 저장했습니다.');
      await Promise.all([
        client.invalidateQueries({ queryKey: key, exact: true }),
        client.invalidateQueries({ queryKey: adminReportsKey(memberId) }),
        client.invalidateQueries({ queryKey: reportTypeKey }),
      ]);
    } catch (cause: unknown) {
      if (!signal.aborted)
        setFormError(
          getAdminErrorMessage(cause, '신고 사유를 저장하지 못했습니다.'),
        );
    } finally {
      saving.current = false;
      setWorking(false);
    }
  };

  const startEdit = (row: AdminReportType) => {
    setEditing(row);
    setName(row.name);
    setActive(row.active);
    setFormError('');
    nameInput.current?.focus();
  };

  const cancelOrder = () => {
    setDraft(undefined);
    setOrderError('');
    setNotice('순서 변경을 취소했습니다.');
  };

  return {
    types,
    rows,
    hasOrderChanges: Boolean(draft),
    isEditing: Boolean(editing),
    name,
    setName,
    active,
    setActive,
    working,
    canEdit,
    notice,
    orderError,
    formError,
    nameInput,
    startEdit,
    cancelOrder,
    saveOrder,
    move,
    submit,
    resetForm,
  };
};
