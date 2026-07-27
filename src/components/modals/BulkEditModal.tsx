import { FIELDS } from '../../domain/catalog';
import { bulkHint, bulkValueList, useStore } from '../../state/store';
import { Chip, Modal, ModalFoot, ModalHead, RadioRow } from '../primitives';

export const BulkEditModal = () => {
  const { state, dispatch } = useStore();
  if (!state.bulk) return null;
  const bulk = state.bulk;

  return (
    <Modal width={520} zIndex={40}>
      <ModalHead
        title={`일괄 편집 · ${state.sel.length}객실`}
        sub="선택한 객실에만 값을 씁니다. 저장 전에 연쇄 갱신 대상을 확인합니다."
      />

      <div style={{ padding: '16px 18px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-neutral-700)', marginBottom: 7 }}>필드</div>
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

        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-neutral-700)', marginBottom: 7 }}>값</div>
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
          취소
        </button>
        <button className="btn btn-primary" onClick={() => dispatch({ type: 'PREVIEW_BULK' })} style={{ height: 32 }}>
          연쇄 갱신 미리보기
        </button>
      </ModalFoot>
    </Modal>
  );
};
