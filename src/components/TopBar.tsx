const NAV = ['숙소·객실', '요금·재고', '채널 연동', '예약', '정산'];

export const TopBar = () => (
  <div
    style={{
      height: 48,
      flex: 'none',
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      padding: '0 18px',
      background: 'var(--color-accent-900)',
      color: 'var(--color-bg)',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
      <div style={{ width: 18, height: 18, borderRadius: 0, background: 'var(--color-accent-400)' }} />
      <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '-0.2px' }}>STAYHUB 마스터</span>
    </div>
    <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,.16)' }} />
    <div style={{ display: 'flex', gap: 2, fontSize: 12.5 }}>
      {NAV.map((label, i) => (
        <span
          key={label}
          style={{
            padding: '5px 10px',
            borderRadius: 0,
            background: i === 0 ? 'rgba(255,255,255,.13)' : undefined,
            fontWeight: i === 0 ? 600 : undefined,
            color: i === 0 ? undefined : 'rgba(255,255,255,.55)',
          }}
        >
          {label}
        </span>
      ))}
    </div>
    <div style={{ flex: 1 }} />
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11.5, color: 'rgba(255,255,255,.55)' }}>
      <span>연동 대기 3건</span>
      <span style={{ width: 1, height: 12, background: 'rgba(255,255,255,.16)' }} />
      <span>운영팀 · 김지현</span>
    </div>
  </div>
);
