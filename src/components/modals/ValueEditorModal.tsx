import { OPTLIST } from '../../domain/catalog';
import { composeVal, digits } from '../../domain/fieldTypes';
import type { Parts } from '../../domain/types';
import { useStore } from '../../state/store';
import { Chip, Modal, ModalFoot, ModalHead, RadioRow, Seg, SegItem } from '../primitives';

const TAILS = ['', '오전 이용 불가', '퇴실일 이용 불가', '연박 시 별도 문의', '우천 시 이용 불가'];
const CMPS = ['', '이상', '이하', '미만', '초과'];
const UNITS = ['1박기준', '1회기준', '인원기준'];
const PAYS = ['현장결제', '사전결제', '없음'];

const subLabel = { fontSize: 11, color: 'var(--color-neutral-600)' } as const;

/** Every value is edited as its own format — time, money, tiered money, date range,
 *  integer with a comparator, or a pick from an option list. Free text is the last resort. */
export const ValueEditorModal = () => {
  const { state, dispatch } = useStore();
  const edit = state.edit;
  if (!edit) return null;

  const { type, p } = edit;
  const set = <K extends keyof Parts>(k: K, v: Parts[K]) => dispatch({ type: 'SET_PART', k, v: v as Parts[keyof Parts] });

  const t1 = p.h ? `${p.h}:${p.m}` : '15:30';
  const t2 = p.h2 ? `${p.h2}:${p.m2}` : '21:00';
  const onTime = (which: 'start' | 'end') => (value: string) => {
    const [h, m] = String(value || '00:00').split(':');
    if (which === 'start') {
      set('h', h);
      set('m', m);
    } else {
      set('h2', h);
      set('m2', m);
    }
  };

  const title = edit.kind === 'optfee' ? `${edit.o.label} 요금 고치기` : `${edit.bk.label} · ${edit.k}`;
  const sub =
    edit.kind === 'optfee'
      ? '이 바베큐 종류를 쓰는 모든 객실에 같이 적용됩니다'
      : `이 숙소 전체값 · 객실 ${edit.bk.rooms}개가 이 값을 씁니다`;

  /** Any qualifier already stored but missing from the catalogue is kept as its own chip. */
  const tailChoices = p.tail && !TAILS.includes(p.tail) ? [...TAILS, p.tail] : TAILS;

  return (
    <Modal width={460} onClose={() => dispatch({ type: 'CLOSE_EDIT' })}>
      <ModalHead title={title} sub={sub} />

      <div style={{ padding: '16px 18px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-neutral-700)', marginBottom: 7 }}>{edit.k}</div>

        {type === 'time' ? (
          <input
            className="input"
            type="time"
            value={t1}
            onChange={(e) => onTime('start')(e.target.value)}
            style={{ width: 150, minHeight: 34, fontSize: 13 }}
          />
        ) : null}

        {type === 'range' ? (
          <div>
            <div style={{ ...subLabel, marginBottom: 6 }}>언제부터</div>
            <Seg style={{ marginBottom: 11 }}>
              <SegItem
                label="입실 시각"
                padding="7px 13px"
                borderLeft={false}
                on={p.sm === 'checkin'}
                onClick={() => set('sm', 'checkin')}
              />
              <SegItem label="시각 지정" padding="7px 13px" on={p.sm !== 'checkin'} onClick={() => set('sm', 'time')} />
            </Seg>

            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              {p.sm === 'checkin' ? (
                <span
                  style={{
                    width: 140,
                    padding: '8px 10px',
                    border: '1px dashed var(--color-neutral-400)',
                    fontSize: 12.5,
                    color: 'var(--color-neutral-700)',
                    textAlign: 'center',
                  }}
                >
                  입실
                </span>
              ) : (
                <input
                  className="input"
                  type="time"
                  value={t1}
                  onChange={(e) => onTime('start')(e.target.value)}
                  style={{ width: 140, minHeight: 34, fontSize: 13 }}
                />
              )}
              <span style={{ fontSize: 14, color: 'var(--color-neutral-500)' }}>~</span>
              <input
                className="input"
                type="time"
                value={t2}
                onChange={(e) => onTime('end')(e.target.value)}
                style={{ width: 140, minHeight: 34, fontSize: 13 }}
              />
            </div>

            <div style={{ ...subLabel, margin: '12px 0 6px' }}>덧붙일 조건</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {tailChoices.map((t) => (
                <Chip
                  key={t || 'none'}
                  label={t || '조건 없음'}
                  on={(p.tail ?? '') === t}
                  onClick={() => set('tail', t)}
                />
              ))}
            </div>
          </div>
        ) : null}

        {type === 'daterange' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <input
              className="input"
              type="date"
              value={p.from ?? ''}
              onChange={(e) => set('from', e.target.value)}
              style={{ width: 170, minHeight: 34, fontSize: 13 }}
            />
            <span style={{ fontSize: 14, color: 'var(--color-neutral-500)' }}>~</span>
            <input
              className="input"
              type="date"
              value={p.to ?? ''}
              onChange={(e) => set('to', e.target.value)}
              style={{ width: 170, minHeight: 34, fontSize: 13 }}
            />
          </div>
        ) : null}

        {type.startsWith('dec:') ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--color-neutral-700)' }}>수심</span>
            <input
              className="input"
              type="number"
              step="0.1"
              value={p.d ?? 0}
              onChange={(e) => set('d', Number(e.target.value) || 0)}
              style={{ width: 120, minHeight: 34, fontSize: 13, textAlign: 'right' }}
            />
            <span style={{ fontSize: 13, color: 'var(--color-neutral-600)' }}>{type.split(':')[1]}</span>
          </div>
        ) : null}

        {type === 'money' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              className="input"
              type="number"
              value={p.amt ?? 0}
              onChange={(e) => set('amt', digits(e.target.value))}
              style={{ width: 180, minHeight: 34, fontSize: 13, textAlign: 'right' }}
            />
            <span style={{ fontSize: 13, color: 'var(--color-neutral-600)' }}>원</span>
            <span style={{ fontSize: 11, color: 'var(--color-neutral-500)' }}>0 = 무료</span>
          </div>
        ) : null}

        {type === 'tier' ? (
          <div>
            <Seg style={{ marginBottom: 12 }}>
              <SegItem
                label="1세트 정액"
                padding="7px 13px"
                borderLeft={false}
                on={p.mode === 'flat'}
                onClick={() => set('mode', 'flat')}
              />
              <SegItem
                label="인원 구간별"
                padding="7px 13px"
                on={p.mode === 'tier'}
                onClick={() => set('mode', 'tier')}
              />
            </Seg>

            {p.mode === 'flat' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--color-neutral-700)', width: 56 }}>1세트</span>
                <input
                  className="input"
                  type="number"
                  value={p.amt ?? 0}
                  onChange={(e) => set('amt', digits(e.target.value))}
                  style={{ width: 160, minHeight: 34, fontSize: 13, textAlign: 'right' }}
                />
                <span style={{ fontSize: 13, color: 'var(--color-neutral-600)' }}>원</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {(p.tiers ?? []).map((t, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input
                      className="input"
                      type="number"
                      value={t.a}
                      onChange={(e) => dispatch({ type: 'SET_TIER', i, k: 'a', v: e.target.value })}
                      style={{ width: 62, minHeight: 32, fontSize: 13, textAlign: 'right' }}
                    />
                    <span style={{ fontSize: 13, color: 'var(--color-neutral-500)' }}>~</span>
                    <input
                      className="input"
                      type="number"
                      value={t.b}
                      onChange={(e) => dispatch({ type: 'SET_TIER', i, k: 'b', v: e.target.value })}
                      style={{ width: 62, minHeight: 32, fontSize: 13, textAlign: 'right' }}
                    />
                    <span style={{ fontSize: 12, color: 'var(--color-neutral-700)' }}>인</span>
                    <input
                      className="input"
                      type="number"
                      value={t.amt}
                      onChange={(e) => dispatch({ type: 'SET_TIER', i, k: 'amt', v: e.target.value })}
                      style={{ flex: 1, minHeight: 32, fontSize: 13, textAlign: 'right' }}
                    />
                    <span style={{ fontSize: 12, color: 'var(--color-neutral-700)' }}>원</span>
                    <button
                      className="btn btn-secondary"
                      onClick={() => dispatch({ type: 'DEL_TIER', i })}
                      style={{ flex: 'none', height: 26, padding: '0 8px', fontSize: 11 }}
                    >
                      삭제
                    </button>
                  </div>
                ))}
                <button
                  className="btn btn-secondary"
                  onClick={() => dispatch({ type: 'ADD_TIER' })}
                  style={{ alignSelf: 'flex-start', height: 28, fontSize: 12 }}
                >
                  + 구간 넣기
                </button>
              </div>
            )}

            <div style={{ ...subLabel, margin: '13px 0 6px' }}>얼마 기준</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {UNITS.map((u) => (
                <Chip key={u} label={u} on={p.unit === u} onClick={() => set('unit', u)} />
              ))}
            </div>

            <div style={{ ...subLabel, margin: '11px 0 6px' }}>어디서 냄</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {PAYS.map((u) => (
                <Chip key={u} label={u} on={p.pay === u} onClick={() => set('pay', u)} />
              ))}
            </div>
          </div>
        ) : null}

        {type.startsWith('opt:') ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {(OPTLIST[type.split(':')[1]] ?? []).map((o) => (
              <RadioRow key={o} label={o} padding="9px 12px" on={p.v === o} onClick={() => set('v', o)} />
            ))}
          </div>
        ) : null}

        {type.startsWith('int:') ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              className="input"
              type="number"
              value={p.n ?? 0}
              onChange={(e) => set('n', digits(e.target.value))}
              style={{ width: 120, minHeight: 34, fontSize: 13, textAlign: 'right' }}
            />
            <span style={{ fontSize: 13, color: 'var(--color-neutral-600)' }}>{type.split(':')[1]}</span>
            <div style={{ display: 'flex', gap: 6, marginLeft: 6 }}>
              {CMPS.map((c) => (
                <Chip
                  key={c || 'eq'}
                  label={c || '정확히'}
                  padding="6px 10px"
                  on={(p.cmp ?? '') === c}
                  onClick={() => set('cmp', c)}
                />
              ))}
            </div>
          </div>
        ) : null}

        {type === 'text' ? (
          <>
            {/* A rule's text slot holds one proper noun (상호명·지명) — a line, not a paragraph. */}
            <input
              className="input"
              value={p.v ?? ''}
              onChange={(e) => set('v', e.target.value)}
              style={{ minHeight: 34, fontSize: 13 }}
            />
            <div style={{ marginTop: 6, fontSize: 11, color: 'var(--color-neutral-500)', lineHeight: 1.6 }}>
              {edit.kind === 'rule'
                ? '목록으로 만들 수 없는 고유명사(상호명·지명)만 직접 입력합니다. 문장의 나머지와 숫자·시각은 규칙이 생성합니다.'
                : '주소처럼 숫자가 문장에 섞이지 않는 값만 자유 입력입니다. 나머지 값은 모두 시간·금액·옵션 형식으로 관리됩니다.'}
            </div>
          </>
        ) : null}

        <div style={{ marginTop: 13, padding: '9px 11px', background: 'var(--color-surface)', fontSize: 12 }}>
          <span style={{ color: 'var(--color-neutral-600)', fontSize: 11 }}>이렇게 저장돼요 </span>
          <b>{composeVal(type, p)}</b>
        </div>
      </div>

      <ModalFoot>
        <button className="btn btn-secondary" onClick={() => dispatch({ type: 'CLOSE_EDIT' })} style={{ height: 32 }}>
          그만두기
        </button>
        <button className="btn btn-primary" onClick={() => dispatch({ type: 'PREVIEW_EDIT' })} style={{ height: 32 }}>
          바꾸기
        </button>
      </ModalFoot>
    </Modal>
  );
};
