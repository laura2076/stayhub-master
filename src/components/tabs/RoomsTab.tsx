import { attrsOf, feeOf, isOwn, showValue, valueOf } from '../../domain/attrs';
import type { AttrDef, Property, Room } from '../../domain/types';
import { current, useStore } from '../../state/store';
import { CellPicker, type PickerMode } from '../CellPicker';
import { Chip, Th } from '../primitives';

/** 표의 열은 이 숙소가 쓰는 속성에서 만들어집니다 — 코드에 박힌 열은
 *  체크박스·객실·구조·판매 사이트 넷뿐입니다. 그래서 바베큐가 없고 캠핑장만
 *  있는 숙소도, 수영장만 있는 숙소도 같은 화면이 그대로 그립니다. */
const cols = (defs: AttrDef[]): string =>
  ['36px', '236px', ...defs.map((d) => `${d.width ?? 130}px`), '150px'].join(' ');

/** 값을 어떻게 고치는지는 속성의 종류가 정합니다.
 *  인원·요금처럼 끝이 없는 값은 목록으로 만들 수 없어서 숫자로 직접 칩니다. */
const modeOf = (p: Property, d: AttrDef): PickerMode => {
  if (d.kind === 'int') return { kind: 'number', unit: d.unit, min: d.min, max: d.max };
  if (d.kind === 'money') return { kind: 'number', unit: '원', min: 0, money: true };
  return {
    kind: 'options',
    options: d.options.map((o) => ({
      value: o.code,
      label: o.label,
      note: [p.defaults[d.key] === o.code ? '전체와 같음' : '', d.feeBearing ? feeOf(p, d.key, o.code) : '']
        .filter((x) => x && x !== '—')
        .join(' · '),
    })),
  };
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

const Sub = ({ children }: { children: string }) => (
  <div
    title={children}
    style={{
      fontSize: 10,
      color: 'var(--color-neutral-400)',
      marginTop: 2,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    }}
  >
    {children}
  </div>
);

/** 표 안에서는 금액만 봅니다. "(1박기준/현장결제)"까지 넣으면 줄이 세 줄로 늘어나
 *  객실 목록을 훑을 수 없게 됩니다 — 조건은 요금표 탭에 그대로 있습니다. */
const shortFee = (fee: string): string => fee.replace(/\s*\([^)]*\)\s*$/, '');

/** 눌러서 고칠 수 있는 칸. 눌러야 하는 곳임이 보이도록 hover 배경을 줍니다. */
const AttrCell = ({ p, room, def, ghost }: { p: Property; room: Room; def: AttrDef; ghost: boolean }) => {
  const { dispatch } = useStore();
  const v = valueOf(p, room, def.key);
  const own = isOwn(room, def.key) && v !== p.defaults[def.key];
  /** 요금은 객실이 아니라 선택지에 붙습니다 — 값 밑에 따라오는 결과로 보여 줍니다. */
  const fee = def.kind === 'option' && def.feeBearing ? feeOf(p, def.key, v) : '—';
  /** 같은 값을 쓰는 객실 수 — "공용BBQ 22실 전부 숯불로"가 두 번 클릭이 됩니다. */
  const sameN = p.rooms.filter((r) => valueOf(p, r, def.key) === v).length;

  return (
    <CellPicker
      label={def.label}
      className="hov-accent"
      cellStyle={{ padding: '7px 12px', minWidth: 0 }}
      mode={modeOf(p, def)}
      current={v}
      onPick={(value) => dispatch({ type: 'PICK_CELL', code: room.code, attr: def.key, value })}
      alsoLabel={sameN > 1 ? `이 값을 쓰는 객실 ${sameN}개 모두 고르기` : undefined}
      onAlso={() => dispatch({ type: 'SELECT_BY_VALUE', attr: def.key, value: v })}
    >
      <Value v={showValue(def.key, v)} own={own} />
      {fee !== '—' ? <Sub>{shortFee(fee)}</Sub> : null}
      {ghost && !own ? <Sub>{`전체 ${showValue(def.key, p.defaults[def.key])}`}</Sub> : null}
    </CellPicker>
  );
};

