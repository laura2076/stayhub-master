import { OPTIONS } from '../../domain/catalog';
import { useStore } from '../../state/store';
import { Corners, Th } from '../primitives';

const COLS = '190px 150px 210px repeat(3,minmax(0,1fr)) 86px';

export const OptionsTab = () => {
  const { state, dispatch } = useStore();

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px 40px', background: 'var(--color-bg)' }}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 3 }}>바베큐 종류와 요금</div>
        <div style={{ fontSize: 11, color: 'var(--color-neutral-600)', lineHeight: 1.6 }}>
          <b>요금은 객실이 아니라 바베큐 종류에 붙어 있습니다.</b> 여기서 요금을 한 번 고치면 그 종류를 쓰는 모든
          객실과 안내문, 판매 사이트 요금이 같이 바뀝니다. 객실마다 따로 고칠 필요가 없습니다.
        </div>
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
          {['바베큐 종류', '코드', '이 숙소 요금', '네이버', '여기어때', '야놀자', '쓰는 객실'].map((h) => (
            <Th key={h} style={{ padding: '8px 13px' }}>
              {h}
            </Th>
          ))}
        </div>

        {OPTIONS.map((o) => {
          const used = state.rooms.filter((r) => r.bbqOpt === o.code);
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
                <span style={{ flex: 1, minWidth: 0 }}>{state.optFees[o.code]}</span>
                <button
                  className="btn btn-secondary"
                  onClick={() => dispatch({ type: 'OPEN_OPT_FEE', code: o.code })}
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
        })}
      </div>

      <div style={{ marginTop: 12, fontSize: 11, color: 'var(--color-neutral-600)', lineHeight: 1.6 }}>
        판매 사이트마다 부르는 말이 다릅니다 — 같은 숯불이 네이버는 "숯불그릴", 여기어때는 "참숯BBQ", 야놀자는
        "숯불BBQ"로 알아서 바뀌어 나갑니다. 객실 표에서 바베큐 칸을 누르면 이 목록에서 고르게 되고, 요금은 따라옵니다.
      </div>
    </div>
  );
};
