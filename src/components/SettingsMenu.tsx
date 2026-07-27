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
    label: '상속 표현',
    note: '오버라이드는 언제나 액센트 마커입니다. 고스트를 켜면 상속 셀 아래에 숙소 기본값이 함께 보입니다.',
    options: [
      ['marker', '마커'],
      ['ghost', '고스트'],
    ],
  },
  {
    k: 'cascadeMode',
    label: '연쇄 갱신',
    note: '즉시 적용은 미리보기 없이 바로 씁니다 — 되돌리기는 그대로 남습니다.',
    options: [
      ['preview', '미리보기'],
      ['instant', '즉시 적용'],
    ],
  },
  {
    k: 'layout',
    label: '레이아웃',
    note: '2단으로 두면 우측 필드 인스펙터가 숨고 그리드가 넓어집니다.',
    options: [
      ['3panel', '3단'],
      ['2panel', '2단'],
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
        표시 설정
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
            <div style={{ fontSize: 12.5, fontWeight: 700 }}>표시 설정</div>
            <div style={{ marginTop: 3, fontSize: 11, color: 'var(--color-neutral-600)' }}>
              데이터에는 영향이 없습니다 — 화면 표현과 저장 흐름만 바뀝니다.
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
