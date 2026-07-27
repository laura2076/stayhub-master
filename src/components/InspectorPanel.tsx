import { useStore } from '../state/store';

/** "3층 6실 · 개별BBQ" — assembled from the rooms that actually carry an override. */
const overrideSummary = (rooms: { floor: number; bbq: string; bbqOv: boolean }[]): string => {
  const ov = rooms.filter((r) => r.bbqOv);
  if (!ov.length) return '오버라이드 없음';
  const floors = [...new Set(ov.map((r) => r.floor))].sort((a, b) => a - b);
  const contiguous = floors.length > 1 && floors[floors.length - 1] - floors[0] === floors.length - 1;
  const fl = contiguous ? `${floors[0]}~${floors[floors.length - 1]}층` : floors.map((f) => `${f}층`).join(',');
  const types = [...new Set(ov.map((r) => r.bbq.split(' · ')[0]))].join(', ');
  return `${fl} ${ov.length}실 ${types}`;
};

export const InspectorPanel = () => {
  const { state } = useStore();

  const inherited = state.rooms.filter((r) => !r.bbqOv).length;
  const overridden = state.rooms.length - inherited;
  const faqN = state.faqs.filter((f) => f.cate.includes('바베큐')).length;

  const scope: [number, string][] = [
    [inherited, '상속 객실'],
    [overridden, '오버라이드'],
    [3, '채널 항목'],
    [faqN, 'FAQ 문항'],
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
          필드 인스펙터
        </div>
        <div style={{ marginTop: 6, fontFamily: 'var(--font-heading)', fontSize: 17, fontWeight: 600 }}>바베큐 유형</div>
        <div style={{ marginTop: 3, fontSize: 11, color: 'var(--color-neutral-600)' }}>
          숙소 블록 shared_bbq / private_bbq 에서 파생
        </div>
      </div>

      <div style={{ flex: 'none', padding: '12px 14px', borderBottom: '1px solid var(--color-divider)' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <div
            style={{
              flex: 1,
              padding: '9px 10px',
              border: '1px solid var(--color-divider)',
              borderRadius: 0,
              background: 'var(--color-bg)',
            }}
          >
            <div style={{ fontSize: 10.5, color: 'var(--color-neutral-500)', marginBottom: 4 }}>숙소 기본값</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-neutral-700)' }}>공용BBQ · 가스그릴</div>
          </div>
          <div
            style={{
              flex: 1,
              padding: '9px 10px',
              border: '1px solid var(--color-accent-300)',
              borderRadius: 0,
              background: 'var(--color-accent-100)',
            }}
          >
            <div style={{ fontSize: 10.5, color: 'var(--color-accent-800)', marginBottom: 4 }}>오버라이드</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-accent-900)' }}>
              {overrideSummary(state.rooms)}
            </div>
          </div>
        </div>
        <div style={{ marginTop: 9, fontSize: 11, lineHeight: 1.6, color: 'var(--color-neutral-600)' }}>
          숙소 값을 기본값으로 두고 객실에서 필요한 것만 덮어씁니다. 기본값을 바꾸면 오버라이드가 없는 객실만 자동
          갱신되고, 오버라이드 객실은 미리보기에서 따로 확인합니다.
        </div>
      </div>

      <div style={{ flex: 'none', padding: '12px 14px', borderBottom: '1px solid var(--color-divider)' }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--color-neutral-700)',
            letterSpacing: '.04em',
            marginBottom: 8,
          }}
        >
          영향 범위
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 7 }}>
          {scope.map(([n, t]) => (
            <div
              key={t}
              style={{
                padding: '8px 10px',
                background: 'var(--color-bg)',
                border: '1px solid var(--color-divider)',
                borderRadius: 0,
              }}
            >
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: 21, fontWeight: 600 }}>{n}</div>
              <div style={{ fontSize: 10.5, color: 'var(--color-neutral-600)', marginTop: 1 }}>{t}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--color-neutral-700)',
            letterSpacing: '.04em',
            marginBottom: 9,
          }}
        >
          변경 이력
        </div>
        {state.history.map((h, i) => (
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
                연쇄 {h.n}건
              </span>
              <span style={{ fontSize: 10, color: 'var(--color-neutral-500)' }}>{h.who}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
