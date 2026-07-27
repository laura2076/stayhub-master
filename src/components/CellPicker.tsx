import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { fmtNum } from '../domain/fieldTypes';
import type { AttrValue } from '../domain/types';

export type PickerMode =
  | { kind: 'options'; options: { value: AttrValue; label: string; note?: string }[] }
  | { kind: 'number'; unit: string; min?: number; max?: number; money?: boolean };

/** 칸을 눌러 그 자리에서 값을 바꾸는 작은 창.
 *
 *  브라우저 popover라 top layer에 그려집니다 — 표의 스크롤에 잘리지도, 조상의
 *  transform에 끌려가지도 않습니다. 바깥을 누르거나 Esc를 누르면 알아서 닫힙니다.
 *
 *  값이 목록이면 고르고, 숫자면 직접 칩니다. 인원처럼 끝이 없는 값을 목록으로
 *  만들면 결국 "그 밖의 값"을 못 넣게 됩니다. */
export const CellPicker = ({
  label,
  mode,
  current,
  onPick,
  children,
  cellStyle,
  className,
}: {
  label: string;
  mode: PickerMode;
  current: AttrValue;
  onPick: (value: AttrValue) => void;
  children: ReactNode;
  cellStyle?: CSSProperties;
  className?: string;
}) => {
  const anchor = useRef<HTMLDivElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');

  useLayoutEffect(() => {
    if (!open || !anchor.current || !pop.current) return;
    const a = anchor.current.getBoundingClientRect();
    const el = pop.current;
    el.style.visibility = 'hidden';
    el.showPopover?.();
    const h = el.offsetHeight;
    const w = el.offsetWidth;
    const below = window.innerHeight - a.bottom;
    el.style.left = `${Math.max(8, Math.min(a.left, window.innerWidth - w - 8))}px`;
    el.style.top = below > h + 12 ? `${a.bottom + 4}px` : `${Math.max(8, a.top - h - 4)}px`;
    el.style.visibility = 'visible';
    input.current?.focus();
    input.current?.select();
    return () => el.hidePopover?.();
  }, [open]);

  useEffect(() => {
    const el = pop.current;
    if (!el) return;
    const onToggle = (e: Event) => {
      if ((e as ToggleEvent).newState === 'closed') setOpen(false);
    };
    el.addEventListener('toggle', onToggle);
    return () => el.removeEventListener('toggle', onToggle);
  }, [open]);

  const openPicker = () => {
    setDraft(String(current ?? ''));
    setOpen(true);
  };

  const commitNumber = () => {
    const n = Number(String(draft).replace(/[^0-9.-]/g, ''));
    setOpen(false);
    if (!Number.isNaN(n) && n !== Number(current)) onPick(n);
  };

  const step = (by: number) => {
    const n = Number(String(draft).replace(/[^0-9.-]/g, '')) || 0;
    const min = mode.kind === 'number' ? (mode.min ?? 0) : 0;
    const max = mode.kind === 'number' ? (mode.max ?? Number.MAX_SAFE_INTEGER) : 0;
    setDraft(String(Math.min(max, Math.max(min, n + by))));
  };

  return (
    <div
      ref={anchor}
      className={className}
      onClick={openPicker}
      style={{ cursor: 'pointer', ...cellStyle }}
      title={`눌러서 ${label} 바꾸기`}
    >
      {children}

      {open ? (
        <div
          ref={pop}
          popover="auto"
          className="blueprint elev-lg"
          style={{
            position: 'fixed',
            margin: 0,
            padding: 0,
            width: mode.kind === 'number' ? 268 : 300,
            maxHeight: 340,
            overflowY: 'auto',
            background: 'var(--color-bg)',
            animation: 'fin .1s ease',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            style={{
              padding: '9px 12px',
              borderBottom: '1px solid var(--color-divider)',
              fontSize: 11.5,
              fontWeight: 700,
              color: 'var(--color-neutral-700)',
              background: 'var(--color-surface)',
            }}
          >
            {mode.kind === 'number' ? `${label} 입력` : `${label} 고르기`}
          </div>

          {mode.kind === 'number' ? (
            <div style={{ padding: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button className="btn btn-secondary" onClick={() => step(-1)} style={{ width: 34, height: 36, padding: 0, fontSize: 16 }}>
                  −
                </button>
                <input
                  ref={input}
                  className="input"
                  type="number"
                  inputMode="numeric"
                  value={draft}
                  min={mode.min}
                  max={mode.max}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitNumber();
                    if (e.key === 'Escape') setOpen(false);
                  }}
                  style={{ flex: 1, minHeight: 36, fontSize: 15, textAlign: 'right', fontWeight: 700 }}
                />
                <button className="btn btn-secondary" onClick={() => step(1)} style={{ width: 34, height: 36, padding: 0, fontSize: 16 }}>
                  +
                </button>
                <span style={{ fontSize: 13, color: 'var(--color-neutral-600)', width: 26 }}>{mode.unit}</span>
              </div>

              {mode.money ? (
                <div style={{ marginTop: 8, display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {[5000, 10000, 30000].map((amt) => (
                    <button
                      key={amt}
                      className="btn btn-secondary"
                      onClick={() => step(amt)}
                      style={{ height: 26, padding: '0 8px', fontSize: 11.5 }}
                    >
                      +{fmtNum(amt)}
                    </button>
                  ))}
                </div>
              ) : null}

              <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ flex: 1, fontSize: 11, color: 'var(--color-neutral-500)' }}>
                  {mode.min !== undefined && mode.max !== undefined ? `${mode.min}~${mode.max} ${mode.unit}` : '숫자를 직접 넣으세요'}
                </span>
                <button className="btn btn-secondary" onClick={() => setOpen(false)} style={{ height: 30, fontSize: 12.5 }}>
                  그만두기
                </button>
                <button className="btn btn-primary" onClick={commitNumber} style={{ height: 30, fontSize: 12.5 }}>
                  바꾸기
                </button>
              </div>
            </div>
          ) : (
            mode.options.map((o) => {
              const on = o.value === current;
              return (
                <div
                  key={String(o.value)}
                  onClick={() => {
                    setOpen(false);
                    if (!on) onPick(o.value);
                  }}
                  className={on ? undefined : 'hov-accent'}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 9,
                    padding: '10px 12px',
                    borderBottom: '1px solid var(--color-surface)',
                    background: on ? 'var(--color-accent-100)' : undefined,
                    cursor: 'pointer',
                  }}
                >
                  <span
                    style={{
                      width: 14,
                      height: 14,
                      flex: 'none',
                      marginTop: 1,
                      borderRadius: '50%',
                      border: on ? '4px solid var(--color-accent)' : '1px solid var(--color-neutral-300)',
                      background: on ? 'var(--color-bg)' : 'transparent',
                    }}
                  />
                  <span style={{ minWidth: 0 }}>
                    <span
                      style={{
                        display: 'block',
                        fontSize: 12.5,
                        fontWeight: on ? 700 : 500,
                        color: on ? 'var(--color-accent-800)' : 'var(--color-neutral-800)',
                      }}
                    >
                      {o.label}
                    </span>
                    {o.note ? (
                      <span style={{ display: 'block', marginTop: 2, fontSize: 11, color: 'var(--color-neutral-500)' }}>{o.note}</span>
                    ) : null}
                  </span>
                  {on ? <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--color-accent-700)' }}>지금 값</span> : null}
                </div>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
};
