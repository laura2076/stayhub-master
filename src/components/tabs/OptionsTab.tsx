import { feeAttrsOf, feeOf, valueOf } from '../../domain/attrs';
import { current, useStore } from '../../state/store';
import { Corners, Th } from '../primitives';

const COLS = '200px 150px 210px repeat(3,minmax(0,1fr)) 86px';

export const OptionsTab = () => {
  const { state, dispatch } = useStore();
  const p = current(state);
  const attrs = feeAttrsOf(p);

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px 40px', background: 'var(--color-bg)' }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.01em', marginBottom: 4 }}>요금이 붙는 값</div>
        <div style={{ fontSize: 11, color: 'var(--color-neutral-600)', lineHeight: 1.6 }}>
          <b>요금은 객실이 아니라 값에 붙어 있습니다.</b> 여기서 요금을 한 번 고치면 그 값을 쓰는 모든 객실과 안내문, 판매
          사이트 요금이 같이 바뀝니다. 객실마다 따로 고칠 필요가 없습니다.
        </div>
      </div>

      {attrs.length === 0 ? (
        <div style={{ padding: '28px 0', fontSize: 12, color: 'var(--color-neutral-600)' }}>
          이 숙소에는 요금이 붙는 값이 없습니다.
        </div>
      ) : null}

      {attrs.map((d) => (
        <div key={d.key} style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 7 }}>
            {d.label} 종류와 요금
            {d.hint ? <span style={{ marginLeft: 7, fontWeight: 400, color: 'var(--color-neutral-500)' }}>{d.hint}</span> : null}
          </div>

          <div className="blueprint" style={{ background: 'transparent', minWidth: 1080 }}>
            <Corners />
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: COLS,
                background: 'var(--color-surface)',
                borderBottom: '1px solid var(--color-divider)',
              }}
            >
              {[`${d.label} 종류`, '코드', '이 숙소 요금', '네이버', '여기어때', '야놀자', '쓰는 객실'].map((h) => (
                <Th key={h} style={{ padding: '8px 13px' }}>
                  {h}
                </Th>
              ))}
            </div>

            {d.kind === 'option'
              ? d.options.map((o) => {
                  const used = p.rooms.filter((r) => valueOf(p, r, d.key) === o.code);
                  return (
                    <div
                      key={o.code}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: COLS,
                        borderBottom: '1px solid var(--color-divider)',
                        fontSize: 12,
                        alignItems: 'center',
                      }}
                    >
                      <div style={{ padding: '9px 13px', fontWeight: 700 }}>{o.label}</div>
                      <div
                        style={{
                          padding: '9px 13px',
                          fontFamily: 'ui-monospace,Menlo,monospace',
                          fontSize: 10.5,
                          color: 'var(--color-neutral-500)',
                        }}
                      >
                        {o.code}
                      </div>
                      <div style={{ padding: '7px 13px', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ flex: 1, minWidth: 0 }}>{feeOf(p, d.key, o.code)}</span>
                        <button
                          className="btn btn-secondary"
                          onClick={() => dispatch({ type: 'OPEN_OPT_FEE', attr: d.key, code: o.code })}
                          style={{ flex: 'none', height: 23, padding: '0 8px', fontSize: 11 }}
                        >
                          수정
                        </button>
                      </div>
                      <div style={{ padding: '9px 13px', color: 'var(--color-neutral-700)' }}>{o.ch.a}</div>
                      <div style={{ padding: '9px 13px', color: 'var(--color-neutral-700)' }}>{o.ch.b}</div>
                      <div style={{ padding: '9px 13px', color: 'var(--color-neutral-700)' }}>{o.ch.c}</div>
                      <div style={{ padding: '9px 13px' }}>
                        {used.length ? (
                          <span className="tag tag-accent" style={{ fontWeight: 700 }}>
                            {used.length}객실
                          </span>
                        ) : (
                          <span className="tag tag-neutral">쓰는 객실 없음</span>
                        )}
                      </div>
                    </div>
                  );
                })
              : null}
          </div>
        </div>
      ))}

      <div style={{ fontSize: 11, color: 'var(--color-neutral-600)', lineHeight: 1.6 }}>
        판매 사이트마다 부르는 말이 다릅니다 — 같은 숯불이 네이버는 "숯불그릴", 여기어때는 "참숯BBQ", 야놀자는 "숯불BBQ"로
        알아서 바뀌어 나갑니다. 객실 표에서 그 칸을 누르면 이 목록에서 고르게 되고, 요금은 따라옵니다.
      </div>
    </div>
  );
};
