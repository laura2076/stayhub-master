import { attrsOf, feeOf } from '../../domain/attrs';
import { current, useStore } from '../../state/store';
import { Chip, Modal, ModalFoot, ModalHead, NumberField, RadioRow } from '../primitives';

const label = { fontSize: 11, fontWeight: 700, color: 'var(--color-neutral-700)', marginBottom: 7 } as const;

export const NewRoomModal = () => {
  const { state, dispatch } = useStore();
  const p = current(state);
  if (!state.nr) return null;
  const nr = state.nr;

  /** 층은 이 숙소에 이미 있는 층에서 고릅니다 — 3~7층이 있는 곳도, 1층뿐인 곳도 있습니다. */
  const floors = [...new Set(p.rooms.map((r) => r.floor))].sort((a, b) => a - b);

  return (
    <Modal width={520} panelStyle={{ maxHeight: 'calc(100vh - 60px)', display: 'flex', flexDirection: 'column' }} onClose={() => dispatch({ type: 'CLOSE_NEW_ROOM' })}>
      <ModalHead title="객실 만들기" sub="건드리지 않은 항목은 숙소 전체값을 그대로 씁니다." />

      <div style={{ padding: '16px 18px', overflowY: 'auto', minHeight: 0 }}>
        <div className="field" style={{ marginBottom: 14 }}>
          <label>객실명</label>
          <input
            className="input"
            value={nr.name}
            onChange={(e) => dispatch({ type: 'SET_NR_NAME', v: e.target.value })}
            placeholder="예: A801"
            style={{ minHeight: 32, fontSize: 13 }}
          />
        </div>

        <div style={label}>층</div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
          {floors.map((f) => (
            <Chip
              key={f}
              label={`${f}층`}
              padding="7px 13px"
              on={nr.floor === String(f)}
              onClick={() => dispatch({ type: 'SET_NR_FLOOR', v: String(f) })}
            />
          ))}
        </div>

        {attrsOf(p).map((d) => {
          const v = d.key in nr.values ? nr.values[d.key] : p.defaults[d.key];
          const same = v === p.defaults[d.key];
          return (
            <div key={d.key} style={{ marginBottom: 16 }}>
              <div style={{ ...label, display: 'flex', alignItems: 'baseline', gap: 6 }}>
                {d.label}
                {same ? <span style={{ fontWeight: 400, color: 'var(--color-neutral-500)' }}>전체값 그대로</span> : null}
              </div>

              {d.kind === 'option' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {d.options.map((o) => {
                    const fee = d.feeBearing ? feeOf(p, d.key, o.code) : '—';
                    return (
                      <RadioRow
                        key={o.code}
                        label={fee !== '—' ? `${o.label} · ${fee}` : o.label}
                        padding="9px 12px"
                        on={v === o.code}
                        onClick={() => dispatch({ type: 'SET_NR_VALUE', attr: d.key, v: o.code })}
                      />
                    );
                  })}
                </div>
              ) : (
                <NumberField
                  value={Number(v) || 0}
                  unit={d.kind === 'int' ? d.unit : '원'}
                  min={d.kind === 'int' ? d.min : 0}
                  max={d.kind === 'int' ? d.max : undefined}
                  step={d.kind === 'money' ? 5000 : 1}
                  onChange={(n) => dispatch({ type: 'SET_NR_VALUE', attr: d.key, v: n })}
                />
              )}
            </div>
          );
        })}
      </div>

      <ModalFoot hint="만들면 시설 안내문과 객실 수, 판매 사이트 상품도 같이 생깁니다.">
        <button className="btn btn-secondary" onClick={() => dispatch({ type: 'CLOSE_NEW_ROOM' })} style={{ height: 32 }}>
          그만두기
        </button>
        <button className="btn btn-primary" onClick={() => dispatch({ type: 'PREVIEW_NEW_ROOM' })} style={{ height: 32 }}>
          만들기
        </button>
      </ModalFoot>
    </Modal>
  );
};
