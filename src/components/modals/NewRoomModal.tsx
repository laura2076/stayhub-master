import { OPTIONS } from '../../domain/catalog';
import { useStore } from '../../state/store';
import { Chip, Modal, ModalFoot, ModalHead, RadioRow } from '../primitives';

const FLOORS = ['3', '4', '5', '6', '7'];
const PAX: ['2/4' | '4/6', string][] = [
  ['2/4', '기준 2 / 최대 4 (숙소 기본값)'],
  ['4/6', '기준 4 / 최대 6 (오버라이드)'],
];

const label = { fontSize: 11, fontWeight: 700, color: 'var(--color-neutral-700)', marginBottom: 7 } as const;

export const NewRoomModal = () => {
  const { state, dispatch } = useStore();
  if (!state.nr) return null;
  const nr = state.nr;

  return (
    <Modal width={520} onClose={() => dispatch({ type: 'CLOSE_NEW_ROOM' })}>
      <ModalHead title="객실 신규 등록" sub="값을 지정하지 않은 항목은 숙소 기본값을 상속합니다." />

      <div style={{ padding: '16px 18px' }}>
        <div className="field" style={{ marginBottom: 14 }}>
          <label>객실명</label>
          <input
            className="input"
            value={nr.name}
            onChange={(e) => dispatch({ type: 'SET_NR', k: 'name', v: e.target.value })}
            style={{ minHeight: 32, fontSize: 13 }}
          />
        </div>

        <div style={label}>층</div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          {FLOORS.map((f) => (
            <Chip
              key={f}
              label={`${f}층`}
              padding="7px 13px"
              on={nr.floor === f}
              onClick={() => dispatch({ type: 'SET_NR', k: 'floor', v: f })}
            />
          ))}
        </div>

        <div style={label}>수용 인원</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
          {PAX.map(([v, text]) => (
            <RadioRow
              key={v}
              label={text}
              padding="9px 12px"
              on={nr.pax === v}
              onClick={() => dispatch({ type: 'SET_NR', k: 'pax', v })}
            />
          ))}
        </div>

        <div style={label}>바베큐</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {OPTIONS.map((o) => (
            <RadioRow
              key={o.code}
              label={`${o.label} · ${state.optFees[o.code]}`}
              padding="9px 12px"
              on={nr.bbq === o.label}
              onClick={() => dispatch({ type: 'SET_NR', k: 'bbq', v: o.label })}
            />
          ))}
        </div>
      </div>

      <ModalFoot hint="등록 시 블록 문구·객실 수·채널 상품이 함께 생성됩니다.">
        <button className="btn btn-secondary" onClick={() => dispatch({ type: 'CLOSE_NEW_ROOM' })} style={{ height: 32 }}>
          취소
        </button>
        <button className="btn btn-primary" onClick={() => dispatch({ type: 'PREVIEW_NEW_ROOM' })} style={{ height: 32 }}>
          연쇄 갱신 미리보기
        </button>
      </ModalFoot>
    </Modal>
  );
};
