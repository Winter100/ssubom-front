import { useRef, useState, type SubmitEvent, type SyntheticEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { authKeys } from '@/_features/auth/constant/auth.keys';
import { getReportSessionSignal } from '@/_features/auth/lib/session';
import { adminReviewKey, reviewKeys } from '@/_features/review/constant/review.keys';
import { ApiError } from '@/_lib/api/api';
import type { User } from '@/_types/auth';
import type { CategoryType } from '@/_types/review';
import { adminCategoriesKey, changeAdminCategories, getAdminCategories, type CategoryAction } from '../admin-category-api';
import { getAdminErrorMessage, moveOrderedItem } from '../admin-list-utils';


export const useAdminCategories = (memberId: number) => {
  const client = useQueryClient();
  const key = adminCategoriesKey(memberId);
  const [draft, setDraft] = useState<CategoryType[]>();
  const [editing, setEditing] = useState<CategoryType>();
  const [name, setName] = useState('');
  const [target, setTarget] = useState<CategoryType>();
  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const saving = useRef(false);
  const categories = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => getAdminCategories(signal),
    retry: false,
    refetchOnWindowFocus: draft === undefined,
    refetchOnReconnect: draft === undefined,
  });
  const rows = draft ?? categories.data ?? [];
  const canEdit = categories.isSuccess && !draft && !working;

  const resetForm = () => {
    setEditing(undefined);
    setName('');
    setFormError('');
  };

  const apply = async (action: CategoryAction) => {
    if (saving.current || !categories.isSuccess) return;
    saving.current = true;
    setWorking(true);
    setError('');
    setFormError('');
    setDeleteError('');
    setNotice('');
    const signal = getReportSessionSignal();
    try {
      const user = client.getQueryData<User | null>(authKeys.me());
      if (user?.id !== memberId || user.role !== 'ADMIN') throw new Error('관리자 권한이 필요합니다.');
      const ordered = await changeAdminCategories(action, signal);
      if (signal.aborted) return;
      if (ordered) {
        await client.cancelQueries({ queryKey: key, exact: true });
        if (signal.aborted) return;
        client.setQueryData(key, ordered);
        setDraft(undefined);
      }
      if (action.type === 'create' || action.type === 'rename') resetForm();
      if (action.type === 'delete') {
        dialog.current?.close();
        if (editing?.id === action.id) resetForm();
      }
      setNotice(action.type === 'reorder' ? '표시 순서를 저장했습니다.' : '카테고리 변경을 반영했습니다.');
      const publicKey = action.type === 'rename' ? reviewKeys.all : reviewKeys.categories();
      await Promise.all([
        ordered ? Promise.resolve() : client.invalidateQueries({ queryKey: key, exact: true }),
        client.invalidateQueries({ queryKey: publicKey }),
        action.type === 'rename' || action.type === 'delete'
          ? client.invalidateQueries({ queryKey: adminReviewKey, predicate: ({ queryKey }) => queryKey[2] === 'reviews' })
          : Promise.resolve(),
        action.type === 'rename' ? Promise.resolve() : client.invalidateQueries({ queryKey: reviewKeys.memberReviewCounts() }),
      ]);
    } catch (cause: unknown) {
      if (signal.aborted) return;
      const status = cause instanceof ApiError ? cause.status : null;
      const message = getAdminErrorMessage(cause, '카테고리 변경에 실패했습니다.');
      if (action.type === 'reorder') {
        if (status === 409) {
          setDraft(undefined);
          setError('카테고리 목록이 변경되었습니다. 최신 목록에서 순서를 다시 지정해 주세요.');
          await categories.refetch();
        } else {
          setError(message);
        }
      } else if (status === 404 && action.type !== 'create') {
        dialog.current?.close();
        if (editing?.id === action.id) resetForm();
        setError(message);
        await categories.refetch();
      } else if (action.type === 'delete') {
        setDeleteError(message);
      } else {
        setFormError(message);
      }
    } finally {
      saving.current = false;
      setWorking(false);
    }
  };

  const move = (id: number, to: number) => {
    if (saving.current) return;
    const next = moveOrderedItem(rows, rows.findIndex((row) => row.id === id), to);
    if (next === rows) return;
    setError('');
    const original = categories.data;
    const unchanged = original?.length === next.length && next.every((row, index) => row.id === original[index].id);
    setDraft(unchanged ? undefined : next);
    setNotice(unchanged ? '저장된 순서로 돌아왔습니다.' : `${next[to].category}, ${to + 1}번째로 이동했습니다.`);
  };

  const submitName = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canEdit) return;
    const category = name.trim();
    if (!category || category.length > 255) {
      setFormError('카테고리 이름은 1~255자로 입력해 주세요.');
      return;
    }
    void apply(editing ? { type: 'rename', id: editing.id, category } : { type: 'create', category });
  };

  const startEdit = (row: CategoryType) => {
    setEditing(row);
    setName(row.category);
    setFormError('');
    nameInput.current?.focus();
  };

  const askToDelete = (row: CategoryType) => {
    setTarget(row);
    setDeleteError('');
    dialog.current?.showModal();
  };

  const cancelOrder = () => {
    setDraft(undefined);
    setError('');
    setNotice('순서 변경을 취소했습니다.');
  };

  const saveOrder = () => void apply({ type: 'reorder', categoryIds: rows.map(({ id }) => id) });
  const confirmDelete = () => {
    if (target) void apply({ type: 'delete', id: target.id });
  };

  const preventDeleteDismiss = (event: SyntheticEvent<HTMLDialogElement>) => {
    if (saving.current) event.preventDefault();
  };

  const cancelDelete = () => {
    dialog.current?.close();
  };

  return {
    categories,
    rows,
    hasOrderChanges: Boolean(draft),
    isEditing: Boolean(editing),
    name,
    setName,
    target,
    working,
    canEdit,
    notice,
    error,
    formError,
    deleteError,
    dialog,
    nameInput,
    startEdit,
    askToDelete,
    cancelOrder,
    saveOrder,
    confirmDelete,
    preventDeleteDismiss,
    cancelDelete,
    move,
    submitName,
    resetForm,
  };
};
