import AdminOrderList, { orderForm, orderLayout } from './admin-order-list';
import { actionClass, AdminListState, inputClass, primaryActionClass } from './admin-list-state';
import { useAdminReportTypes } from './hooks/use-admin-report-types';

const AdminReportTypes = ({ memberId }: { memberId: number }) => {
  const {
    types,
    rows,
    hasOrderChanges,
    isEditing,
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
  } = useAdminReportTypes(memberId);

  return (
    <section aria-label='신고 사유 관리' className={orderLayout}>
      <div className='min-w-0 space-y-3'>
        <AdminListState
          error={types.error}
          pending={types.isPending}
          onRetry={() => void types.refetch()}
        />
        {notice && (
          <p role='status' className='text-sm wrap-anywhere text-stone-600'>
            {notice}
          </p>
        )}
        {orderError && (
          <p role='alert' className='text-sm text-rose-700'>
            {orderError}
          </p>
        )}
        {types.isSuccess && (
          <AdminOrderList
            label='신고 사유 목록'
            items={rows.map((row) => ({
              id: row.id,
              label: row.name,
              active: row.active,
              actions: (
                <button
                  type='button'
                  className={actionClass}
                  aria-label={row.name + ' 수정'}
                  disabled={!canEdit}
                  onClick={() => startEdit(row)}
                >
                  수정
                </button>
              ),
            }))}
            dirty={hasOrderChanges}
            busy={working}
            empty='등록된 신고 사유가 없습니다.'
            onMove={move}
            onCancel={cancelOrder}
            onSave={() => void saveOrder()}
          />
        )}
      </div>
      {types.isSuccess && (
        <form className={orderForm} onSubmit={submit}>
          <h2 className='font-semibold'>
            {isEditing ? '신고 사유 수정' : '신고 사유 추가'}
          </h2>
          <label className='grid gap-1 text-sm'>
            이름
            <input
              ref={nameInput}
              name='name'
              value={name}
              className={inputClass}
              disabled={!canEdit}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </label>
          {isEditing && (
            <label className='flex items-center gap-2 text-sm'>
              <input
                name='active'
                type='checkbox'
                checked={active}
                disabled={!canEdit}
                onChange={(event) => setActive(event.target.checked)}
              />
              활성 상태
            </label>
          )}
          {formError && (
            <p role='alert' className='text-sm text-rose-700'>
              {formError}
            </p>
          )}
          <div className='flex justify-end gap-2'>
            {isEditing && (
              <button
                type='button'
                className={actionClass}
                disabled={working}
                onClick={resetForm}
              >
                취소
              </button>
            )}
            <button className={primaryActionClass} disabled={!canEdit}>
              저장
            </button>
          </div>
        </form>
      )}
    </section>
  );
};

export default AdminReportTypes;
