import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';

/** Registration marks the design system draws outside a framed box. */
export const Corners = () => (
  <>
    <i className="corner tl" />
    <i className="corner tr" />
    <i className="corner bl" />
    <i className="corner br" />
  </>
);

/** A modal dialog in the browser's top layer.
 *
 *  Not a `position: fixed` overlay: any ancestor carrying `transform`, `filter`,
 *  `contain` or `will-change` becomes the containing block for fixed descendants,
 *  which drops the overlay into the page flow. Embedding hosts do exactly that to
 *  the page they wrap. `showModal()` renders outside the tree entirely, so the
 *  dialog centres on the viewport wherever this app is mounted — and Esc and the
 *  focus trap come from the platform. */
export const Modal = ({
  width,
  children,
  panelStyle,
  onClose,
}: {
  width: number;
  children: ReactNode;
  panelStyle?: CSSProperties;
  onClose: () => void;
}) => {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    return () => {
      if (d?.open) d.close();
    };
  }, []);

  return (
    <dialog
      ref={ref}
      className="dc-modal blueprint elev-lg"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      style={{ width, background: 'var(--color-bg)', animation: 'tin .18s ease', ...panelStyle }}
    >
      <Corners />
      {children}
    </dialog>
  );
};

export const ModalHead = ({ title, sub }: { title: string; sub?: string }) => (
  <div style={{ padding: '18px 20px 16px', borderBottom: '1px solid var(--color-divider)' }}>
    <div style={{ fontFamily: 'var(--font-heading)', fontSize: 20.5, fontWeight: 800, letterSpacing: '-0.02em' }}>{title}</div>
    {sub ? <div style={{ marginTop: 5, fontSize: 12.5, color: 'var(--color-neutral-600)' }}>{sub}</div> : null}
  </div>
);

export const ModalFoot = ({ hint, children }: { hint?: ReactNode; children: ReactNode }) => (
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
    <div style={{ flex: 1, fontSize: 11, color: 'var(--color-neutral-600)' }}>{hint}</div>
    {children}
  </div>
);

/** A single-choice row with a ring dot — used wherever a value comes from a fixed list. */
export const RadioRow = ({
  label,
  on,
  onClick,
  padding = '10px 12px',
}: {
  label: string;
  on: boolean;
  onClick: () => void;
  padding?: string;
}) => (
  <div
    onClick={onClick}
    className={on ? undefined : 'hov-surface'}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 9,
      padding,
      border: `1px solid ${on ? 'var(--color-accent)' : 'var(--color-divider)'}`,
      background: on ? 'var(--color-accent-100)' : 'var(--color-bg)',
      borderRadius: 'var(--radius-sm)',
      cursor: 'pointer',
    }}
  >
    <span
      style={{
        width: 14,
        height: 14,
        flex: 'none',
        borderRadius: '50%',
        border: on ? '4px solid var(--color-accent)' : '1px solid var(--color-neutral-300)',
        background: on ? 'var(--color-bg)' : 'transparent',
      }}
    />
    <span
      style={{
        fontSize: 12.5,
        fontWeight: on ? 700 : 400,
        color: on ? 'var(--color-accent-800)' : 'var(--color-neutral-800)',
      }}
    >
      {label}
    </span>
  </div>
);

/** Bordered chip. `tone` picks which filled state the selected chip takes. */
export const Chip = ({
  label,
  on,
  onClick,
  padding = '6px 11px',
  tone = 'accent',
}: {
  label: string;
  on: boolean;
  onClick: () => void;
  padding?: string;
  tone?: 'accent' | 'ink';
}) => {
  const fill = tone === 'ink' ? 'var(--color-accent-900)' : 'var(--color-accent)';
  return (
    <div
      onClick={onClick}
      className={on ? undefined : tone === 'ink' ? 'hov-surface' : 'hov-neutral'}
      style={{
        padding,
        border: `1px solid ${on ? fill : 'var(--color-divider)'}`,
        background: on ? fill : 'var(--color-bg)',
        color: on ? 'var(--color-bg)' : 'var(--color-neutral-800)',
        borderRadius: 'var(--radius-sm)',
        fontSize: 12,
        fontWeight: on ? 700 : tone === 'ink' ? 600 : 400,
        cursor: 'pointer',
      }}
    >
      {label}
    </div>
  );
};

