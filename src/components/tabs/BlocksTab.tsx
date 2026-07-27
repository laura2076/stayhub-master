import { useState } from 'react';
import { RULECAT } from '../../domain/catalog';
import { deriveBlocks, isCalcField, ruleText, slotText } from '../../domain/derive';
import { typeName, typeOf } from '../../domain/fieldTypes';
import type { Block, BlockFilter } from '../../domain/types';
import { useStore } from '../../state/store';
import { Corners, CountChip, Seg, SegItem } from '../primitives';

const FILTERS: [BlockFilter, string][] = [
  ['all', '전체'],
  ['used', '사용중'],
  ['off', '보유·사용안함'],
  ['none', '미보유'],
];

const smallBtn = { height: 22, padding: '0 8px', fontSize: 11 } as const;

/** 안내 규칙 — sentences assembled from typed fragments picked out of the company catalogue.
 *  There is no free-text box here on purpose: a number in a sentence can never go stale. */
const RulesSection = ({ b }: { b: Block }) => {
  const { dispatch } = useStore();
  const [picking, setPicking] = useState(false);
  const rules = b.rules ?? [];
  const owned = rules.map((r) => r.id);

  /** A rule shows up in the picker unless it is restricted to other facilities, or it is
   *  already on this block and cannot repeat. Repeatable ones (주변 여행지 등) always show. */
  const available = RULECAT.filter(
    (c) => (!c.blocks || c.blocks.includes(b.key)) && (c.repeatable || !owned.includes(c.id)),
  );
  const groups = [...new Set(available.map((c) => c.group))];

  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-neutral-700)' }}>안내 규칙 {rules.length}</span>
        <span style={{ fontSize: 10.5, color: 'var(--color-neutral-500)' }}>조각 값에서 문장 생성 · 직접 입력 없음</span>
        <div style={{ flex: 1 }} />
        <button className="btn btn-secondary" onClick={() => setPicking((v) => !v)} style={smallBtn}>
          {picking ? '닫기' : '+ 규칙 추가'}
        </button>
      </div>

      {rules.map((r, ri) => (
        <div
          key={`${r.tpl}-${ri}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            padding: '5px 0',
            borderBottom: '1px solid var(--color-surface)',
          }}
        >
          <span style={{ flex: 1, minWidth: 0, fontSize: 11.5, lineHeight: 1.5 }}>{ruleText(r)}</span>
          {r.slots.map((s, si) => (
            <button
              key={s.k}
              className="btn btn-secondary"
              onClick={() => dispatch({ type: 'OPEN_RULE_SLOT', blockKey: b.key, ri, si })}
              style={{ ...smallBtn, flex: 'none' }}
              title={`${typeName(s.type)} 값 수정`}
            >
              {slotText(s)}
            </button>
          ))}
          {r.slots.length === 0 ? (
            <span className="tag tag-neutral" style={{ flex: 'none', fontSize: 10 }}>
              고정 문장
            </span>
          ) : null}
          <button
            className="btn btn-secondary"
            onClick={() => dispatch({ type: 'PREVIEW_RULE_DEL', blockKey: b.key, ri })}
            style={{ ...smallBtn, flex: 'none' }}
          >
            삭제
          </button>
        </div>
      ))}

      {picking ? (
        <div
          style={{
            marginTop: 7,
            border: '1px dashed var(--color-neutral-400)',
            padding: '8px 10px',
            maxHeight: 260,
            overflowY: 'auto',
          }}
        >
          <div style={{ fontSize: 10.5, color: 'var(--color-neutral-600)', marginBottom: 6 }}>
            전사 규칙 카탈로그 — 고른 뒤 조각 값을 이 숙소 값으로 맞춥니다. 문장은 직접 쓰지 않습니다.
          </div>
          {available.length === 0 ? (
            <div style={{ fontSize: 11, color: 'var(--color-neutral-500)' }}>추가할 수 있는 규칙이 없습니다.</div>
          ) : (
            groups.map((g) => (
              <div key={g} style={{ marginBottom: 6 }}>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '.04em',
                    color: 'var(--color-neutral-500)',
                    padding: '4px 0 2px',
                  }}
                >
                  {g}
                </div>
                {available
                  .filter((c) => c.group === g)
                  .map((c) => (
                    <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0' }}>
                      <span style={{ flex: 1, minWidth: 0, fontSize: 11.5, color: 'var(--color-neutral-800)' }}>
                        {ruleText(c)}
                      </span>
                      {c.repeatable ? (
                        <span className="tag tag-neutral" style={{ flex: 'none', fontSize: 10, opacity: 0.7 }}>
                          여러 건
                        </span>
                      ) : null}
                      <button
                        className="btn btn-secondary"
                        onClick={() => {
                          setPicking(false);
                          dispatch({ type: 'PREVIEW_RULE_ADD', blockKey: b.key, ruleId: c.id });
                        }}
                        style={{ ...smallBtn, flex: 'none' }}
                      >
                        추가
                      </button>
                    </div>
                  ))}
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
};

const BlockCard = ({ b }: { b: Block }) => {
  const { dispatch } = useStore();
  const isUsed = b.st === 'used';
  const isOff = b.st === 'off';
  const isNone = b.st === 'none';

  return (
    <div className="blueprint" style={{ background: 'transparent' }}>
      <Corners />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 13px',
          borderBottom: '1px solid var(--color-divider)',
        }}
      >
        <span style={{ fontSize: 12.5, fontWeight: 700 }}>{b.label}</span>
        {isUsed ? (
          <span className="tag tag-accent" style={{ fontWeight: 700 }}>
            사용중
          </span>
        ) : null}
        {isOff ? (
          <span className="tag tag-neutral" style={{ fontWeight: 700 }}>
            보유 · 사용안함
          </span>
        ) : null}
        {isNone ? (
          <span className="tag tag-outline" style={{ fontWeight: 700 }}>
            미보유
          </span>
        ) : null}
        <div style={{ flex: 1 }} />
        {isUsed ? (
          <button
            className="btn btn-secondary"
            onClick={() => dispatch({ type: 'PREVIEW_BLOCK_STATE', blockKey: b.key, nextSt: 'off' })}
            style={smallBtn}
          >
            사용 중지
          </button>
        ) : null}
        {isOff ? (
          <button
            className="btn btn-secondary"
            onClick={() => dispatch({ type: 'PREVIEW_BLOCK_STATE', blockKey: b.key, nextSt: 'none' })}
            style={smallBtn}
          >
            항목 제거
          </button>
        ) : null}
        <span style={{ fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 10, color: 'var(--color-neutral-400)' }}>
          {b.key}
        </span>
      </div>

      {isNone ? (
        <div style={{ padding: '12px 13px', display: 'flex', alignItems: 'center', gap: 11 }}>
          <div
            style={{
              flex: 1,
              border: '1px dashed var(--color-neutral-400)',
              padding: '9px 11px',
              fontSize: 11.5,
              lineHeight: 1.6,
              color: 'var(--color-neutral-600)',
            }}
          >
            이 숙소에 없는 항목입니다. 추가하면 카탈로그가 정의한 필수 필드가 생기고, 채널 {b.chanN}곳 · FAQ {b.faqN}건이
            함께 살아납니다.
          </div>
          <button
            className="btn btn-secondary"
            onClick={() => dispatch({ type: 'PREVIEW_ADD_BLOCK_ITEM', blockKey: b.key })}
            style={{ flex: 'none', height: 28, fontSize: 12 }}
          >
            + 항목 추가
          </button>
        </div>
      ) : null}

      {isOff ? (
        <div
          style={{
            padding: '9px 13px',
            display: 'flex',
            alignItems: 'center',
            gap: 11,
            background: 'var(--color-surface)',
            borderBottom: '1px solid var(--color-divider)',
          }}
        >
          <span style={{ flex: 1, fontSize: 11.5, lineHeight: 1.6, color: 'var(--color-neutral-700)' }}>
            항목은 보유하지만 판매에 노출하지 않습니다. 관련 FAQ {b.faqN}건은 자동 비활성 상태입니다.
          </span>
          <button
            className="btn btn-primary"
            onClick={() => dispatch({ type: 'PREVIEW_BLOCK_USE', blockKey: b.key })}
            style={{ flex: 'none', height: 28, fontSize: 12 }}
          >
            사용으로 전환
          </button>
        </div>
      ) : null}

      {!isNone ? (
        <div style={{ padding: '4px 13px 12px' }}>
          {b.fields.map(([k, v]) => {
            const calc = isCalcField(b.key, k);
            const t = typeOf(b.key, k);
            const isFree = !calc && t === 'text';
            return (
              <div
                key={k}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  padding: '6px 0',
                  borderBottom: '1px solid var(--color-surface)',
                }}
              >
                <span style={{ width: 88, flex: 'none', fontSize: 11, color: 'var(--color-neutral-600)', paddingTop: 2 }}>
                  {k}
                </span>
                <span style={{ flex: 1, fontSize: 12, lineHeight: 1.5 }}>{v}</span>
                {calc ? (
                  <span className="tag tag-outline" style={{ flex: 'none', fontSize: 10 }}>
                    객실에서 자동 산출
                  </span>
                ) : isFree ? (
                  <span className="tag tag-neutral" style={{ flex: 'none', fontSize: 10, opacity: 0.65 }}>
                    자유 텍스트
                  </span>
                ) : (
                  <span className="tag tag-neutral" style={{ flex: 'none', fontSize: 10 }}>
                    {typeName(t)}
                  </span>
                )}
                {isUsed && !calc ? (
                  <button
                    className="btn btn-secondary"
                    onClick={() => dispatch({ type: 'OPEN_BLOCK_EDIT', blockKey: b.key, k, v })}
                    style={{ ...smallBtn, height: 23, flex: 'none' }}
                  >
                    수정
                  </button>
                ) : null}
              </div>
            );
          })}

          {isUsed ? <RulesSection b={b} /> : null}

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 9, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10.5, color: 'var(--color-neutral-500)' }}>연결</span>
            {b.rooms === 0 ? <CountChip tone="accent">객실 0</CountChip> : <CountChip>객실 {b.rooms}</CountChip>}
            <CountChip>채널 {b.chanN}</CountChip>
            {b.st !== 'used' && b.faqN > 0 ? (
              <CountChip tone="accent">FAQ {b.faqN} 비활성</CountChip>
            ) : (
              <CountChip>FAQ {b.faqN}</CountChip>
            )}
          </div>

        </div>
      ) : null}
    </div>
  );
};

export const BlocksTab = () => {
  const { state, dispatch } = useStore();
  const derived = deriveBlocks(state.rooms, state.blocks);
  const count = (k: BlockFilter) => derived.filter((b) => b.st === k).length;
  const shown = derived.filter((b) => state.bfilter === 'all' || b.st === state.bfilter);

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 40px', background: 'var(--color-bg)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <span style={{ fontSize: 12.5, fontWeight: 700 }}>시설 항목 · 블록정보</span>
        <div style={{ flex: 1 }} />
        <Seg>
          {FILTERS.map(([f, label]) => (
            <SegItem
              key={f}
              label={`${label} ${f === 'all' ? derived.length : count(f)}`}
              on={state.bfilter === f}
              onClick={() => dispatch({ type: 'SET_BFILTER', f })}
            />
          ))}
        </Seg>
      </div>

      <div style={{ fontSize: 11, color: 'var(--color-neutral-600)', lineHeight: 1.6, marginBottom: 12 }}>
        전사 시설 카탈로그 {state.catalogN}개 항목 중 이 숙소 보유 <b>{derived.filter((b) => b.st !== 'none').length}</b>개
        — 사용중 {count('used')} · 보유하지만 판매 미노출 {count('off')} · 미보유 {count('none')}. 항목 자체가 없는 시설은
        채널 전송에서 제외되고, 관련 FAQ도 자동 비활성됩니다.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 12 }}>
        {shown.map((b) => (
          <BlockCard key={b.key} b={b} />
        ))}
      </div>
    </div>
  );
};
