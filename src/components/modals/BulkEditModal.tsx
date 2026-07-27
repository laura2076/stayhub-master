import { attrDef, attrsOf, showValue, valueOf } from '../../domain/attrs';
import type { AttrDef, AttrValue, Property, Room } from '../../domain/types';
import { bulkValues, current, useStore } from '../../state/store';
import { Chip, Modal, ModalFoot, ModalHead, NumberField, RadioRow } from '../primitives';

/** 자주 쓰는 값 몇 개를 눌러 넣을 수 있게 — 그래도 값 자체는 목록이 아니라 숫자입니다. */
const QUICK: Record<string, number[]> = {
  capacity_base: [2, 4, 6, 8],
  capacity_max: [4, 6, 8, 10],
  extra_fee: [0, 20000, 30000, 50000],
};

const head = { fontSize: 11, fontWeight: 700, color: 'var(--color-neutral-700)', marginBottom: 7 } as const;
const panel = { border: '1px solid var(--color-divider)', background: 'var(--color-bg)', minHeight: 0 } as const;

/** 값 하나를 넣는 칸. 일괄값과 객실별 값이 같은 모양이어야 헷갈리지 않습니다. */
const ValueInput = ({
  p,
  def,
  value,
  compact,
  onChange,
}: {
  p: Property;
  def: AttrDef;
  value: AttrValue;
  compact?: boolean;
  onChange: (v: AttrValue) => void;
}) => {
  if (def.kind !== 'option') {
    return (
      <NumberField
        value={Number(value) || 0}
        unit={def.kind === 'int' ? def.unit : '원'}
        min={def.kind === 'int' ? def.min : 0}
        max={def.kind === 'int' ? def.max : undefined}
        step={def.kind === 'money' ? 5000 : 1}
        quick={compact ? undefined : QUICK[def.key]}
        onChange={onChange}
      />
    );
  }
  if (compact) {
    return (
      <select
        className="input"
        value={String(value)}
        onChange={(e) => onChange(e.target.value)}
        style={{ minHeight: 30, fontSize: 12, width: '100%' }}
      >
        {def.options.map((o) => (
          <option key={o.code} value={o.code}>
            {o.label}
          </option>
        ))}
      </select>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {bulkValues(p, def.key).map((o) => (
        <RadioRow
          key={String(o.value)}
          label={o.note ? `${o.label} · ${o.note}` : o.label}
          on={value === o.value}
          onClick={() => onChange(o.value)}
        />
      ))}
    </div>
  );
};

/** 고르기 → 값 넣기를 한 창에서 끝냅니다.
 *
 *  왼쪽 층 트리에서 고르면 오른쪽에 쌓이고, 아래에서 일괄값을 넣되 객실마다 다르게
 *  덮어쓸 수 있습니다. 표에서 고르고 창을 열고 다시 표로 돌아가는 왕복이 사라집니다. */
export const BulkEditModal = () => {
  const { state, dispatch } = useStore();
  const p = current(state);
  if (!state.bulk) return null;
  const bulk = state.bulk;
  const def = attrDef(bulk.attr);
  const picked: Room[] = p.rooms.filter((r) => bulk.sel.includes(r.code));
  const floors = [...new Set(p.rooms.map((r) => r.floor))].sort((a, b) => a - b);
  const valueFor = (code: string): AttrValue => (code in bulk.per ? bulk.per[code] : bulk.value);
  const perN = Object.keys(bulk.per).filter((c) => bulk.sel.includes(c)).length;

  return (
    <Modal
      width={880}
      panelStyle={{ maxHeight: 'calc(100vh - 48px)', display: 'flex', flexDirection: 'column' }}
      onClose={() => dispatch({ type: 'CLOSE_BULK' })}
    >
      <ModalHead title="객실 값 한꺼번에 바꾸기" sub="바꿀 항목을 고르고, 적용할 객실을 고른 뒤, 값을 넣습니다." />

      <div style={{ padding: '16px 18px', overflowY: 'auto', minHeight: 0 }}>
        <div style={head}>무엇을 바꿀까요</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 18 }}>
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

        {/* ── 적용 객실 선택 : 왼쪽에서 골라 오른쪽으로 보냅니다 ── */}
        <div style={head}>적용 객실 선택</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', ...panel, marginBottom: 18 }}>
          <div style={{ borderRight: '1px solid var(--color-divider)', display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '9px 12px',
                borderBottom: '1px solid var(--color-divider)',
                background: 'var(--color-surface)',
              }}
            >
              <input
                type="checkbox"
                checked={bulk.sel.length === p.rooms.length}
                onChange={() =>
                  bulk.sel.length === p.rooms.length
                    ? dispatch({ type: 'BULK_CLEAR_SEL' })
                    : floors.forEach((f) => dispatch({ type: 'BULK_TOGGLE_FLOOR', floor: f }))
                }
                style={{ cursor: 'pointer' }}
              />
              <span style={{ fontSize: 11.5, fontWeight: 700 }}>객실 전체 선택 (총 {p.rooms.length}개)</span>
            </div>

            <div style={{ maxHeight: 260, overflowY: 'auto' }}>
              {floors.map((f) => {
                const inFloor = p.rooms.filter((r) => r.floor === f);
                const allOn = inFloor.every((r) => bulk.sel.includes(r.code));
                return (
                  <div key={f}>
                    <div
                      onClick={() => dispatch({ type: 'BULK_TOGGLE_FLOOR', floor: f })}
                      className="hov-surface"
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', cursor: 'pointer' }}
                    >
                      <input type="checkbox" checked={allOn} readOnly style={{ cursor: 'pointer' }} />
                      <span style={{ fontSize: 12, fontWeight: 700 }}>
                        {f}층 <span style={{ fontWeight: 400, color: 'var(--color-neutral-500)' }}>{inFloor.length}실</span>
                      </span>
                    </div>
                    {inFloor.map((r) => (
                      <div
                        key={r.code}
                        onClick={() => dispatch({ type: 'BULK_TOGGLE_ROOM', code: r.code })}
                        className="hov-surface"
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 12px 5px 32px', cursor: 'pointer' }}
                      >
                        <input type="checkbox" checked={bulk.sel.includes(r.code)} readOnly style={{ cursor: 'pointer' }} />
                        <span style={{ fontSize: 12 }}>{r.name}</span>
                        {def ? (
                          <span style={{ marginLeft: 'auto', fontSize: 10.5, color: 'var(--color-neutral-500)' }}>
                            {showValue(def.key, valueOf(p, r, def.key))}
                          </span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '9px 12px',
                borderBottom: '1px solid var(--color-divider)',
                background: 'var(--color-surface)',
              }}
            >
              <span style={{ fontSize: 11.5, fontWeight: 700 }}>고른 객실 ({picked.length}개)</span>
              <div style={{ flex: 1 }} />
              <span
                onClick={() => dispatch({ type: 'BULK_CLEAR_SEL' })}
                style={{ fontSize: 11, color: 'var(--color-neutral-600)', textDecoration: 'underline', cursor: 'pointer' }}
              >
                전체 삭제
              </span>
            </div>
            <div style={{ maxHeight: 260, overflowY: 'auto' }}>
              {picked.map((r) => (
                <div
                  key={r.code}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderBottom: '1px solid var(--color-surface)' }}
                >
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 10.5, color: 'var(--color-neutral-500)' }}>{r.floor}층</span>
                    <span style={{ display: 'block', fontSize: 12, fontWeight: 600 }}>{r.name}</span>
                  </span>
                  <div style={{ flex: 1 }} />
                  {def && r.code in bulk.per ? (
                    <span className="tag tag-accent" style={{ fontSize: 10 }}>
                      따로 {showValue(def.key, bulk.per[r.code])}
                    </span>
                  ) : null}
                  <span
                    onClick={() => dispatch({ type: 'BULK_TOGGLE_ROOM', code: r.code })}
                    style={{ cursor: 'pointer', fontSize: 15, color: 'var(--color-neutral-500)', padding: '0 4px' }}
                    title="이 객실 빼기"
                  >
                    ×
                  </span>
                </div>
              ))}
              {picked.length === 0 ? (
                <div style={{ padding: '24px 12px', fontSize: 11.5, color: 'var(--color-neutral-500)' }}>
                  왼쪽에서 객실을 고르세요.
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* ── 값 설정 : 일괄로 넣되 객실마다 덮어쓸 수 있습니다 ── */}
        {def ? (
          <>
            <div style={head}>값 설정</div>
            <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-divider)', padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700 }}>한꺼번에 넣기</div>
                  <div style={{ marginTop: 3, fontSize: 11, color: 'var(--color-neutral-600)' }}>
                    넣은 값이 고른 객실 {picked.length}개에 모두 들어갑니다.
                    {def.hint ? ` ${def.hint}.` : ''}
                  </div>
                </div>
                <div style={{ width: def.kind === 'option' ? 320 : 280, flex: 'none' }}>
                  <ValueInput p={p} def={def} value={bulk.value} onChange={(v) => dispatch({ type: 'PICK_BULK_VALUE', value: v })} />
                </div>
              </div>
            </div>

            <div
              onClick={() => dispatch({ type: 'TOGGLE_BULK_PER_OPEN' })}
              style={{ marginTop: 14, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', gap: 6 }}
            >
              객실별로 다르게 정하기 {bulk.open ? '⌃' : '⌄'}
              {perN ? <span className="tag tag-accent" style={{ fontSize: 10 }}>{perN}개 다름</span> : null}
            </div>

            {bulk.open ? (
              <div style={{ marginTop: 8, ...panel }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 220px 64px',
                    background: 'var(--color-surface)',
                    borderBottom: '1px solid var(--color-divider)',
                    padding: '8px 12px',
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--color-neutral-700)',
                  }}
                >
                  <span>적용 객실</span>
                  <span>{def.label}</span>
                  <span />
                </div>
                <div style={{ maxHeight: 260, overflowY: 'auto' }}>
                  {picked.map((r) => (
                    <div
                      key={r.code}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 220px 64px',
                        alignItems: 'center',
                        gap: 8,
                        padding: '7px 12px',
                        borderBottom: '1px solid var(--color-surface)',
                      }}
                    >
                      <span style={{ minWidth: 0 }}>
                        <span style={{ display: 'block', fontSize: 10.5, color: 'var(--color-neutral-500)' }}>
                          {r.floor}층 · 지금 {showValue(def.key, valueOf(p, r, def.key))}
                        </span>
                        <span style={{ display: 'block', fontSize: 12, fontWeight: 600 }}>{r.name}</span>
                      </span>
                      <ValueInput
                        p={p}
                        def={def}
                        compact
                        value={valueFor(r.code)}
                        onChange={(v) => dispatch({ type: 'SET_BULK_PER', code: r.code, value: v })}
                      />
                      {r.code in bulk.per ? (
                        <button
                          className="btn btn-secondary"
                          onClick={() => dispatch({ type: 'CLEAR_BULK_PER', code: r.code })}
                          style={{ height: 22, padding: '0 7px', fontSize: 10.5 }}
                          title="일괄값으로 되돌리기"
                        >
                          일괄로
                        </button>
                      ) : (
                        <span style={{ fontSize: 10.5, color: 'var(--color-neutral-400)' }}>일괄</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </>
        ) : null}
      </div>

      <ModalFoot
        hint={
          def
            ? perN
              ? `객실 ${picked.length}개 중 ${perN}개는 따로 정한 값이 들어갑니다.`
              : `고른 객실 ${picked.length}개가 모두 ${showValue(def.key, bulk.value)}이 됩니다.`
            : ''
        }
      >
        <button className="btn btn-secondary" onClick={() => dispatch({ type: 'CLOSE_BULK' })} style={{ height: 32 }}>
          그만두기
        </button>
        <button
          className="btn btn-primary"
          onClick={() => dispatch({ type: 'PREVIEW_BULK' })}
          disabled={picked.length === 0}
          style={{ height: 32 }}
        >
          바꾸기
        </button>
      </ModalFoot>
    </Modal>
  );
};
