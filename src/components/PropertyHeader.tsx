import { attrsOf, feeAttrsOf } from '../domain/attrs';
import type { Property, TabId } from '../domain/types';
import { current, useStore } from '../state/store';
import { SettingsMenu } from './SettingsMenu';

/** 머리글의 한 줄 설명도 숙소가 가진 속성에서 나옵니다 — 손으로 쓴 문장이 아닙니다. */
const metaOf = (p: Property): string[] => [
  p.address,
  `${p.rooms.length}객실`,
  ...attrsOf(p)
    .filter((a) => a.kind === 'option' && (a.facility || a.key === 'view' || a.key === 'bbq'))
    .map((a) => a.label),
];

export const PropertyHeader = () => {
  const { state, dispatch } = useStore();
  const p = current(state);

  const tabs: [TabId, string, number][] = [
    ['rooms', '객실', p.rooms.length],
    ['blocks', '시설 정보', p.blocks.length],
    ['options', '요금표', feeAttrsOf(p).reduce((n, a) => n + (a.kind === 'option' ? a.options.length : 0), 0)],
    ['channels', '판매 사이트', 3],
    ['faq', '자주 묻는 질문', p.faqs.length],
    ['history', '바꾼 기록', p.history.length],
  ];

  return (
    <div
      style={{
        flex: 'none',
        background: 'var(--color-bg)',
        borderBottom: '1px solid var(--color-divider)',
        padding: '13px 20px 0',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                fontSize: 10.5,
                fontFamily: 'ui-monospace,Menlo,monospace',
                color: 'var(--color-neutral-700)',
                background: 'var(--color-neutral-200)',
                padding: '2px 6px',
                borderRadius: 0,
              }}
            >
              {p.code}
            </span>
            <span style={{ fontFamily: 'var(--font-heading)', fontSize: 24, fontWeight: 600, letterSpacing: '-0.01em' }}>
              {p.name}
            </span>
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                color: 'var(--color-accent-700)',
                background: 'var(--color-accent-100)',
                padding: '3px 7px',
                borderRadius: 0,
              }}
            >
              {p.status}
            </span>
          </div>
          <div
            style={{
              marginTop: 6,
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              fontSize: 11.5,
              color: 'var(--color-neutral-700)',
              flexWrap: 'wrap',
            }}
          >
            {metaOf(p).map((m, i) => (
              <span key={m} style={{ display: 'contents' }}>
                {i > 0 ? <span style={{ color: 'var(--color-neutral-300)' }}>·</span> : null}
                <span>{m}</span>
              </span>
            ))}
          </div>
        </div>

        <div style={{ flex: 1 }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ textAlign: 'right', marginRight: 4 }}>
            <div style={{ fontSize: 10.5, color: 'var(--color-neutral-500)' }}>마지막으로 저장한 때</div>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--color-neutral-700)' }}>{p.savedAt}</div>
          </div>
          <SettingsMenu />
          <button className="btn btn-secondary" onClick={() => dispatch({ type: 'SET_TAB', tab: 'channels' })} style={{ height: 32 }}>
            판매 사이트 확인
          </button>
          <button className="btn btn-primary" style={{ height: 32 }}>
            사이트에 보내기
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 2, marginTop: 14 }}>
        {tabs.map(([id, label, count]) => {
          const on = state.tab === id;
          return (
            <div
              key={id}
              onClick={() => dispatch({ type: 'SET_TAB', tab: id })}
              className={on ? undefined : 'hov-accent-text'}
              style={{
                padding: '8px 13px',
                fontSize: 12.5,
                fontWeight: on ? 700 : 500,
                color: on ? 'var(--color-accent-900)' : 'var(--color-neutral-600)',
                borderBottom: `2px solid ${on ? 'var(--color-accent-900)' : 'transparent'}`,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {label}
              {on ? (
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 600,
                    color: 'var(--color-neutral-700)',
                    background: 'var(--color-neutral-200)',
                    padding: '1px 5px',
                    borderRadius: 0,
                  }}
                >
                  {count}
                </span>
              ) : (
                <span style={{ fontSize: 10.5, color: 'var(--color-neutral-500)' }}>{count}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
