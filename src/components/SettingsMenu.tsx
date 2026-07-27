import { useEffect, useRef, useState } from 'react';
import { useStore } from '../state/store';
import { Corners, Seg, SegItem } from './primitives';
import type { Settings } from '../domain/types';

type Row<K extends keyof Settings> = {
  k: K;
  label: string;
  note: string;
  options: [Settings[K], string][];
};

const ROWS: [Row<'inheritanceViz'>, Row<'cascadeMode'>, Row<'layout'>] = [
  {
    k: 'inheritanceViz',
    label: '따로 정한 값 표시',
    note: '전체와 다른 값은 항상 표시됩니다. "전체값도 보기"를 켜면 같은 값을 쓰는 칸 아래에 전체값이 작게 보입니다.',
    options: [
      ['marker', '다른 것만'],
      ['ghost', '전체값도 보기'],
    ],
  },
  {
    k: 'cascadeMode',
    label: '바꾸기 전 확인',
    note: '값 바꾸기는 되돌릴 수 있어서 바로 반영합니다. 만들기·지우기와, 따로 정해둔 값을 덮어쓸 때만 물어봅니다.',
    options: [
      ['smart', '필요할 때만'],
      ['always', '항상'],
    ],
  },
  {
    k: 'layout',
    label: '오른쪽 설명창',
    note: '끄면 표가 넓어집니다.',
    options: [
      ['3panel', '보이기'],
      ['2panel', '숨기기'],
    ],
  },
];

export const SettingsMenu = () => {
  const { state, dispatch } = useStore();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  return (
    <div ref={wrap} style={{ position: 'relative' }}>
      <button className="btn btn-secondary" onClick={() => setOpen((v) => !v)} style={{ height: 32 }}>
        화면 설정
      </button>

      {open ? (
        <div
          className="blueprint elev-lg"
          style={{
            position: 'absolute',
            top: 38,
            right: 0,
            width: 320,
            background: 'var(--color-bg)',
            zIndex: 30,
            animation: 'tin .16s ease',
          }}
        >
          <Corners />
          <div style={{ padding: '11px 13px', borderBottom: '1px solid var(--color-divider)' }}>
            <div style={{ fontSize: 12.5, fontWeight: 700 }}>화면 설정</div>
            <div style={{ marginTop: 3, fontSize: 11, color: 'var(--color-neutral-600)' }}>
              저장된 값은 바뀌지 않습니다. 보이는 방식만 달라집니다.
            </div>
          </div>
          <div style={{ padding: '4px 13px 12px' }}>
            {ROWS.map((row) => (
              <div key={row.k} style={{ padding: '10px 0', borderBottom: '1px solid var(--color-surface)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ flex: 1, fontSize: 11.5, fontWeight: 700, color: 'var(--color-neutral-700)' }}>
                    {row.label}
                  </span>
                  <Seg>
                    {row.options.map(([v, label], i) => (
                      <SegItem
                        key={String(v)}
                        label={label}
                        on={state.settings[row.k] === v}
                        borderLeft={i > 0}
                        onClick={() => dispatch({ type: 'SET_SETTINGS', patch: { [row.k]: v } as Partial<Settings> })}
                      />
                    ))}
                  </Seg>
                </div>
                <div style={{ marginTop: 5, fontSize: 10.5, lineHeight: 1.6, color: 'var(--color-neutral-500)' }}>
                  {row.note}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};
