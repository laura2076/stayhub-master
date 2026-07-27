import { deriveBlocks } from '../../domain/derive';
import { renderFaq } from '../../domain/faq';
import { useStore } from '../../state/store';
import { Th } from '../primitives';

const COLS = '104px 72px minmax(0,1.1fr) minmax(0,1.5fr)';

export const FaqTab = () => {
  const { state } = useStore();
  const blocks = deriveBlocks(state.rooms, state.blocks);
  const rows = state.faqs.map((f) => renderFaq(f, blocks));
  const derivedN = state.faqs.filter((f) => !!f.tpl).length;

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--color-bg)' }}>
      <div
        style={{
          padding: '11px 20px',
          background: 'var(--color-accent-100)',
          borderBottom: '1px solid var(--color-accent-300)',
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-accent-900)' }}>
          시설 값을 인용하는 답변 {derivedN}건은 자유 입력이 아니라 시설 값에서 생성됩니다 — 사람이 따로 고칠 곳이 없으므로
          어긋날 수 없습니다.
        </div>
        <div style={{ marginTop: 4, fontSize: 11, color: 'var(--color-accent-800)' }}>
          미사용 시설과 연결된 16건은 자동 비활성이라 채널로 전송되지 않습니다 (개별수영장 · 애견동반 · 캠핑).
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: COLS,
          position: 'sticky',
          top: 0,
          background: 'var(--color-surface)',
          borderBottom: '1px solid var(--color-divider)',
          zIndex: 2,
        }}
      >
        {['분류', '번호', '질문', '답변'].map((h) => (
          <Th key={h} style={{ padding: '8px 14px' }}>
            {h}
          </Th>
        ))}
      </div>

      {rows.map((f) => (
        <div
          key={f.qid}
          style={{
            display: 'grid',
            gridTemplateColumns: COLS,
            borderBottom: '1px solid var(--color-divider)',
            fontSize: 12,
          }}
        >
          <div style={{ padding: '8px 14px' }}>
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 600,
                color: 'var(--color-neutral-700)',
                background: 'var(--color-neutral-200)',
                padding: '2px 7px',
                borderRadius: 0,
              }}
            >
              {f.cate}
            </span>
          </div>
          <div
            style={{
              padding: '8px 14px',
              fontFamily: 'ui-monospace,Menlo,monospace',
              fontSize: 10.5,
              color: 'var(--color-neutral-500)',
            }}
          >
            {f.qid}
          </div>
          <div style={{ padding: '8px 14px', lineHeight: 1.6 }}>{f.q}</div>
          <div style={{ padding: '8px 14px', lineHeight: 1.6 }}>
            {f.answered ? <span style={{ color: 'var(--color-neutral-800)' }}>{f.a}</span> : null}
            {f.blank ? (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--color-neutral-600)',
                  background: 'var(--color-neutral-200)',
                  padding: '2px 7px',
                  borderRadius: 0,
                }}
              >
                {f.reason}
              </span>
            ) : null}
            {f.derived ? (
              <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="tag tag-outline" style={{ fontSize: 10 }}>
                  시설 값에서 생성
                </span>
                <span style={{ fontSize: 10.5, color: 'var(--color-neutral-500)' }}>{f.src}</span>
              </div>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
};
