import { baseValue, fieldValueOf } from '../../domain/blockValues';
import { membersOf } from '../../domain/derive';
import type { Room } from '../../domain/types';
import { current, useStore } from '../../state/store';
import { Chip, Modal, ModalFoot, ModalHead } from '../primitives';

/** 시설 항목 하나를 객실마다 다르게 정합니다.
 *
 *  시설이 기본, 객실이 예외입니다 — 객실 값을 고칠 때와 **같은 규칙**입니다. 그래서 창도
 *  같은 모양입니다: 왼쪽에서 객실을 고르고, 아래 버튼으로 값을 넣습니다. 지금 값이 같은
 *  객실끼리 묶여 보이므로, "17시부터 쓰는 22실 중 7층 4실만 15시로" 같은 일이 두 번
 *  클릭으로 끝납니다. */
export const BlockFieldModal = () => {
  const { state, dispatch } = useStore();
  const p = current(state);
  const bf = state.bf;
  if (!bf) return null;
  const b = p.blocks.find((x) => x.key === bf.blockKey);
  if (!b) return null;

  const base = baseValue(b, bf.fieldKey);
  const scope: Room[] = b.memberOf ? membersOf(p, b) : p.rooms;
  const floors = [...new Set(scope.map((r) => r.floor))].sort((a, b2) => a - b2);
  const picked = scope.filter((r) => bf.sel.includes(r.code));
  /** 지금 값으로 묶어서 보여 줍니다 — 28실을 한 줄씩 읽지 않아도 무엇이 갈려 있는지 보입니다. */
  const groups = [...new Set(scope.map((r) => fieldValueOf(b, r, bf.fieldKey)))];
  const ownN = scope.filter((r) => fieldValueOf(b, r, bf.fieldKey) !== base).length;

  return (
    <Modal
      width={620}
      panelStyle={{ maxHeight: 'calc(100vh - 48px)', display: 'flex', flexDirection: 'column' }}
      onClose={() => dispatch({ type: 'CLOSE_BLOCK_FIELD' })}
    >
      <ModalHead
        title={`${b.label} · ${bf.fieldKey}`}
        sub={`시설 값은 "${base}"입니다. 여기서 고른 객실만 다른 값을 갖고, 나머지는 시설 값을 그대로 씁니다.`}
      />

      <div style={{ padding: '14px 18px', overflowY: 'auto', minHeight: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
          <span style={{ fontSize: 11, color: 'var(--color-neutral-600)', marginRight: 2 }}>층으로 고르기</span>
          {floors.map((f) => (
            <Chip key={f} label={`${f}층`} padding="5px 10px" on={false} onClick={() => dispatch({ type: 'BF_TOGGLE_FLOOR', floor: f })} />
          ))}
          <span style={{ fontSize: 11, color: 'var(--color-neutral-600)', margin: '0 2px 0 8px' }}>같은 값끼리</span>
          {groups.map((v) => (
            <Chip key={v} label={v} padding="5px 10px" on={false} onClick={() => dispatch({ type: 'BF_SELECT_SAME', value: v })} />
          ))}
        </div>

        <div style={{ border: '1px solid var(--color-divider)', background: 'var(--color-bg)' }}>
          {scope.map((r) => {
            const v = fieldValueOf(b, r, bf.fieldKey);
            const own = v !== base;
            const on = bf.sel.includes(r.code);
            return (
              <div
                key={r.code}
                onClick={() => dispatch({ type: 'BF_TOGGLE_ROOM', code: r.code })}
                className="hov-surface"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 9,
                  padding: '7px 11px',
                  borderBottom: '1px solid var(--color-divider)',
                  cursor: 'pointer',
                  background: on ? 'var(--color-accent-100)' : undefined,
                }}
              >
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

      <ModalFoot
        hint={
          <span style={{ fontSize: 11.5, color: 'var(--color-neutral-600)' }}>
            고른 객실 <b>{picked.length}</b>개 · 지금 따로 정해둔 객실 {ownN}개
          </span>
        }
      >
        <button className="btn btn-secondary" onClick={() => dispatch({ type: 'CLOSE_BLOCK_FIELD' })} style={{ height: 32 }}>
          그만두기
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => dispatch({ type: 'BF_RESET_PICKED' })}
          disabled={!picked.length}
          style={{ height: 32 }}
        >
          시설 값으로 되돌리기
        </button>
        <button
          className="btn btn-primary"
          onClick={() => dispatch({ type: 'BF_EDIT_PICKED' })}
          disabled={!picked.length}
          style={{ height: 32 }}
        >
          고른 객실 값 정하기
        </button>
      </ModalFoot>
    </Modal>
  );
};
