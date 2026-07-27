import { OPTIONS } from '../../domain/catalog';
import { useStore } from '../../state/store';
import { Corners, Th } from '../primitives';

const COLS = '190px 150px 210px repeat(3,minmax(0,1fr)) 86px';

export const OptionsTab = () => {
  const { state, dispatch } = useStore();

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px 40px', background: 'var(--color-bg)' }}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 3 }}>바베큐 형태 옵션 · 요금</div>
        <div style={{ fontSize: 11, color: 'var(--color-neutral-600)', lineHeight: 1.6 }}>
          모든 입력값은 전사 옵션 코드에서 고릅니다 — 자유 텍스트가 아니므로 연결 규칙을 걸 수 있습니다.{' '}
          <b>요금은 객실이 아니라 옵션에 붙습니다</b>: 옵션 요금 한 번을 고치면 그 옵션을 쓰는 모든 객실·블록 문구·채널
          요금이 함께 갱신됩니다.
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
          {['옵션', '코드', '이용요금 (이 숙소)', '네이버', '여기어때', '야놀자', '사용'].map((h) => (
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
                  <span className="tag tag-neutral">미사용</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 12, fontSize: 11, color: 'var(--color-neutral-600)', lineHeight: 1.6 }}>
        채널 열은 매핑 사전값입니다 — 같은 옵션이 네이버 "숯불그릴", 여기어때 "참숯BBQ", 야놀자 "숯불BBQ"로 자동
        변환됩니다. 객실 탭의 바베큐 셀을 누르면 이 옵션 목록에서만 고를 수 있고, 요금은 선택한 옵션에서 따라옵니다.
      </div>
    </div>
  );
};
