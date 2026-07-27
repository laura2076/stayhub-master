import { CHANKEYS, CHANNEL_RULES, MASTER_ROWS, THEME_DICT } from '../../domain/catalog';
import type { ChannelKey, ChannelRowId } from '../../domain/types';
import { useStore } from '../../state/store';
import { Th } from '../primitives';

const COLS = '130px 250px repeat(3,minmax(0,1fr))';

export const ChannelsTab = () => {
  const { state, dispatch } = useStore();

  const cells = (id: ChannelRowId, label: string) =>
    CHANKEYS.map(([ck, chName]) => {
      const v = state.channels[id][ck];
      const rule = CHANNEL_RULES[id][ck];
      return { ck: ck as ChannelKey, chName, v, rule, bad: v !== rule, label };
    });

  const mismatchN = MASTER_ROWS.reduce(
    (n, [id]) => n + CHANKEYS.filter(([ck]) => state.channels[id][ck] !== CHANNEL_RULES[id][ck]).length,
    0,
  );

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px 40px', background: 'var(--color-bg)' }}>
      <div
        style={{
          background: 'var(--color-bg)',
          border: '1px solid var(--color-divider)',
          borderRadius: 0,
          overflow: 'hidden',
          marginBottom: 14,
          minWidth: 900,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            padding: '11px 14px',
            borderBottom: '1px solid var(--color-divider)',
          }}
        >
          <span style={{ fontSize: 12.5, fontWeight: 700 }}>채널별 값 매핑</span>
          <span style={{ fontSize: 11, color: 'var(--color-neutral-600)' }}>
            마스터 값 1개 → 채널 사전(dictionary)을 통해 채널 표현으로 변환합니다.
          </span>
          <div style={{ flex: 1 }} />
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--color-accent-800)',
              background: 'var(--color-accent-200)',
              padding: '3px 8px',
              borderRadius: 0,
            }}
          >
            불일치 {mismatchN}
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: COLS,
            background: 'var(--color-surface)',
            borderBottom: '1px solid var(--color-divider)',
          }}
        >
          {['항목', '마스터 값 (단일 원본)', '네이버', '여기어때', '야놀자'].map((h) => (
            <Th key={h} style={{ padding: '8px 14px' }}>
              {h}
            </Th>
          ))}
        </div>

        {MASTER_ROWS.map(([id, label, master]) => (
          <div
            key={id}
            style={{
              display: 'grid',
              gridTemplateColumns: COLS,
              borderBottom: '1px solid var(--color-divider)',
              fontSize: 12,
            }}
          >
            <div style={{ padding: '11px 14px', fontWeight: 700 }}>{label}</div>
            <div style={{ padding: '11px 14px', color: 'var(--color-neutral-800)', lineHeight: 1.6 }}>{master}</div>
            {cells(id, label).map((c) => (
              <div key={c.ck} style={{ padding: '11px 14px' }}>
                {c.bad ? (
                  <div
                    style={{
                      padding: '7px 9px',
                      background: 'var(--color-accent-100)',
                      border: '1px solid var(--color-accent-300)',
                      borderRadius: 0,
                    }}
                  >
                    <div style={{ color: 'var(--color-accent-900)', fontWeight: 600, lineHeight: 1.5 }}>{c.v}</div>
                    <div style={{ marginTop: 3, fontSize: 10.5, color: 'var(--color-accent-800)', lineHeight: 1.5 }}>
                      매핑 규칙: {c.rule}
                    </div>
                    <button
                      className="btn btn-primary"
                      onClick={() =>
                        dispatch({
                          type: 'SYNC_CHANNEL',
                          rowId: id,
                          ck: c.ck,
                          label: c.label,
                          chName: c.chName,
                          to: c.rule,
                        })
                      }
                      style={{ marginTop: 6, height: 23, padding: '0 8px', fontSize: 11 }}
                    >
                      마스터값으로 교정
                    </button>
                  </div>
                ) : (
                  <div style={{ color: 'var(--color-neutral-800)', lineHeight: 1.6 }}>{c.v}</div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div
        style={{
          background: 'var(--color-bg)',
          border: '1px solid var(--color-divider)',
          borderRadius: 0,
          padding: '13px 14px',
          minWidth: 900,
        }}
      >
        <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 3 }}>테마 매핑 사전</div>
        <div style={{ fontSize: 11, color: 'var(--color-neutral-600)', marginBottom: 11 }}>
          채널마다 용어가 다르므로, 마스터 값 1개 = 채널별 용어 N개로 사전을 고정해 두면 사람이 채널마다 다시 고를 필요가
          없습니다.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 10 }}>
          {THEME_DICT.map((d) => (
            <div key={d.master} style={{ border: '1px solid var(--color-divider)', borderRadius: 0, padding: '10px 11px' }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, marginBottom: 7 }}>{d.master}</div>
              {d.rows.map((dr) => (
                <div key={dr.k} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '3px 0' }}>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      width: 18,
                      height: 18,
                      flex: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 0,
                      background: 'var(--color-neutral-200)',
                      color: 'var(--color-neutral-700)',
                    }}
                  >
                    {dr.k}
                  </span>
                  <span style={{ fontSize: 11.5, color: 'var(--color-neutral-800)' }}>{dr.v}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
