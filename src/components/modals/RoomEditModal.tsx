import { current, useStore } from '../../state/store';
import { Modal, ModalFoot, ModalHead } from '../primitives';
import { RoomInfoFields } from './RoomInfoFields';

/** 만든 뒤에도 객실 정보를 고칠 수 있어야 합니다. 층이 틀린 채로 등록되면
 *  그 객실을 쓰는 시설의 "이용 객실" 문구가 계속 틀린 층을 말합니다. */
export const RoomEditModal = () => {
  const { state, dispatch } = useStore();
  const p = current(state);
  if (!state.re) return null;
  const re = state.re;

  return (
    <Modal
      width={520}
      panelStyle={{ maxHeight: 'calc(100vh - 60px)', display: 'flex', flexDirection: 'column' }}
      onClose={() => dispatch({ type: 'CLOSE_ROOM_EDIT' })}
    >
      <ModalHead title={`${re.name} 정보 수정`} sub={`객실코드 ${re.code} · 인원·시설 값은 객실 표에서 바로 고칩니다.`} />

      <div style={{ padding: '16px 18px', overflowY: 'auto', minHeight: 0 }}>
        <RoomInfoFields
          p={p}
          value={re}
          floorText={re.floorText}
          onChange={(patch) => dispatch({ type: 'SET_RE', patch })}
          onFloorText={(v) => dispatch({ type: 'SET_RE', patch: { floorText: v } })}
        />
      </div>

      <ModalFoot hint="층을 바꾸면 시설 안내문의 이용 객실이 다시 계산됩니다.">
        <button
          className="btn btn-secondary"
          onClick={() => dispatch({ type: 'OPEN_NEW_ROOM', from: re.code })}
          style={{ height: 32 }}
          title="이 객실의 값·구조·침구를 그대로 가져와 새 객실을 만듭니다"
        >
          복제해서 새로 만들기
        </button>
        <button className="btn btn-secondary" onClick={() => dispatch({ type: 'CLOSE_ROOM_EDIT' })} style={{ height: 32 }}>
          그만두기
        </button>
        <button className="btn btn-primary" onClick={() => dispatch({ type: 'PREVIEW_ROOM_EDIT' })} style={{ height: 32 }}>
          수정
        </button>
      </ModalFoot>
    </Modal>
  );
};
