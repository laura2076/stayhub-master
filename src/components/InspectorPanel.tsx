import { attrsOf, feeOf, isOwn, showValue } from '../domain/attrs';
import { floorSpan } from '../domain/derive';
import type { AttrDef, Property } from '../domain/types';
import { current, useStore } from '../state/store';
import { CellPicker, type PickerMode } from './CellPicker';

/** "3층 6실" — 이 속성을 따로 정한 객실이 어디에 몰려 있는지. */
const ownSummary = (p: Property, d: AttrDef): string => {
  const ov = p.rooms.filter((r) => isOwn(r, d.key) && r.values[d.key] !== p.defaults[d.key]);
  if (!ov.length) return '따로 정한 객실 없음';
  return `${floorSpan(ov)} ${ov.length}실`;
};

const modeOf = (p: Property, d: AttrDef): PickerMode => {
  if (d.kind === 'int') return { kind: 'number', unit: d.unit, min: d.min, max: d.max };
  if (d.kind === 'money') return { kind: 'number', unit: '원', min: 0, money: true };
  return {
    kind: 'options',
    options: d.options.map((o) => ({
      value: o.code,
      label: o.label,
      note: d.feeBearing && feeOf(p, d.key, o.code) !== '—' ? feeOf(p, d.key, o.code) : undefined,
    })),
  };
};

/** 전체값 한 줄. 눌러서 바꾸면 따로 정하지 않은 객실이 전부 따라옵니다 —
 *  상속 구조의 나머지 절반이고, 여기가 그것을 만지는 유일한 자리입니다. */
const DefaultRow = ({ p, d }: { p: Property; d: AttrDef }) => {
  const { dispatch } = useStore();
  return (
    <CellPicker
      label={`숙소 전체 ${d.label}`}
      className="hov-accent"
      mode={modeOf(p, d)}
      current={p.defaults[d.key]}
      onPick={(value) => dispatch({ type: 'PICK_DEFAULT', attr: d.key, value })}
      cellStyle={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 8,
        padding: '9px 14px',
        borderBottom: '1px solid var(--color-divider)',
      }}
    >
      <span style={{ width: 74, flex: 'none', fontSize: 11, color: 'var(--color-neutral-600)' }}>{d.label}</span>
      <span
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--color-neutral-800)',
          minWidth: 0,
          flex: 1,
          borderBottom: '1px dashed var(--color-neutral-300)',
        }}
      >
        {showValue(d.key, p.defaults[d.key])}
      </span>
      <span style={{ fontSize: 10.5, color: 'var(--color-accent-800)', whiteSpace: 'nowrap' }}>{ownSummary(p, d)}</span>
    </CellPicker>
  );
};

export const InspectorPanel = () => {
  const { state } = useStore();
  const p = current(state);
  const defs = attrsOf(p);

  const overridden = p.rooms.filter((r) => defs.some((d) => isOwn(r, d.key) && r.values[d.key] !== p.defaults[d.key])).length;

  const scope: [number, string][] = [
    [p.rooms.length - overridden, '전체값 그대로'],
    [overridden, '따로 정함'],
    [3, '판매 사이트'],
    [p.faqs.length, '질문·답변'],
  ];

  return (
    <div
      style={{
        width: 340,
        flex: 'none',
        background: 'var(--color-surface)',
        borderLeft: '1px solid var(--color-divider)',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
      }}
    >
      <div style={{ flex: 'none', padding: '12px 14px', borderBottom: '1px solid var(--color-divider)' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-neutral-700)', letterSpacing: '.04em' }}>
          이 숙소의 전체값
        </div>
        <div style={{ marginTop: 3, fontSize: 11, color: 'var(--color-neutral-600)', lineHeight: 1.6 }}>
          숙소 전체값을 정해 두고, 객실마다 다른 것만 따로 정합니다. <b>값을 누르면 전체값을 바꿉니다</b> — 따로 정한
          객실은 그대로 두고 나머지만 같이 바뀝니다.
        </div>
      </div>

      <div style={{ flex: 'none', maxHeight: 300, overflowY: 'auto', borderBottom: '1px solid var(--color-divider)' }}>
        {defs.map((d) => (
          <DefaultRow key={d.key} p={p} d={d} />
        ))}
      </div>

      <div style={{ flex: 'none', padding: '12px 14px', borderBottom: '1px solid var(--color-divider)' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-neutral-700)', letterSpacing: '.04em', marginBottom: 8 }}>
          같이 바뀌는 곳
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 7 }}>
          {scope.map(([n, t]) => (
            <div key={t} style={{ padding: '8px 10px', background: 'var(--color-bg)', border: '1px solid var(--color-divider)', borderRadius: 0 }}>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: 21, fontWeight: 600 }}>{n}</div>
              <div style={{ fontSize: 10.5, color: 'var(--color-neutral-600)', marginTop: 1 }}>{t}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-neutral-700)', letterSpacing: '.04em', marginBottom: 9 }}>
          바꾼 기록
        </div>
        {p.history.map((h, i) => (
          <div key={`${h.title}-${i}`} style={{ padding: '9px 0', borderBottom: '1px solid var(--color-divider)' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, lineHeight: 1.4 }}>{h.title}</span>
              <div style={{ flex: 1 }} />
              <span style={{ fontSize: 10, color: 'var(--color-neutral-400)', whiteSpace: 'nowrap' }}>{h.at}</span>
            </div>
            <div style={{ marginTop: 4, fontSize: 11, color: 'var(--color-neutral-600)', lineHeight: 1.5 }}>
              {h.before} → <b style={{ color: 'var(--color-neutral-800)' }}>{h.after}</b>
            </div>
            <div style={{ marginTop: 5, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: 'var(--color-accent-800)',
                  background: 'var(--color-accent-100)',
                  padding: '2px 6px',
                  borderRadius: 0,
                }}
              >
                같이 바뀐 것 {h.n}개
              </span>
              <span style={{ fontSize: 10, color: 'var(--color-neutral-500)' }}>{h.who}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
