import { attrDef, attrsOf } from '../../domain/attrs';
import { bulkHint, bulkValues, current, useStore } from '../../state/store';
import { Chip, Modal, ModalFoot, ModalHead, NumberField, RadioRow } from '../primitives';

/** 자주 쓰는 값 몇 개를 눌러 넣을 수 있게 — 그래도 값 자체는 목록이 아니라 숫자입니다. */
const QUICK: Record<string, number[]> = {
  capacity_base: [2, 4, 6, 8],
  capacity_max: [4, 6, 8, 10],
  extra_fee: [0, 20000, 30000, 50000],
};

export const BulkEditModal = () => {
  const { state, dispatch } = useStore();
  const p = current(state);
  if (!state.bulk) return null;
  const bulk = state.bulk;
  const def = attrDef(bulk.attr);

  return (
    <Modal width={520} onClose={() => dispatch({ type: 'CLOSE_BULK' })}>
      <ModalHead title={`객실 ${state.sel.length}개 한꺼번에 바꾸기`} sub="고른 객실에만 적용됩니다. 무엇을 바꿀지 고르세요." />

      <div style={{ padding: '16px 18px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-neutral-700)', marginBottom: 7 }}>무엇을 바꿀까요</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 15 }}>
          {attrsOf(p).map((d) => (
            <Chip
              key={d.key}
              label={d.label}
              tone="ink"
              padding="7px 11px"
              on={bulk.attr === d.key}
              onClick={() => dispatch({ type: 'PICK_BULK_ATTR', attr: d.key })}
            />
          ))}
        </div>

        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-neutral-700)', marginBottom: 7 }}>
          {def?.kind === 'option' ? '어떤 값으로' : '숫자를 넣으세요'}
        </div>

        {def && def.kind !== 'option' ? (
          <>
            <NumberField
              value={Number(bulk.value) || 0}
              unit={def.kind === 'int' ? def.unit : '원'}
              min={def.kind === 'int' ? def.min : 0}
              max={def.kind === 'int' ? def.max : undefined}
              step={def.kind === 'money' ? 5000 : 1}
              quick={QUICK[def.key]}
              onChange={(n) => dispatch({ type: 'PICK_BULK_VALUE', value: n })}
            />
            {def.hint ? (
              <div style={{ marginTop: 8, fontSize: 11, color: 'var(--color-neutral-500)' }}>{def.hint}</div>
            ) : null}
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {bulkValues(p, bulk.attr).map((o) => (
              <RadioRow
                key={String(o.value)}
                label={o.note ? `${o.label} · ${o.note}` : o.label}
                on={bulk.value === o.value}
                onClick={() => dispatch({ type: 'PICK_BULK_VALUE', value: o.value })}
              />
            ))}
          </div>
        )}
      </div>

      <ModalFoot hint={bulkHint(p, bulk.attr, bulk.value)}>
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
