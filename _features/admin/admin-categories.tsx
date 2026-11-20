import AdminOrderList, { orderForm, orderLayout } from './admin-order-list';
import { actionClass, AdminListState, inputClass, primaryActionClass } from './admin-list-state';
import { useAdminCategories } from './hooks/use-admin-categories';

const AdminCategories = ({ memberId }: { memberId: number }) => {
  const {
    categories,
    rows,
    hasOrderChanges,
    isEditing,
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
  } = useAdminCategories(memberId);

  return (
    <section aria-label='카테고리 관리' className={orderLayout}>
      <div className='min-w-0 space-y-3'>
        <AdminListState error={categories.error} pending={categories.isPending} onRetry={() => void categories.refetch()} />
        {notice && <p role='status' className='text-sm wrap-anywhere text-stone-600'>{notice}</p>}
        {error && <p role='alert' className='text-sm text-rose-700'>{error}</p>}
        {categories.isSuccess && (
          <AdminOrderList
            label='카테고리 목록'
            items={rows.map((row) => ({
              id: row.id,
              label: row.category,
              actions: (
                <>
                  <button type='button' className={actionClass} aria-label={row.category + ' 수정'} disabled={!canEdit} onClick={() => startEdit(row)}>수정</button>
                  <button type='button' className={actionClass + ' text-rose-700'} aria-label={row.category + ' 삭제'} aria-haspopup='dialog' disabled={!canEdit} onClick={() => askToDelete(row)}>삭제</button>
                </>
              ),
            }))}
            dirty={hasOrderChanges}
            busy={working}
            empty='등록된 카테고리가 없습니다.'
            onMove={move}
            onCancel={cancelOrder}
            onSave={saveOrder}
          />
        )}
      </div>
      {categories.isSuccess && (
        <form className={orderForm} onSubmit={submitName}>
          <h2 className='font-semibold'>{isEditing ? '카테고리 이름 수정' : '카테고리 추가'}</h2>
          <label className='grid gap-1 text-sm'>
            카테고리 이름
            <input ref={nameInput} className={inputClass} value={name} onChange={(event) => setName(event.target.value)} disabled={!canEdit} required />
          </label>
          {formError && <p role='alert' className='text-sm text-rose-700'>{formError}</p>}
          <div className='flex justify-end gap-2'>
            {isEditing && <button type='button' className={actionClass} disabled={working} onClick={resetForm}>취소</button>}
            <button className={primaryActionClass} disabled={!canEdit}>저장</button>
          </div>
        </form>
      )}
      <dialog
        ref={dialog}
        aria-labelledby='admin-category-delete-title'
        className='m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-3xl border border-stone-200 bg-white p-6 text-sm text-stone-800 shadow-xl backdrop:bg-stone-900/40'
        onCancel={preventDeleteDismiss}
      >
        <h2 id='admin-category-delete-title' className='text-lg font-semibold'>카테고리 삭제</h2>
        <p className='mt-3 wrap-anywhere'>‘{target?.category}’ 카테고리를 삭제하시겠습니까?</p>
        {deleteError && <p role='alert' className='mt-3 text-rose-700'>{deleteError}</p>}
        <div className='mt-5 flex justify-end gap-2'>
          <button type='button' className={actionClass} disabled={working} onClick={cancelDelete}>취소</button>
          <button type='button' className={`${actionClass} text-rose-700`} disabled={!canEdit} onClick={confirmDelete}>삭제 확인</button>
        </div>
      </dialog>
    </section>
  );
};

export default AdminCategories;