export const RoomsTab = () => {
  const { state, dispatch } = useStore();
  const p = current(state);
  const defs = attrsOf(p);
  const grid = cols(defs);
  const ghost = state.settings.inheritanceViz === 'ghost';

  const own = (r: Room) => defs.some((d) => isOwn(r, d.key) && r.values[d.key] !== p.defaults[d.key]);
  const query = state.q.trim();

  const rows: Room[] = p.rooms
    .filter((r) => (query ? `${r.name}${r.code}${r.tag}`.includes(query) : true))
    .filter((r) => (state.onlyOwn ? own(r) : true))
    .slice()
    /** 층순 고정. 정렬 세 가지를 두었더니 조작만 늘고 층순 말고는 거의 안 쓰였습니다. */
    .sort((a, b) => a.floor - b.floor || a.name.localeCompare(b.name));

  const ownCount = p.rooms.filter(own).length;
  const hasSel = state.sel.length > 0;
  const floors = [...new Set(p.rooms.map((r) => r.floor))].sort((a, b) => a - b);

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
        <div
          onClick={() => dispatch({ type: 'TOGGLE_ONLY_OWN' })}
          className={state.onlyOwn ? undefined : 'hov-neutral'}
          title="파란 표시가 붙은 객실만 남깁니다"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: '3px 8px',
            cursor: 'pointer',
            fontSize: 11.5,
            border: `1px solid ${state.onlyOwn ? 'var(--color-accent)' : 'var(--color-divider)'}`,
            background: state.onlyOwn ? 'var(--color-accent-100)' : 'var(--color-bg)',
            color: state.onlyOwn ? 'var(--color-accent-800)' : 'var(--color-neutral-700)',
            fontWeight: state.onlyOwn ? 700 : 400,
          }}
        >
          <OwnMark />따로 정한 것만 보기
        </div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: 'var(--color-neutral-700)' }}>
          <span style={{ width: 11, height: 0, borderTop: '1px dashed var(--color-neutral-400)' }} />
          전체와 같음
        </span>
        <div style={{ flex: 1 }} />
        {hasSel ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, animation: 'fin .16s ease' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-accent-800)' }}>
              {state.sel.length}개 선택됨
            </span>
            <button className="btn btn-primary" onClick={() => dispatch({ type: 'OPEN_BULK' })} style={{ height: 29, fontSize: 13 }}>
              한꺼번에 바꾸기
            </button>
            <button className="btn btn-secondary" onClick={() => dispatch({ type: 'PREVIEW_DELETE' })} style={{ height: 29, fontSize: 13 }}>
              지우기
            </button>
            <button className="btn btn-secondary" onClick={() => dispatch({ type: 'CLEAR_SEL' })} style={{ height: 29, fontSize: 13 }}>
              선택 해제
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--color-neutral-500)' }}>값을 누르면 바로 고칠 수 있어요</span>
            <button className="btn btn-secondary" onClick={() => dispatch({ type: 'OPEN_NEW_ROOM' })} style={{ height: 29, fontSize: 13 }}>
              + 객실 만들기
            </button>
          </div>
        )}
      </div>

      {/* 층으로 고르기 — 직원은 "3층은 개별바베큐" 식으로 생각합니다.
          체크박스를 6번 누르는 대신 층 하나를 누릅니다. */}
      <div
        style={{
          flex: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '7px 20px',
          background: 'var(--color-bg)',
          borderBottom: '1px solid var(--color-divider)',
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontSize: 11, color: 'var(--color-neutral-500)', marginRight: 2 }}>골라서 한꺼번에 바꾸기</span>
        {floors.map((f) => {
          const codes = p.rooms.filter((r) => r.floor === f).map((r) => r.code);
          const on = codes.every((c) => state.sel.includes(c));
          return (
            <Chip
              key={f}
              label={`${f}층 ${codes.length}`}
              padding="4px 10px"
              on={on}
              onClick={() => dispatch({ type: 'SELECT_FLOOR', floor: f })}
            />
          );
        })}
        {ownCount ? (
          <Chip
            label={`따로 정한 ${ownCount}`}
            padding="4px 10px"
            tone="ink"
            on={p.rooms.filter(own).every((r) => state.sel.includes(r.code))}
            onClick={() => dispatch({ type: 'SELECT_OWN' })}
          />
        ) : null}
        <span style={{ fontSize: 10.5, color: 'var(--color-neutral-400)' }}>
          · 값 칸을 누르면 "같은 값 쓰는 객실 모두 고르기"도 있어요
        </span>
      </div>

      <div style={{ flex: 1, overflow: 'auto', background: 'var(--color-bg)' }}>
        <div style={{ minWidth: 464 + defs.reduce((n, d) => n + (d.width ?? 130), 0) }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: grid,
              position: 'sticky',
              top: 0,
              zIndex: 2,
              background: 'var(--color-surface)',
              borderBottom: '1px solid var(--color-divider)',
            }}
          >
            <div style={{ padding: '8px 0 8px 13px', position: 'sticky', left: 0, zIndex: 1, background: 'var(--color-surface)' }}>
              <input
                type="checkbox"
                checked={state.sel.length === p.rooms.length && p.rooms.length > 0}
                onChange={() => dispatch({ type: 'TOGGLE_ALL' })}
                style={{ cursor: 'pointer' }}
                title="전체 선택"
              />
            </div>
            <Th style={{ borderRight: '1px solid var(--color-divider)', position: 'sticky', left: 36, zIndex: 1, background: 'var(--color-surface)' }}>
              객실
            </Th>
            {defs.map((d) => (
              <Th key={d.key} style={d.hint ? { cursor: 'help' } : undefined}>
                <span title={d.hint}>{d.label}</span>
              </Th>
            ))}
            <Th>구조 · 침구</Th>
          </div>

          {rows.map((r) => (
            <div
              key={r.code}
              className="row"
              style={{ display: 'grid', gridTemplateColumns: grid, borderBottom: '1px solid var(--color-divider)', fontSize: 12 }}
            >
              <div style={{ padding: '8px 0 0 13px', position: 'sticky', left: 0, zIndex: 1, background: 'var(--color-bg)' }}>
                <input
                  type="checkbox"
                  checked={state.sel.includes(r.code)}
                  onChange={() => dispatch({ type: 'TOGGLE_ROOM', code: r.code })}
                  style={{ cursor: 'pointer' }}
                  title={`${r.name} 선택`}
                />
              </div>

              <div
                style={{
                  padding: '7px 12px',
                  borderRight: '1px solid var(--color-divider)',
                  minWidth: 0,
                  position: 'sticky',
                  left: 36,
                  zIndex: 1,
                  background: 'var(--color-bg)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ fontWeight: 700, fontSize: 12.5 }}>{r.name}</span>
                  <span style={{ fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 10, color: 'var(--color-neutral-400)' }}>
                    {r.code}
                  </span>
                  <span className="row-actions" style={{ marginLeft: 'auto', display: 'flex', gap: 3 }}>
                    <button
                      className="btn btn-secondary"
                      onClick={() => dispatch({ type: 'OPEN_ROOM_EDIT', code: r.code })}
                      style={{ height: 20, padding: '0 6px', fontSize: 10.5 }}
                      title="객실명 · 층 · 면적 · 구조 · 침구 고치기"
                    >
                      정보
                    </button>
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

              {defs.map((d) => (
                <AttrCell key={d.key} p={p} room={r} def={d} ghost={ghost} />
              ))}

              <div style={{ padding: '7px 12px' }}>
                <span style={{ color: 'var(--color-neutral-800)' }}>{r.form}</span>{' '}
                <span style={{ color: 'var(--color-neutral-500)' }}>· {r.bed}</span>
              </div>


            </div>
          ))}

          {rows.length === 0 ? (
            <div style={{ padding: '28px 16px', fontSize: 12, color: 'var(--color-neutral-500)' }}>
              {state.onlyOwn ? '따로 정한 객실이 없습니다.' : `"${query}"에 맞는 객실이 없습니다.`}
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
};
