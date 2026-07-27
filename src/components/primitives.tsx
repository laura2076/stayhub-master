import type { CSSProperties, ReactNode } from 'react';

/** Registration marks the design system draws outside a framed box. */
export const Corners = () => (
  <>
    <i className="corner tl" />
    <i className="corner tr" />
    <i className="corner bl" />
    <i className="corner br" />
  </>
);

export const Modal = ({
  width,
  zIndex,
  children,
  panelStyle,
}: {
  width: number;
  zIndex: number;
  children: ReactNode;
  panelStyle?: CSSProperties;
}) => (
  <div
    style={{
      position: 'fixed',
      inset: 0,
      background: 'color-mix(in srgb, var(--color-neutral-900) 50%, transparent)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex,
      animation: 'fin .14s ease',
    }}
  >
    <div
      className="blueprint elev-lg"
      style={{ width, background: 'var(--color-bg)', animation: 'tin .18s ease', ...panelStyle }}
    >
      <Corners />
      {children}
    </div>
  </div>
);

export const ModalHead = ({ title, sub }: { title: string; sub?: string }) => (
  <div style={{ padding: '15px 18px', borderBottom: '1px solid var(--color-divider)' }}>
    <div style={{ fontFamily: 'var(--font-heading)', fontSize: 19, fontWeight: 600 }}>{title}</div>
    {sub ? <div style={{ marginTop: 3, fontSize: 11.5, color: 'var(--color-neutral-600)' }}>{sub}</div> : null}
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
      borderRadius: 0,
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
        borderRadius: 0,
        fontSize: 12,
        fontWeight: on ? 700 : tone === 'ink' ? 600 : 400,
        cursor: 'pointer',
      }}
    >
      {label}
    </div>
  );
};

export const Seg = ({ children, style }: { children: ReactNode; style?: CSSProperties }) => (
  <div style={{ display: 'flex', border: '1px solid var(--color-divider)', ...style }}>{children}</div>
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
      borderRadius: 0,
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
      borderRadius: 0,
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