/** 숫자를 직접 넣는 칸. 인원·요금처럼 값의 끝이 없는 것은 목록으로 만들 수 없어서
 *  — 목록으로 만드는 순간 "그 밖의 값"을 넣을 방법이 사라집니다 — 여기서 칩니다.
 *  화살표만 있으면 큰 수를 넣기 힘들고, 입력칸만 있으면 한 명 늘리기가 번거로워서
 *  둘 다 둡니다. */
export const NumberField = ({
  value,
  unit,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
  step = 1,
  quick,
  onChange,
}: {
  value: number;
  unit: string;
  min?: number;
  max?: number;
  step?: number;
  quick?: number[];
  onChange: (n: number) => void;
}) => {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button className="btn btn-secondary" onClick={() => onChange(clamp(value - step))} style={{ width: 34, height: 34, padding: 0, fontSize: 16 }}>
          −
        </button>
        <input
          className="input"
          type="number"
          inputMode="numeric"
          value={value}
          min={min}
          max={max}
          onChange={(e) => onChange(clamp(Number(e.target.value) || 0))}
          style={{ flex: 1, minHeight: 34, fontSize: 15, textAlign: 'right', fontWeight: 700 }}
        />
        <button className="btn btn-secondary" onClick={() => onChange(clamp(value + step))} style={{ width: 34, height: 34, padding: 0, fontSize: 16 }}>
          +
        </button>
        <span style={{ fontSize: 13, color: 'var(--color-neutral-600)', width: 26 }}>{unit}</span>
      </div>
      {quick?.length ? (
        <div style={{ marginTop: 7, display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {quick.map((q) => (
            <div
              key={q}
              onClick={() => onChange(clamp(q))}
              className={value === q ? undefined : 'hov-neutral'}
              style={{
                padding: '4px 10px',
                border: `1px solid ${value === q ? 'var(--color-accent)' : 'var(--color-divider)'}`,
                background: value === q ? 'var(--color-accent-100)' : 'var(--color-bg)',
                color: value === q ? 'var(--color-accent-800)' : 'var(--color-neutral-700)',
                fontSize: 11.5,
                fontWeight: value === q ? 700 : 400,
                cursor: 'pointer',
              }}
            >
              {q.toLocaleString('ko-KR')}
              {unit}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
};

export const Seg = ({ children, style }: { children: ReactNode; style?: CSSProperties }) => (
  <div
    style={{
      display: 'flex',
      border: '1px solid var(--color-divider)',
      borderRadius: 'var(--radius-md)',
      overflow: 'hidden',
      background: 'var(--color-bg)',
      ...style,
    }}
  >
    {children}
  </div>
);

export const SegItem = ({
  label,
  on,
  onClick,
  padding = '6px 11px',
  borderLeft = true,
}: {
  label: string;
  on: boolean;
  onClick: () => void;
  padding?: string;
  borderLeft?: boolean;
}) => (
  <div
    onClick={onClick}
    className={on ? undefined : 'hov-neutral'}
    style={{
      padding,
      background: on ? 'var(--color-accent)' : 'transparent',
      color: on ? 'var(--color-bg)' : 'var(--color-neutral-700)',
      fontSize: 12,
      fontWeight: on ? 700 : 400,
      cursor: 'pointer',
      borderLeft: borderLeft ? '1px solid var(--color-divider)' : undefined,
    }}
  >
    {label}
  </div>
);

/** The small square badge a channel column uses — neutral when in sync, accent when not. */
export const ChannelBadge = ({ k, bad }: { k: string; bad: boolean }) => (
  <span
    style={{
      fontSize: 10,
      fontWeight: 700,
      width: 18,
      height: 18,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 'var(--radius-sm)',
      background: bad ? 'var(--color-accent-200)' : 'var(--color-neutral-200)',
      color: bad ? 'var(--color-accent-800)' : 'var(--color-neutral-700)',
    }}
  >
    {k}
  </span>
);

export const CountChip = ({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'accent' }) => (
  <span
    style={{
      fontSize: 10.5,
      fontWeight: 600,
      color: tone === 'accent' ? 'var(--color-accent-800)' : 'var(--color-neutral-700)',
      background: tone === 'accent' ? 'var(--color-accent-200)' : 'var(--color-neutral-200)',
      padding: '2px 7px',
      borderRadius: 'var(--radius-sm)',
    }}
  >
    {children}
  </span>
);

/** Column header cell shared by every grid in the console. */
export const Th = ({ children, style }: { children?: ReactNode; style?: CSSProperties }) => (
  <div
    style={{
      padding: '8px 12px',
      fontSize: 11,
      fontWeight: 700,
      color: 'var(--color-neutral-700)',
      ...style,
    }}
  >
    {children}
  </div>
);
