import { isOwnField } from '../../domain/blockValues';
import { canSplit, membersOf } from '../../domain/derive';
import type { Block } from '../../domain/types';
import { current, useStore } from '../../state/store';
import { Modal, ModalHead } from '../primitives';

/** 이 객실이 갈 수 있는 시설 목록 — 쓰는 중이면서, 멤버십을 고르거나 항목을 따로
 *  정할 수 있는 시설만. 나머지는 이 창에 올려 봐야 고를 게 없습니다. */
const relevant = (blocks: Block[]): Block[] =>
  blocks.filter((b) => b.st === 'used' && (b.memberOf || b.fields.some(([k]) => canSplit(b, k))));

/** 객실 표에서 "이 객실의 시설 설정으로" 들어가는 문. 시설이 여러 개면 고를 곳이
 *  필요하고, 골라야 어느 `BlockRoomsModal`을 열지 정해집니다. */
export const RoomFacilitiesModal = () => {
  const { state, dispatch } = useStore();
  const p = current(state);
  const code = state.roomFacilityPick;
  if (!code) return null;
  const r = p.rooms.find((x) => x.code === code);
  if (!r) return null;

  const blocks = relevant(p.blocks);

  return (
    <Modal width={420} onClose={() => dispatch({ type: 'CLOSE_ROOM_FACILITIES' })}>
      <ModalHead title={`${r.name} · 시설 설정`} sub="어느 시설의 이용 객실을 볼까요." />
      <div style={{ padding: '10px 12px 16px' }}>
        {blocks.length === 0 ? (
          <div style={{ padding: '14px 6px', fontSize: 12, color: 'var(--color-neutral-500)' }}>
            객실마다 다르게 정할 수 있는 시설이 이 숙소에 없습니다.
          </div>
        ) : (
          blocks.map((b) => {
            const isMember = b.memberOf ? membersOf(p, b).some((m) => m.code === r.code) : true;
            const ownFields = b.fields.filter(([k]) => canSplit(b, k) && isOwnField(r, b.key, k));
            return (
              <div
                key={b.key}
                onClick={() => dispatch({ type: 'OPEN_BLOCK_ROOMS', blockKey: b.key, focusCode: r.code })}
                className="hov-surface"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  padding: '9px 10px',
                  cursor: 'pointer',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 700 }}>{b.label}</span>
                <span style={{ fontSize: 11, color: 'var(--color-neutral-600)' }}>
                  {b.memberOf ? (isMember ? '이 객실이 씀' : '이 객실은 안 씀') : ''}
                  {ownFields.length ? `${b.memberOf ? ' · ' : ''}${ownFields.map(([k]) => `${k} 따로`).join(', ')}` : ''}
                </span>
              </div>
            );
          })
        )}
      </div>
    </Modal>
  );
};
