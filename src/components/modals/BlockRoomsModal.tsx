import { attrOption } from '../../domain/attrs';
import { baseValue, fieldValueOf } from '../../domain/blockValues';
import { canSplit, membersOf, showRoomValue } from '../../domain/derive';
import type { Room } from '../../domain/types';
import { current, useStore } from '../../state/store';
import { Chip, Modal, ModalFoot, ModalHead, Seg, SegItem } from '../primitives';

const rowStyle = (on: boolean, focus: boolean) =>
  ({
    display: 'flex',
    alignItems: 'center',
    gap: 9,
    padding: '7px 11px',
    borderBottom: '1px solid var(--color-divider)',
    cursor: 'pointer',
    background: focus ? 'var(--color-accent-200)' : on ? 'var(--color-accent-100)' : undefined,
  }) as const;

/** 시설의 "이용 객실"을 고치는 한 창.
 *
 *  두 가지 조작이 여기 모입니다 — 이 시설을 어느 객실이 쓰는지(멤버십), 그리고 항목
 *  하나를 어느 객실만 다르게 정할지(예외). 둘 다 "시설 카드에서 객실을 고른다"는
 *  같은 동작이라 창을 둘로 나누면 오히려 헷갈립니다. 둘 다 있는 시설만 탭이 보이고,
 *  하나만 있으면(멤버십 없는 공용 수영장, 혹은 갈릴 항목이 없는 시설) 그 화면만 나갑니다. */
export const BlockRoomsModal = () => {
  const { state, dispatch } = useStore();
  const p = current(state);
  const br = state.br;
  if (!br) return null;
  const b = p.blocks.find((x) => x.key === br.blockKey);
  if (!b) return null;

  const splittable = b.fields.filter(([k]) => canSplit(b, k)).map(([k]) => k);
  const showTabs = !!b.memberOf && splittable.length > 0;
  const tab = b.memberOf ? br.tab : 'fields';

  return (
    <Modal
      width={640}
      panelStyle={{ maxHeight: 'calc(100vh - 48px)', display: 'flex', flexDirection: 'column' }}
      onClose={() => dispatch({ type: 'CLOSE_BLOCK_ROOMS' })}
    >
      <ModalHead
        title={`${b.label} · 이용 객실`}
        sub={tab === 'members' ? '이 시설을 어느 객실이 쓰는지 고릅니다.' : '항목 하나를 어느 객실만 다르게 정할지 고릅니다.'}
      />

      {showTabs ? (
        <div style={{ padding: '12px 18px 0' }}>
          <Seg>
            <SegItem label="쓰는 객실" padding="7px 13px" borderLeft={false} on={tab === 'members'} onClick={() => dispatch({ type: 'BR_SET_TAB', tab: 'members' })} />
            <SegItem label="항목별 값" padding="7px 13px" on={tab === 'fields'} onClick={() => dispatch({ type: 'BR_SET_TAB', tab: 'fields' })} />
          </Seg>
        </div>
      ) : null}

      {tab === 'members' ? <MembersPane blockKey={b.key} /> : <FieldsPane blockKey={b.key} splittable={splittable} />}
    </Modal>
  );
};

const MembersPane = ({ blockKey }: { blockKey: string }) => {
  const { state, dispatch } = useStore();
  const p = current(state);
  const br = state.br!;
  const b = p.blocks.find((x) => x.key === blockKey)!;
  const attr = b.memberOf!.attr;
  const applyCode = b.memberOf!.codes[0];
  const floors = [...new Set(p.rooms.map((r) => r.floor))].sort((a, b2) => a - b2);
  const current0 = membersOf(p, b).map((r) => r.code);

  return (
    <>
      <div style={{ padding: '14px 18px', overflowY: 'auto', minHeight: 0 }}>
        <div style={{ fontSize: 11.5, color: 'var(--color-neutral-600)', marginBottom: 10 }}>
          체크한 객실이 최종 목록입니다. 새로 체크하는 객실은 "{attrOption(attr, applyCode)?.label ?? applyCode}" 값을 받고,
          체크를 푸는 객실은 값이 비워집니다.
        </div>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
          <span style={{ fontSize: 11, color: 'var(--color-neutral-600)', marginRight: 2 }}>층으로 고르기</span>
          {floors.map((f) => (
            <Chip key={f} label={`${f}층`} padding="5px 10px" on={false} onClick={() => dispatch({ type: 'BR_TOGGLE_FLOOR', floor: f })} />
          ))}
        </div>

        <div style={{ border: '1px solid var(--color-divider)', background: 'var(--color-bg)' }}>
          {p.rooms.map((r) => {
            const on = br.memberSel.includes(r.code);
            const wasMember = current0.includes(r.code);
            const focus = br.focusCode === r.code;
            return (
              <div key={r.code} onClick={() => dispatch({ type: 'BR_TOGGLE_ROOM', code: r.code })} className="hov-surface" style={rowStyle(on, focus)}>
                <input type="checkbox" checked={on} readOnly style={{ pointerEvents: 'none' }} />
                <span style={{ width: 96, fontSize: 12, fontWeight: 700 }}>{r.name}</span>
                <span style={{ width: 44, fontSize: 11, color: 'var(--color-neutral-600)' }}>{r.floor}층</span>
                <span style={{ flex: 1, fontSize: 12, color: wasMember ? 'var(--color-text)' : 'var(--color-neutral-500)' }}>
                  {showRoomValue(p, r, attr)}
                </span>
                {wasMember && !on ? <span className="tag tag-outline" style={{ fontSize: 10 }}>빠짐</span> : null}
                {!wasMember && on ? <span className="tag tag-accent" style={{ fontSize: 10 }}>새로 들어옴</span> : null}
              </div>
            );
          })}
        </div>
      </div>

      <ModalFoot hint={<span style={{ fontSize: 11.5, color: 'var(--color-neutral-600)' }}>고른 객실 <b>{br.memberSel.length}</b>개 · 지금 {current0.length}개</span>}>
        <button className="btn btn-secondary" onClick={() => dispatch({ type: 'CLOSE_BLOCK_ROOMS' })} style={{ height: 32 }}>
          그만두기
        </button>
        <button className="btn btn-primary" onClick={() => dispatch({ type: 'BR_APPLY_MEMBERS' })} style={{ height: 32 }}>
          이 목록으로 정하기
        </button>
      </ModalFoot>
    </>
  );
};

