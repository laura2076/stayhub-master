import { fmtNum } from '../../domain/fieldTypes';
import type { Room } from '../../domain/types';
import { useStore } from '../../state/store';
import { ChannelBadge, Th } from '../primitives';

const COLS = '36px 214px 104px 100px 170px 186px 122px 148px 132px 78px';

const HEADS = ['객실', '기준/최대', '추가인원', '바베큐', '바베큐 요금', '스파', '구조 / 침구', '객실내 시설', '채널'];

/** Override marker — a solid accent tick. Inheritance is a dashed underline instead. */
const OvMark = () => (
  <span style={{ width: 3, height: 12, background: 'var(--color-accent)', borderRadius: 2 }} />
);

const Value = ({ v, ov }: { v: string; ov: boolean }) =>
  ov ? (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 700 }}>
      <OvMark />
      {v}
    </span>
  ) : (
    <span style={{ color: 'var(--color-neutral-600)', borderBottom: '1px dashed var(--color-neutral-300)' }}>{v}</span>
  );

const Ghost = ({ base }: { base: string }) => (
  <div style={{ fontSize: 10, color: 'var(--color-neutral-400)', marginTop: 2 }}>숙소 {base}</div>
);

export const RoomsTab = () => {
  const { state, dispatch } = useStore();
  const ghost = state.settings.inheritanceViz === 'ghost';
  const query = state.q.trim();
  const rows: Room[] = query
    ? state.rooms.filter((r) => `${r.short}${r.code}${r.tag}`.includes(query))
    : state.rooms;

  const ovCount = state.rooms.filter((r) => r.bbqOv || r.spaOv || r.paxOv || r.extraOv).length;
  const hasSel = state.sel.length > 0;

  return (
    <>
      <div
        style={{
          flex: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '9px 20px',
          background: 'var(--color-surface)',
          borderBottom: '1px solid var(--color-divider)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, color: 'var(--color-neutral-700)' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <OvMark />
            객실 오버라이드 {ovCount}
          </span>
          <span style={{ color: 'var(--color-neutral-300)' }}>|</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 11, height: 0, borderTop: '1px dashed var(--color-neutral-400)' }} />
            숙소 기본값 상속
          </span>
        </div>
        <div style={{ flex: 1 }} />
        {hasSel ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, animation: 'fin .16s ease' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-accent-800)' }}>
              {state.sel.length}객실 선택
            </span>
            <button
              className="btn btn-primary"
              onClick={() => dispatch({ type: 'OPEN_BULK' })}
              style={{ height: 29, fontSize: 13 }}
            >
              일괄 편집
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => dispatch({ type: 'PREVIEW_DELETE' })}
              style={{ height: 29, fontSize: 13 }}
            >
              객실 삭제
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => dispatch({ type: 'CLEAR_SEL' })}
              style={{ height: 29, fontSize: 13 }}
            >
              해제
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--color-neutral-500)' }}>행을 선택하면 일괄 편집</span>
            <button
              className="btn btn-secondary"
              onClick={() => dispatch({ type: 'OPEN_NEW_ROOM' })}
              style={{ height: 29, fontSize: 13 }}
            >
              + 객실 추가
            </button>
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflow: 'auto', background: 'var(--color-bg)' }}>
        <div style={{ minWidth: 1290 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: COLS,
              position: 'sticky',
              top: 0,
              zIndex: 2,
              background: 'var(--color-surface)',
              borderBottom: '1px solid var(--color-divider)',
            }}
          >
            <div style={{ padding: '8px 0 8px 13px' }}>
              <input
                type="checkbox"
                checked={state.sel.length === state.rooms.length && state.rooms.length > 0}
                onChange={() => dispatch({ type: 'TOGGLE_ALL' })}
                style={{ cursor: 'pointer' }}
              />
            </div>
            {HEADS.map((h, i) => (
              <Th key={h} style={i === 0 ? { borderRight: '1px solid var(--color-divider)' } : undefined}>
                {h}
              </Th>
            ))}
          </div>

          {rows.map((r) => (
            <div
              key={r.code}
              className="hov-surface"
              style={{
                display: 'grid',
                gridTemplateColumns: COLS,
                borderBottom: '1px solid var(--color-divider)',
                fontSize: 12,
              }}
            >
              <div style={{ padding: '8px 0 0 13px' }}>
                <input
                  type="checkbox"
                  checked={state.sel.includes(r.code)}
                  onChange={() => dispatch({ type: 'TOGGLE_ROOM', code: r.code })}
                  style={{ cursor: 'pointer' }}
                />
              </div>

              <div style={{ padding: '7px 12px', borderRight: '1px solid var(--color-divider)', minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span
                    style={{ fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 10.5, color: 'var(--color-neutral-500)' }}
                  >
                    {r.code}
                  </span>
                  <span style={{ fontWeight: 700 }}>{r.short}</span>
                </div>
                <div
                  style={{
                    marginTop: 2,
                    fontSize: 10.5,
                    color: 'var(--color-neutral-500)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {r.tag} · {r.area}
                </div>
              </div>

              <div style={{ padding: '7px 12px' }}>
                <Value v={`기준 ${r.baseP} / 최대 ${r.maxP}`} ov={r.paxOv} />
                {ghost && !r.paxOv ? <Ghost base="기준 2 / 최대 4" /> : null}
              </div>

              <div style={{ padding: '7px 12px' }}>
                <Value v={`${fmtNum(r.extra)}원`} ov={r.extraOv} />
              </div>

              {/* Clicking the cell selects the room and opens its editor — one move, not two. */}
              <div
                onClick={() => dispatch({ type: 'EDIT_ROOM_FIELD', code: r.code, field: 'bbq' })}
                className="hov-accent"
                style={{ padding: '7px 12px', cursor: 'pointer' }}
              >
                <Value v={r.bbq} ov={r.bbqOv} />
                {ghost && !r.bbqOv ? <Ghost base="공용BBQ · 가스그릴" /> : null}
              </div>

              <div style={{ padding: '7px 12px', color: 'var(--color-neutral-600)' }}>{r.bbqFee}</div>

              <div style={{ padding: '7px 12px' }}>
                <Value v={r.spa} ov={r.spaOv} />
                {ghost && !r.spaOv ? <Ghost base="제트스파 2인용" /> : null}
              </div>

              <div style={{ padding: '7px 12px' }}>
                <span style={{ color: 'var(--color-neutral-800)' }}>{r.form}</span>{' '}
                <span style={{ color: 'var(--color-neutral-500)' }}>· {r.bed}</span>
              </div>

              <div style={{ padding: '7px 12px' }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--color-neutral-800)',
                    background: 'var(--color-neutral-200)',
                    padding: '2px 7px',
                    borderRadius: 0,
                  }}
                >
                  {r.facil}
                </span>
              </div>

              <div style={{ padding: '7px 12px', display: 'flex', gap: 3 }}>
                <ChannelBadge k="N" bad={false} />
                <ChannelBadge k="여" bad={r.floor !== 3} />
                <ChannelBadge k="야" bad={r.paxOv} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};
