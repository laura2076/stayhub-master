import { attrsOf } from '../domain/attrs';
import type { Property } from '../domain/types';
import { useStore } from '../state/store';

/** 목록에 붙는 한 줄 — 숙소마다 모양이 다르다는 것이 여기서 먼저 보입니다. */
const meta = (p: Property): string =>
  `${p.code} · ${p.rooms.length}객실 · ${attrsOf(p)
    .filter((a) => a.kind === 'option' && a.facility)
    .map((a) => a.label)
    .join('·') || '부대시설 없음'}`;

export const PensionSidebar = () => {
  const { state, dispatch } = useStore();
  const q = state.q.trim();
  /** 검색은 객실 표와 목록이 같은 칸을 씁니다 — 숙소명이 걸리면 목록이, 객실명이
   *  걸리면 표가 좁혀집니다. */
  const list = q ? state.properties.filter((p) => `${p.name}${p.code}${p.region}`.includes(q)) : state.properties;

  return (
    <div
      style={{
        width: 274,
        flex: 'none',
        background: 'var(--color-surface)',
        borderRight: '1px solid var(--color-divider)',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
      }}
    >
      <div style={{ padding: '12px 12px 10px', borderBottom: '1px solid var(--color-divider)' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 9 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-neutral-700)', letterSpacing: '.04em' }}>
            숙소 1,000
          </span>
          <span style={{ fontSize: 10.5, color: 'var(--color-neutral-500)' }}>
            검수 필요 {state.properties.filter((p) => p.warn).length}
          </span>
        </div>
        <input
          className="input"
          value={state.q}
          onChange={(e) => dispatch({ type: 'SET_QUERY', q: e.target.value })}
          placeholder="숙소명 · 숙소코드 검색"
          style={{ minHeight: 31, fontSize: 13 }}
        />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 6 }}>
        {list.map((p) => {
          const on = p.id === state.current;
          return (
            <div
              key={p.id}
              onClick={() => dispatch({ type: 'SET_PROPERTY', id: p.id })}
              className={on ? undefined : 'hov-neutral'}
              style={{
                padding: '9px 10px',
                borderRadius: 'var(--radius-sm)',
                marginBottom: 3,
                cursor: 'pointer',
                background: on ? 'var(--color-accent-100)' : undefined,
                border: on ? '1px solid var(--color-accent-300)' : '1px solid transparent',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span
                  style={{
                    fontSize: 12.5,
                    fontWeight: on ? 700 : 500,
                    color: on ? 'var(--color-accent-800)' : 'var(--color-neutral-800)',
                  }}
                >
                  {p.name}
                </span>
                {p.warn ? <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--color-accent)' }} /> : null}
              </div>
              <div style={{ marginTop: 3, fontSize: 10.5, color: on ? 'var(--color-accent-700)' : 'var(--color-neutral-500)' }}>
                {meta(p)}
              </div>
            </div>
          );
        })}
        {list.length === 0 ? (
          <div style={{ padding: '18px 10px', fontSize: 11.5, color: 'var(--color-neutral-500)' }}>
            "{q}"에 맞는 숙소가 없어요.
          </div>
        ) : null}
      </div>

      <div
        style={{
          flex: 'none',
          padding: '10px 12px',
          borderTop: '1px solid var(--color-divider)',
          fontSize: 10.5,
          color: 'var(--color-neutral-500)',
          lineHeight: 1.5,
        }}
      >
        숙소마다 가진 시설이 다릅니다. 화면의 열·요금표·판매 사이트 값은 모두{' '}
        <b style={{ color: 'var(--color-neutral-700)' }}>그 숙소가 쓰는 속성</b>에서 만들어집니다.
      </div>
    </div>
  );
};
