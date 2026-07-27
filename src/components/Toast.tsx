import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../state/store';

export const Toast = () => {
  const { state, dispatch } = useStore();

  useEffect(() => {
    if (!state.toast) return;
    const t = setTimeout(() => dispatch({ type: 'CLEAR_TOAST' }), 8000);
    return () => clearTimeout(t);
  }, [state.toast, dispatch]);

  if (!state.toast) return null;

  const toast = (
    <div
      style={{
        position: 'fixed',
        left: '50%',
        bottom: 26,
        transform: 'translateX(-50%)',
        zIndex: 60,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '11px 14px',
        background: 'var(--color-accent-900)',
        color: 'var(--color-bg)',
        borderRadius: 0,
        boxShadow: '0 12px 32px rgba(0,0,0,.28)',
        animation: 'tin .18s ease',
      }}
    >
      <span style={{ fontSize: 12.5, fontWeight: 600 }}>{state.toast}</span>
      <button
        className="btn"
        onClick={() => dispatch({ type: 'UNDO' })}
        style={{ height: 26, padding: '0 10px', fontSize: 12, color: 'var(--color-bg)', borderColor: 'rgba(255,255,255,.32)' }}
      >
        되돌리기
      </button>
    </div>
  );

  /* Portalled to <body>: a host that wraps the page in a transformed container would
     otherwise re-anchor this fixed element inside the app's scroll box.
     The guard keeps the component renderable without a DOM (static markup checks). */
  return typeof document === 'undefined' ? toast : createPortal(toast, document.body);
};
