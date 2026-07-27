import { BASEVAL, FIELDS, OPTIONS } from '../../domain/catalog';
import { curVal } from '../../domain/derive';
import { fmtNum } from '../../domain/fieldTypes';
import type { BulkFieldId, MasterState, Room } from '../../domain/types';
import { useStore } from '../../state/store';
import { CellPicker } from '../CellPicker';
import { ChannelBadge, Th } from '../primitives';

const COLS = '36px 214px 104px 100px 170px 186px 122px 148px 132px 78px';

const HEADS = ['객실', '인원', '추가요금', '바베큐', '바베큐 요금', '스파', '구조 · 침구', '객실 비품', '판매 사이트'];

/** 고를 수 있는 값 목록. 숙소 전체값에는 "전체와 같음"을 달아 무엇이 기본인지 보이게 합니다. */
const cellOptions = (field: BulkFieldId, st: MasterState) => {
  const base = BASEVAL[field];
  if (field === 'bbq') {
    return OPTIONS.map((o) => ({
      value: o.label,
      label: o.label,
      note: (o.label === base ? '전체와 같음 · ' : '') + (st.optFees[o.code] === '—' ? '요금 없음' : st.optFees[o.code]),
    }));
  }
  return FIELDS.find((f) => f.id === field)!.values.map(([value, label]) => ({
    value,
    label: label.replace(' (숙소 기본값)', ''),
    note: value === base ? '전체와 같음' : undefined,
  }));
};

/** 전체와 다른 값에 붙는 표시. 기호만으로는 뜻이 안 통해서 말도 함께 답니다. */
const OwnMark = () => (
  <span
    title="이 객실만 따로 정한 값입니다"
    style={{ width: 3, height: 12, flex: 'none', background: 'var(--color-accent)', borderRadius: 2 }}
  />
);

const Value = ({ v, own }: { v: string; own: boolean }) =>
  own ? (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 700 }}>
      <OwnMark />
      {v}
    </span>
  ) : (
    <span style={{ color: 'var(--color-neutral-600)', borderBottom: '1px dashed var(--color-neutral-300)' }}>{v}</span>
  );

const Ghost = ({ base }: { base: string }) => (
  <div style={{ fontSize: 10, color: 'var(--color-neutral-400)', marginTop: 2 }}>전체 {base}</div>
);

/** 눌러서 고칠 수 있는 칸. 눌러야 하는 곳임이 보이도록 hover 배경을 줍니다. */
const EditableCell = ({
  room,
  field,
  label,
  display,
  own,
  ghost,
}: {
  room: Room;
  field: BulkFieldId;
  label: string;
  display: string;
  own: boolean;
  ghost?: string;
}) => {
  const { state, dispatch } = useStore();
  return (
    <CellPicker
      label={label}
      className="hov-accent"
      cellStyle={{ padding: '7px 12px' }}
      options={cellOptions(field, state)}
      current={curVal(room, field)}
      onPick={(value) => dispatch({ type: 'PICK_CELL', code: room.code, field, value })}
    >
      <Value v={display} own={own} />
      {ghost ? <Ghost base={ghost} /> : null}
    </CellPicker>
  );
};

export const RoomsTab = () => {
  const { state, dispatch } = useStore();
  const showAll = state.settings.inheritanceViz === 'ghost';
  const query = state.q.trim();
  const rows: Room[] = query
    ? state.rooms.filter((r) => `${r.short}${r.code}${r.tag}`.includes(query))
    : state.rooms;

  const ownCount = state.rooms.filter((r) => r.bbqOv || r.spaOv || r.paxOv || r.extraOv).length;
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
            <OwnMark />이 객실만 따로 정함 {ownCount}
          </span>
          <span style={{ color: 'var(--color-neutral-300)' }}>|</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 11, height: 0, borderTop: '1px dashed var(--color-neutral-400)' }} />
            전체와 같음
          </span>
        </div>
        <div style={{ flex: 1 }} />
        {hasSel ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, animation: 'fin .16s ease' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-accent-800)' }}>
              {state.sel.length}개 선택됨
            </span>
            <button
              className="btn btn-primary"
              onClick={() => dispatch({ type: 'OPEN_BULK' })}
              style={{ height: 29, fontSize: 13 }}
            >
              한꺼번에 바꾸기
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => dispatch({ type: 'PREVIEW_DELETE' })}
              style={{ height: 29, fontSize: 13 }}
            >
              지우기
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => dispatch({ type: 'CLEAR_SEL' })}
              style={{ height: 29, fontSize: 13 }}
            >
              선택 해제
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--color-neutral-500)' }}>
              값을 누르면 바로 고칠 수 있어요 · 여러 개를 같이 바꾸려면 왼쪽 네모를 체크하세요
            </span>
            <button
              className="btn btn-secondary"
              onClick={() => dispatch({ type: 'OPEN_NEW_ROOM' })}
              style={{ height: 29, fontSize: 13 }}
            >
              + 객실 만들기
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
                title="전체 선택"
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
                  title={`${r.short} 선택`}
                />
              </div>

              <div style={{ padding: '7px 12px', borderRight: '1px solid var(--color-divider)', minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ fontWeight: 700, fontSize: 12.5 }}>{r.short}</span>
                  <span
                    style={{ fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 10, color: 'var(--color-neutral-400)' }}
                  >
                    {r.code}
                  </span>
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

              <EditableCell
                room={r}
                field="maxP"
                label="최대 인원"
                display={`기준 ${r.baseP} / 최대 ${r.maxP}`}
                own={r.paxOv}
                ghost={showAll && !r.paxOv ? '기준 2 / 최대 4' : undefined}
              />

              <EditableCell
                room={r}
                field="extra"
                label="추가인원 요금"
                display={`${fmtNum(r.extra)}원`}
                own={r.extraOv}
                ghost={showAll && !r.extraOv ? '30,000원' : undefined}
              />

              <EditableCell
                room={r}
                field="bbq"
                label="바베큐"
                display={r.bbq}
                own={r.bbqOv}
                ghost={showAll && !r.bbqOv ? '공용BBQ · 가스그릴' : undefined}
              />

              <div style={{ padding: '7px 12px', color: 'var(--color-neutral-600)' }} title="바베큐 종류를 고르면 따라옵니다">
                {r.bbqFee}
              </div>

              <EditableCell
                room={r}
                field="spa"
                label="스파"
                display={r.spa}
                own={r.spaOv}
                ghost={showAll && !r.spaOv ? '제트스파 2인용' : undefined}
              />

              <div style={{ padding: '7px 12px' }}>
                <span style={{ color: 'var(--color-neutral-800)' }}>{r.form}</span>{' '}
                <span style={{ color: 'var(--color-neutral-500)' }}>· {r.bed}</span>
              </div>

              <EditableCell room={r} field="facil" label="객실 비품" display={r.facil} own={false} />

              <div style={{ padding: '7px 12px', display: 'flex', gap: 3 }} title="판매 사이트에 나가는 값이 기준과 다른지">
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
