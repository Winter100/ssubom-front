import { useRef, useState, type ReactNode } from 'react';
import { actionClass, emptyClass, primaryActionClass } from './admin-list-state';

export const orderLayout = 'grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(15rem,20rem)]';
export const orderForm = 'min-w-0 self-start space-y-4 rounded-2xl border border-[#dfe8df] bg-[#f3f6ef] p-4 sm:p-5';

type Item = { id: number; label: string; active?: boolean; actions: ReactNode };

const AdminOrderList = ({ label: tableLabel, items, dirty, busy, empty, onMove, onCancel, onSave }: {
  label: string;
  items: Item[];
  dirty: boolean;
  busy: boolean;
  empty: string;
  onMove: (id: number, to: number) => void;
  onCancel: () => void;
  onSave: () => void;
}) => {
  const dragged = useRef<number>(undefined);
  const [over, setOver] = useState<number>();
  const clearDrag = () => {
    dragged.current = undefined;
    setOver(undefined);
  };
  const canDrag = !busy && items.length > 1;
  const showStatus = items.some(({ active }) => active !== undefined);

  return (
    <>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <h2 className='font-semibold'>표시 순서</h2>
        <div className='flex flex-wrap gap-2'>
          <button type='button' className={actionClass} disabled={!dirty || busy} onClick={onCancel}>변경 취소</button>
          <button type='button' className={primaryActionClass} disabled={!dirty || busy} onClick={onSave}>순서 저장</button>
        </div>
      </div>
      {dirty && <p className='text-sm text-stone-600'>순서를 저장하거나 취소한 뒤 항목을 편집할 수 있습니다.</p>}
      {items.length === 0 ? <p className={emptyClass}>{empty}</p> : (
        <div role='region' aria-label={tableLabel + ' 표 영역'} tabIndex={0}
          className='overflow-x-auto rounded-2xl border border-[#dfe8df] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#23745b]'>
          <table aria-label={tableLabel} aria-busy={busy} className='w-full min-w-[26rem] table-fixed text-left text-sm'>
            <thead className='border-b border-[#dfe8df] bg-[#edf3ec] text-xs text-[#405b49] [&_th]:px-3 [&_th]:py-3 [&_th]:font-semibold'>
              <tr>
                <th scope='col' className='w-18'>순서</th>
                <th scope='col'>이름</th>
                {showStatus && <th scope='col' className='w-19'>상태</th>}
                <th scope='col' className={showStatus ? 'w-42' : 'w-56'}>관리</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-stone-100 [&_td]:px-3 [&_td]:py-2.5 [&_th]:px-3 [&_th]:py-2.5'>
              {items.map(({ id, label, active, actions }, index) => (
                <tr
                  key={id}
                  className={over === id ? 'bg-[#dfe8df]' : 'odd:bg-white even:bg-[#fafbf9] hover:bg-[#f3f6ef] focus-within:bg-[#f3f6ef]'}
                  onDragOver={(event) => {
                    if (dragged.current === undefined || busy) return;
                    event.preventDefault();
                    event.dataTransfer.dropEffect = 'move';
                    setOver(id);
                  }}
                  onDrop={(event) => {
                    if (dragged.current === undefined || busy) return;
                    event.preventDefault();
                    onMove(dragged.current, index);
                    clearDrag();
                  }}
                >
                  <td>
                    <div className='flex items-center gap-1 text-xs tabular-nums text-stone-600'>
                      <span
                        aria-hidden='true'
                        className='hidden select-none px-1 text-stone-500 [@media(pointer:fine)]:inline-block data-[enabled=true]:cursor-grab'
                        data-enabled={canDrag}
                        draggable={canDrag}
                        onDragStart={(event) => {
                          dragged.current = id;
                          event.dataTransfer.effectAllowed = 'move';
                          event.dataTransfer.setData('text/plain', String(id));
                        }}
                        onDragEnd={clearDrag}
                      >⠿</span>
                      <span>{index + 1}</span>
                    </div>
                  </td>
                  <th scope='row' className='text-left font-medium wrap-anywhere'>{label}</th>
                  {showStatus && (
                    <td>
                      <span className={`inline-block rounded-full px-2 py-1 text-xs whitespace-nowrap ${active ? 'bg-[#edf3ec] text-[#405b49]' : 'bg-stone-100 text-stone-600'}`}>
                        {active ? '활성' : '비활성'}
                      </span>
                    </td>
                  )}
                  <td>
                    <div className='flex flex-wrap gap-1.5'>
                      <button type='button' className={moveActionClass} aria-label={`${label} 위로 이동`} disabled={busy || index === 0} onClick={() => onMove(id, index - 1)}>↑</button>
                      <button type='button' className={moveActionClass} aria-label={`${label} 아래로 이동`} disabled={busy || index === items.length - 1} onClick={() => onMove(id, index + 1)}>↓</button>
                      {actions}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
};

const moveActionClass = 'grid size-9 cursor-pointer place-items-center rounded-lg border border-stone-200 bg-white text-sm font-medium hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#23745b] disabled:cursor-not-allowed disabled:opacity-50';

export default AdminOrderList;
