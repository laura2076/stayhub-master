const NAV = ['숙소·객실', '요금·재고', '판매 사이트', '예약', '정산'];

/** 흰 바탕에 파란 강조 하나 — 파트너센터 톤에서는 위쪽 띠가 어둡지 않습니다.
 *  어두운 띠는 화면을 두 덩어리로 갈라 놓아, 아래 작업 영역이 좁아 보입니다. */
export const TopBar = () => (
  <div
    style={{
      height: 52,
      flex: 'none',
      display: 'flex',
      alignItems: 'center',
      gap: 18,
      padding: '0 20px',
      background: 'var(--color-bg)',
      borderBottom: '1px solid var(--color-divider)',
      color: 'var(--color-text)',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: 'var(--radius-sm)',
          background: 'var(--color-accent)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: 12,
          fontWeight: 800,
        }}
      >
        S
      </div>
      <span style={{ fontSize: 14.5, fontWeight: 800, letterSpacing: '-0.3px' }}>STAYHUB 마스터</span>
    </div>

    <div style={{ display: 'flex', gap: 2, fontSize: 13 }}>
      {NAV.map((label, i) => (
        <span
          key={label}
          className={i === 0 ? undefined : 'hov-neutral'}
          style={{
            padding: '6px 11px',
            borderRadius: 'var(--radius-md)',
            background: i === 0 ? 'var(--color-accent-100)' : undefined,
            fontWeight: i === 0 ? 700 : 500,
            color: i === 0 ? 'var(--color-accent-700)' : 'var(--color-neutral-600)',
            cursor: 'pointer',
          }}
        >
          {label}
        </span>
      ))}
    </div>

    <div style={{ flex: 1 }} />
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: 'var(--color-neutral-600)' }}>
      <span
        style={{
          background: 'var(--color-accent-100)',
          color: 'var(--color-accent-700)',
          fontWeight: 700,
          padding: '3px 9px',
          borderRadius: 999,
        }}
      >
        연동 대기 3건
      </span>
      <span>운영팀 · 김지현</span>
    </div>
  </div>
);
