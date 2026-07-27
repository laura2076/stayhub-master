import { PENSIONS } from '../domain/catalog';
import { useStore } from '../state/store';

export const PensionSidebar = () => {
  const { state, dispatch } = useStore();

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
          <span style={{ fontSize: 10.5, color: 'var(--color-neutral-500)' }}>검수 필요 12</span>
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
        {PENSIONS.map(([name, meta, active, warn]) =>
          active ? (
            <div
              key={name}
              style={{
                padding: '9px 10px',
                borderRadius: 0,
                background: 'var(--color-accent-100)',
                border: '1px solid var(--color-accent-300)',
                marginBottom: 3,
                cursor: 'pointer',
              }}
            >
              <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--color-accent-800)' }}>{name}</div>
              <div style={{ marginTop: 3, fontSize: 10.5, color: 'var(--color-accent-700)' }}>{meta}</div>
            </div>
          ) : (
            <div
              key={name}
              className="hov-neutral"
              style={{ padding: '9px 10px', borderRadius: 0, marginBottom: 3, cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--color-neutral-800)' }}>{name}</span>
                {warn ? (
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--color-accent)' }} />
                ) : null}
              </div>
              <div style={{ marginTop: 3, fontSize: 10.5, color: 'var(--color-neutral-500)' }}>{meta}</div>
            </div>
          ),
        )}
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
        이 프로토타입은 <b style={{ color: 'var(--color-neutral-700)' }}>속초 더샵 스파 펜션</b> 실제 스냅샷 1건만 데이터가
        채워져 있습니다.
      </div>
    </div>
  );
};
