import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

/** 셀에서 바로 고르는 목록.
 *
 *  브라우저 popover라 top layer에 그려집니다 — 표의 스크롤 영역에 잘리지도, 조상의
 *  transform에 끌려가지도 않습니다. 바깥을 누르거나 Esc를 누르면 알아서 닫힙니다. */
export const CellPicker = ({
  label,
  options,
  current,
  onPick,
  children,
  cellStyle,
  className,
}: {
  label: string;
  options: { value: string; label: string; note?: string }[];
  current: string;
  onPick: (value: string) => void;
  children: ReactNode;
  cellStyle?: React.CSSProperties;
  className?: string;
}) => {
  const anchor = useRef<HTMLDivElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  /* 셀 바로 아래에 붙이되, 화면 밖으로 나가면 위/왼쪽으로 접습니다. */
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

  return (
    <div
      ref={anchor}
      className={className}
      onClick={() => setOpen(true)}
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
            width: 300,
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
            {label} 고르기
          </div>

          {options.map((o) => {
            const on = o.value === current;
            return (
              <div
                key={o.value}
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
                    <span style={{ display: 'block', marginTop: 2, fontSize: 11, color: 'var(--color-neutral-500)' }}>
                      {o.note}
                    </span>
                  ) : null}
                </span>
                {on ? (
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--color-accent-700)' }}>지금 값</span>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};