const FieldsPane = ({ blockKey, splittable }: { blockKey: string; splittable: string[] }) => {
  const { state, dispatch } = useStore();
  const p = current(state);
  const br = state.br!;
  const b = p.blocks.find((x) => x.key === blockKey)!;
  const base = baseValue(b, br.fieldKey);
  const scope: Room[] = b.memberOf ? membersOf(p, b) : p.rooms;
  const floors = [...new Set(scope.map((r) => r.floor))].sort((a, b2) => a - b2);
  const groups = [...new Set(scope.map((r) => fieldValueOf(b, r, br.fieldKey)))];
  const ownN = scope.filter((r) => fieldValueOf(b, r, br.fieldKey) !== base).length;

  return (
    <>
      <div style={{ padding: '14px 18px', overflowY: 'auto', minHeight: 0 }}>
        {splittable.length > 1 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
            {splittable.map((k) => (
              <Chip key={k} label={k} tone="ink" padding="6px 11px" on={br.fieldKey === k} onClick={() => dispatch({ type: 'BR_SET_FIELD', fieldKey: k })} />
            ))}
          </div>
        ) : null}

        <div style={{ fontSize: 11.5, color: 'var(--color-neutral-600)', marginBottom: 10 }}>
          시설 값은 "{base}"입니다. 여기서 고른 객실만 다른 값을 갖고, 나머지는 시설 값을 그대로 씁니다.
        </div>

        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
          <span style={{ fontSize: 11, color: 'var(--color-neutral-600)', marginRight: 2 }}>층으로 고르기</span>
          {floors.map((f) => (
            <Chip key={f} label={`${f}층`} padding="5px 10px" on={false} onClick={() => dispatch({ type: 'BR_TOGGLE_FLOOR', floor: f })} />
          ))}
          <span style={{ fontSize: 11, color: 'var(--color-neutral-600)', margin: '0 2px 0 8px' }}>같은 값끼리</span>
          {groups.map((v) => (
            <Chip key={v} label={v} padding="5px 10px" on={false} onClick={() => dispatch({ type: 'BR_SELECT_SAME', value: v })} />
          ))}
        </div>

        <div style={{ border: '1px solid var(--color-divider)', background: 'var(--color-bg)' }}>
          {scope.map((r) => {
            const v = fieldValueOf(b, r, br.fieldKey);
            const own = v !== base;
            const on = br.fieldSel.includes(r.code);
            const focus = br.focusCode === r.code;
            return (
              <div key={r.code} onClick={() => dispatch({ type: 'BR_TOGGLE_ROOM', code: r.code })} className="hov-surface" style={rowStyle(on, focus)}>
                <input type="checkbox" checked={on} readOnly style={{ pointerEvents: 'none' }} />
                <span style={{ width: 96, fontSize: 12, fontWeight: 700 }}>{r.name}</span>
                <span style={{ width: 44, fontSize: 11, color: 'var(--color-neutral-600)' }}>{r.floor}층</span>
                <span style={{ flex: 1, fontSize: 12, color: own ? 'var(--color-text)' : 'var(--color-neutral-600)' }}>{v}</span>
                {own ? <span className="tag tag-accent" style={{ fontSize: 10 }}>따로 정함</span> : null}
              </div>
            );
          })}
        </div>
      </div>

      <ModalFoot hint={<span style={{ fontSize: 11.5, color: 'var(--color-neutral-600)' }}>고른 객실 <b>{br.fieldSel.length}</b>개 · 지금 따로 정해둔 객실 {ownN}개</span>}>
        <button className="btn btn-secondary" onClick={() => dispatch({ type: 'CLOSE_BLOCK_ROOMS' })} style={{ height: 32 }}>
          그만두기
        </button>
        <button className="btn btn-secondary" onClick={() => dispatch({ type: 'BR_RESET_PICKED' })} disabled={!br.fieldSel.length} style={{ height: 32 }}>
          시설 값으로 되돌리기
        </button>
        <button className="btn btn-primary" onClick={() => dispatch({ type: 'BR_EDIT_PICKED' })} disabled={!br.fieldSel.length} style={{ height: 32 }}>
          고른 객실 값 정하기
        </button>
      </ModalFoot>
    </>
  );
};
