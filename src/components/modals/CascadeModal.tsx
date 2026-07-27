import { useStore } from '../../state/store';
import { Modal } from '../primitives';

const ellipsis = {
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
} as const;

/** Preview of everything one edit reaches. Pickable rows are choices;
 *  locked rows are results — they are recomputed whether you like it or not. */
export const CascadeModal = () => {
  const { state, dispatch } = useStore();
  const cas = state.cas;
  if (!cas) return null;

  const totalN = cas.groups.reduce((a, g) => a + g.items.length, 0);
  const checkedN = cas.groups.reduce((a, g) => a + g.items.filter((i) => i.on).length, 0);

  return (
    <Modal
      width={760}
      onClose={() => dispatch({ type: 'CLOSE_CAS' })}
      panelStyle={{ maxHeight: '86vh', display: 'flex', flexDirection: 'column' }}
    >
      <div style={{ padding: '15px 18px', borderBottom: '1px solid var(--color-divider)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <span style={{ fontFamily: 'var(--font-heading)', fontSize: 19, fontWeight: 600 }}>연쇄 갱신 미리보기</span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--color-accent-800)',
              background: 'var(--color-accent-100)',
              padding: '3px 8px',
              borderRadius: 0,
            }}
          >
            대상 {checkedN} / {totalN}
          </span>
        </div>
        <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}>
          <span style={{ fontWeight: 700 }}>{cas.field}</span>
          <span style={{ color: 'var(--color-neutral-500)', textDecoration: 'line-through' }}>{cas.from}</span>
          <span style={{ color: 'var(--color-neutral-400)' }}>→</span>
          <span style={{ fontWeight: 700, color: 'var(--color-accent-700)' }}>{cas.to}</span>
        </div>
      </div>

      {cas.warn ? (
        <div
          style={{
            padding: '10px 18px',
            background: 'var(--color-accent-100)',
            borderBottom: '1px solid var(--color-accent-300)',
            fontSize: 11.5,
            color: 'var(--color-accent-900)',
            lineHeight: 1.6,
          }}
        >
          {cas.warn}
        </div>
      ) : null}

      <div style={{ flex: 1, overflowY: 'auto' }}>
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
                    title="자동 산출 — 해제할 수 없습니다"
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
                    오버라이드 덮어씀
                  </span>
                ) : null}
                {it.locked ? (
                  <span className="tag tag-outline" style={{ flex: 'none', fontSize: 10 }}>
                    자동 산출
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
          적용 즉시 변경 이력에 기록되고, 되돌리기가 가능합니다.
        </div>
        <button className="btn btn-secondary" onClick={() => dispatch({ type: 'CLOSE_CAS' })} style={{ height: 32 }}>
          취소
        </button>
        <button className="btn btn-primary" onClick={() => dispatch({ type: 'APPLY_CAS' })} style={{ height: 32 }}>
          적용하고 저장
        </button>
      </div>
    </Modal>
  );
};
