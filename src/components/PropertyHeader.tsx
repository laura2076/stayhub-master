import { OPTIONS } from '../domain/catalog';
import type { TabId } from '../domain/types';
import { useStore } from '../state/store';
import { SettingsMenu } from './SettingsMenu';

const META = ['강원 속초시 장사항해안길 21', '28객실', '바다전망', '스파 전객실', '공용수영장(냉수)'];

export const PropertyHeader = () => {
  const { state, dispatch } = useStore();

  const tabs: [TabId, string, number][] = [
    ['rooms', '객실', state.rooms.length],
    ['blocks', '시설 정보', state.blocks.length],
    ['options', '요금표', OPTIONS.length],
    ['channels', '판매 사이트', 3],
    ['faq', '자주 묻는 질문', state.faqs.length],
    ['history', '바꾼 기록', state.history.length],
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
              2656
            </span>
            <span
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: 24,
                fontWeight: 600,
                letterSpacing: '-0.01em',
              }}
            >
              속초 더샵 스파 펜션
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
              판매중
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
            {META.map((m, i) => (
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
            <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--color-neutral-700)' }}>{state.savedAt}</div>
          </div>
          <SettingsMenu />
          <button
            className="btn btn-secondary"
            onClick={() => dispatch({ type: 'SET_TAB', tab: 'channels' })}
            style={{ height: 32 }}
          >
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
