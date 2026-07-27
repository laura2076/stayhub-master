import { FIELDS } from '../../domain/catalog';
import { bulkHint, bulkValueList, useStore } from '../../state/store';
import { Chip, Modal, ModalFoot, ModalHead, RadioRow } from '../primitives';

export const BulkEditModal = () => {
  const { state, dispatch } = useStore();
  if (!state.bulk) return null;
  const bulk = state.bulk;

  return (
    <Modal width={520} onClose={() => dispatch({ type: 'CLOSE_BULK' })}>
      <ModalHead
        title={`객실 ${state.sel.length}개 한꺼번에 바꾸기`}
        sub="고른 객실에만 적용됩니다. 무엇을 바꿀지 고르세요."
      />

      <div style={{ padding: '16px 18px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-neutral-700)', marginBottom: 7 }}>무엇을 바꿀까요</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 15 }}>
          {FIELDS.map((f) => (
            <Chip
              key={f.id}
              label={f.label}
              tone="ink"
              padding="7px 11px"
              on={bulk.field === f.id}
              onClick={() => dispatch({ type: 'PICK_BULK_FIELD', id: f.id })}
            />
          ))}
        </div>

        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-neutral-700)', marginBottom: 7 }}>어떤 값으로</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {bulkValueList(state).map(([value, label]) => (
            <RadioRow
              key={value}
              label={label}
              on={bulk.value === value}
              onClick={() => dispatch({ type: 'PICK_BULK_VALUE', value })}
            />
          ))}
        </div>
      </div>

      <ModalFoot hint={bulkHint(state)}>
        <button className="btn btn-secondary" onClick={() => dispatch({ type: 'CLOSE_BULK' })} style={{ height: 32 }}>
          그만두기
        </button>
        <button className="btn btn-primary" onClick={() => dispatch({ type: 'PREVIEW_BULK' })} style={{ height: 32 }}>
          바꾸기
        </button>
      </ModalFoot>
    </Modal>
  );
};
