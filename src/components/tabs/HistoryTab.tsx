import { useStore } from '../../state/store';

export const HistoryTab = () => {
  const { state } = useStore();

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 40px', background: 'var(--color-bg)' }}>
      {state.history.map((h, i) => (
        <div
          key={`${h.title}-${i}`}
          style={{
            background: 'var(--color-bg)',
            border: '1px solid var(--color-divider)',
            borderRadius: 0,
            padding: '12px 14px',
            marginBottom: 9,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span style={{ fontSize: 12.5, fontWeight: 700 }}>{h.title}</span>
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                color: 'var(--color-accent-800)',
                background: 'var(--color-accent-100)',
                padding: '2px 7px',
                borderRadius: 0,
              }}
            >
              같이 바뀐 것 {h.n}개
            </span>
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: 11, color: 'var(--color-neutral-500)' }}>
              {h.who} · {h.at}
            </span>
          </div>
          <div style={{ marginTop: 7, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
            <span style={{ color: 'var(--color-neutral-500)', textDecoration: 'line-through' }}>{h.before}</span>
            <span style={{ color: 'var(--color-neutral-400)' }}>→</span>
            <span style={{ fontWeight: 600 }}>{h.after}</span>
          </div>
          <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {h.chips.map((c) => (
              <span
                key={c}
                style={{
                  fontSize: 10.5,
                  fontWeight: 600,
                  color: 'var(--color-neutral-700)',
                  background: 'var(--color-neutral-200)',
                  padding: '3px 8px',
                  borderRadius: 0,
                }}
              >
                {c}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
