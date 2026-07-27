import { useState } from 'react';
import { willSentence } from '../../domain/summary';
import { useStore } from '../../state/store';
import { Modal } from '../primitives';

const ellipsis = {
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
} as const;

/** 되돌리기로 못 되살리는 변경에만 뜨는 확인 창.
 *  맨 위는 한 문장 — 표는 접어 두고, 고를 것이 있을 때만 펼칩니다. */
export const CascadeModal = () => {
  const { state, dispatch } = useStore();
  const cas = state.cas;
  const [openDetail, setOpenDetail] = useState(false);
  if (!cas) return null;

  const totalN = cas.groups.reduce((a, g) => a + g.items.length, 0);
  const checkedN = cas.groups.reduce((a, g) => a + g.items.filter((i) => i.on).length, 0);
  /** 체크를 풀 수 있는 줄이 있으면 표를 처음부터 펼쳐 둡니다 — 고를 게 있으니까요. */
  const hasChoice = cas.groups.some((g) => g.items.some((i) => !i.locked));
  const showDetail = openDetail || hasChoice;

  return (
    <Modal
      width={760}
      onClose={() => dispatch({ type: 'CLOSE_CAS' })}
      panelStyle={{ maxHeight: '86vh', display: 'flex', flexDirection: 'column' }}
    >
      <div style={{ padding: '16px 18px 14px', borderBottom: '1px solid var(--color-divider)' }}>
        <div style={{ fontFamily: 'var(--font-heading)', fontSize: 19, fontWeight: 600 }}>이렇게 바뀝니다</div>
        <div style={{ marginTop: 7, fontSize: 13.5, lineHeight: 1.65 }}>{willSentence(cas)}</div>
        <div style={{ marginTop: 9, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11.5, color: 'var(--color-neutral-600)' }}>
            바뀌는 것 {checkedN}개{checkedN !== totalN ? ` (전체 ${totalN}개 중)` : ''}
          </span>
          {hasChoice ? null : (
            <button
              className="btn btn-secondary"
              onClick={() => setOpenDetail((v) => !v)}
              style={{ height: 24, padding: '0 9px', fontSize: 11.5 }}
            >
              {openDetail ? '목록 접기' : '하나하나 보기'}
            </button>
          )}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: showDetail ? undefined : 'none' }}>
        {cas.groups.map((g) => (
          <div key={g.title}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '9px 18px',
                background: 'var(--color-surface)',
                borderBottom: '1px solid var(--color-divider)',
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-neutral-700)' }}>{g.title}</span>
              <span style={{ fontSize: 10.5, color: 'var(--color-neutral-500)' }}>{g.desc}</span>
            </div>

            {g.items.map((it) => (
              <div
                key={it.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 11,
                  padding: '9px 18px',
                  borderBottom: '1px solid var(--color-bg)',
                }}
              >
                {it.locked ? (
                  <span
                    style={{
                      width: 13,
                      height: 13,
                      flex: 'none',
                      border: '1px solid var(--color-accent)',
                      background: 'var(--color-accent)',
                      position: 'relative',
                    }}
                    title="자동으로 계산되는 값이라 끌 수 없어요"
                  />
                ) : (
                  <input
                    type="checkbox"
                    checked={it.on}
                    onChange={() => dispatch({ type: 'TOGGLE_TARGET', key: it.key })}
                    style={{ cursor: 'pointer' }}
                  />
                )}
                <span style={{ width: 190, flex: 'none', fontSize: 12, fontWeight: 600, ...ellipsis }}>{it.label}</span>
                <span
                  style={{
                    flex: 1,
                    minWidth: 0,
                    fontSize: 11.5,
                    color: 'var(--color-neutral-500)',
                    textDecoration: 'line-through',
                    ...ellipsis,
                  }}
                >
                  {it.before}
                </span>
                <span style={{ color: 'var(--color-neutral-400)', flex: 'none' }}>→</span>
                <span
                  style={{
                    flex: 1,
                    minWidth: 0,
                    fontSize: 11.5,
                    fontWeight: 600,
                    color: 'var(--color-accent-700)',
                    ...ellipsis,
                  }}
                >
                  {it.after}
                </span>
                {it.isOv ? (
                  <span
                    style={{
                      flex: 'none',
                      fontSize: 10,
                      fontWeight: 700,
                      color: 'var(--color-accent-800)',
                      background: 'var(--color-accent-200)',
                      padding: '2px 7px',
                      borderRadius: 0,
                    }}
                  >
                    원래 따로 정해둔 값
                  </span>
                ) : null}
                {it.locked ? (
                  <span className="tag tag-outline" style={{ flex: 'none', fontSize: 10 }}>
                    자동 계산
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '13px 18px',
          borderTop: '1px solid var(--color-divider)',
          background: 'var(--color-surface)',
        }}
      >
        <div style={{ flex: 1, fontSize: 11, color: 'var(--color-neutral-600)' }}>
          바꾼 뒤에도 되돌릴 수 있어요.
        </div>
        <button className="btn btn-secondary" onClick={() => dispatch({ type: 'CLOSE_CAS' })} style={{ height: 32 }}>
          그만두기
        </button>
        <button className="btn btn-primary" onClick={() => dispatch({ type: 'APPLY_CAS' })} style={{ height: 32 }}>
          네, 바꿀게요
        </button>
      </div>
    </Modal>
  );
};
