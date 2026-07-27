import { attrsOf } from '../../domain/attrs';
import { channelRows } from '../../domain/derive';
import { current, useStore } from '../../state/store';
import { Th } from '../primitives';

const COLS = '130px 250px repeat(3,minmax(0,1fr))';

export const ChannelsTab = () => {
  const { state, dispatch } = useStore();
  const p = current(state);
  /** 기준값은 저장된 문장이 아니라 이 숙소의 객실 값에서 계산됩니다. */
  const rows = channelRows(p);
  const mismatchN = rows.reduce((n, r) => n + r.cells.filter((c) => c.bad).length, 0);

  /** 사전은 이 숙소가 쓰는 속성만 — 캠핑장이 없는 숙소에 캠핑 용어를 보여 줄 이유가 없습니다. */
  const dict = attrsOf(p).filter((a) => a.kind === 'option' && (a.facility || a.key === 'bbq' || a.key === 'view'));

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px 40px', background: 'var(--color-bg)' }}>
      <div
        style={{
          background: 'var(--color-bg)',
          border: '1px solid var(--color-divider)',
          borderRadius: 'var(--radius-sm)',
          overflow: 'hidden',
          marginBottom: 14,
          minWidth: 900,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '11px 14px', borderBottom: '1px solid var(--color-divider)' }}>
          <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.01em' }}>판매 사이트에 나가는 값</span>
          <span style={{ fontSize: 11, color: 'var(--color-neutral-600)' }}>
            우리 값 하나를 사이트마다 쓰는 말로 바꿔서 내보냅니다.
          </span>
          <div style={{ flex: 1 }} />
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: mismatchN ? 'var(--color-accent-800)' : 'var(--color-neutral-700)',
              background: mismatchN ? 'var(--color-accent-200)' : 'var(--color-neutral-200)',
              padding: '3px 8px',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            다른 값 {mismatchN}개
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
          {['항목', '우리 값 (기준)', '네이버', '여기어때', '야놀자'].map((h) => (
            <Th key={h} style={{ padding: '8px 14px' }}>
              {h}
            </Th>
          ))}
        </div>

        {rows.map((row) => (
          <div key={row.id} style={{ display: 'grid', gridTemplateColumns: COLS, borderBottom: '1px solid var(--color-divider)', fontSize: 12 }}>
            <div style={{ padding: '11px 14px', fontWeight: 700 }}>{row.label}</div>
            <div style={{ padding: '11px 14px', color: 'var(--color-neutral-800)', lineHeight: 1.6 }}>{row.master}</div>
            {row.cells.map((c) => (
              <div key={c.ck} style={{ padding: '11px 14px' }}>
                {c.bad ? (
                  <div style={{ padding: '7px 9px', background: 'var(--color-accent-100)', border: '1px solid var(--color-accent-300)', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ color: 'var(--color-accent-900)', fontWeight: 600, lineHeight: 1.5 }}>{c.v || '(비어 있음)'}</div>
                    <div style={{ marginTop: 3, fontSize: 10.5, color: 'var(--color-accent-800)', lineHeight: 1.5 }}>
                      기준대로면: {c.expected}
                    </div>
                    <button
                      className="btn btn-primary"
                      onClick={() =>
                        dispatch({ type: 'SYNC_CHANNEL', rowId: row.id, ck: c.ck, label: row.label, chName: c.chName, to: c.expected })
                      }
                      style={{ marginTop: 6, height: 23, padding: '0 8px', fontSize: 11 }}
                    >
                      기준값으로 맞추기
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

      <div style={{ background: 'var(--color-bg)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-sm)', padding: '13px 14px', minWidth: 900 }}>
        <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.01em', marginBottom: 4 }}>사이트마다 다른 말</div>
        <div style={{ fontSize: 11, color: 'var(--color-neutral-600)', marginBottom: 11 }}>
          같은 것을 사이트마다 다르게 부릅니다. 사전은 값 옆에 붙어 있어서, 숙소가 어떤 시설을 갖든 같은 방식으로 바뀝니다.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 10 }}>
          {dict.flatMap((d) =>
            d.kind === 'option'
              ? d.options
                  .filter((o) => o.code !== 'none' && p.rooms.some((r) => (r.values[d.key] ?? p.defaults[d.key]) === o.code))
                  .map((o) => (
                    <div key={`${d.key}:${o.code}`} style={{ border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-sm)', padding: '10px 11px' }}>
                      <div style={{ fontSize: 11.5, fontWeight: 700, marginBottom: 7 }}>{o.label}</div>
                      {([['N', o.ch.a], ['여', o.ch.b], ['야', o.ch.c]] as [string, string][]).map(([k, v]) => (
                        <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '3px 0' }}>
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
                              borderRadius: 'var(--radius-sm)',
                              background: 'var(--color-neutral-200)',
                              color: 'var(--color-neutral-700)',
                            }}
                          >
                            {k}
                          </span>
                          <span style={{ fontSize: 11.5, color: 'var(--color-neutral-800)' }}>{v}</span>
                        </div>
                      ))}
                    </div>
                  ))
              : [],
          )}
        </div>
      </div>
    </div>
  );
};
