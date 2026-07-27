import { useState } from 'react';
import { FIELDCAT, RULECAT } from '../../domain/catalog';
import { deriveBlocks, isCalcField, roomCount, ruleText, slotText } from '../../domain/derive';
import { typeName, typeOf } from '../../domain/fieldTypes';
import type { Block, BlockFilter, Property } from '../../domain/types';
import { current, useStore } from '../../state/store';
import { Chip, Corners, CountChip, Seg, SegItem } from '../primitives';

const FILTERS: [BlockFilter, string][] = [
  ['all', '전체'],
  ['used', '쓰는 중'],
  ['off', '있지만 안 씀'],
  ['none', '없음'],
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
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-neutral-700)' }}>안내 문구 {rules.length}개</span>
        <span style={{ fontSize: 10.5, color: 'var(--color-neutral-500)' }}>값만 고르면 문장은 자동으로 만들어집니다</span>
        <div style={{ flex: 1 }} />
        <button className="btn btn-secondary" onClick={() => setPicking((v) => !v)} style={smallBtn}>
          {picking ? '닫기' : '+ 문구 넣기'}
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
              title={`눌러서 ${typeName(s.type)} 고치기`}
            >
              {slotText(s)}
            </button>
          ))}
          {r.slots.length === 0 ? (
            <span className="tag tag-neutral" style={{ flex: 'none', fontSize: 10 }}>
              고칠 값 없음
            </span>
          ) : null}
          <button
            className="btn btn-secondary"
            onClick={() => dispatch({ type: 'PREVIEW_RULE_DEL', blockKey: b.key, ri })}
            style={{ ...smallBtn, flex: 'none' }}
          >
            빼기
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
            쓸 수 있는 문구 목록입니다. 고른 다음 숫자·시각만 이 숙소에 맞게 바꾸면 됩니다.
          </div>
          {available.length === 0 ? (
            <div style={{ fontSize: 11, color: 'var(--color-neutral-500)' }}>넣을 수 있는 문구를 다 넣었습니다.</div>
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
                        넣기
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

/** 이 시설에 넣을 수 있는 항목. 이미 있는 것과 자동 계산 필드는 뺍니다 —
 *  자동 계산은 사람이 넣는 게 아니라 시설 정의가 정하는 것이라서요. */
const FieldPicker = ({ b }: { b: Block }) => {
  const { dispatch } = useStore();
  const [open, setOpen] = useState(false);
  const have = b.fields.map((f) => f[0]);
  const available = FIELDCAT.filter((k) => !have.includes(k) && !b.computed?.[k]);

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-neutral-700)' }}>항목 {b.fields.length}개</span>
        <div style={{ flex: 1 }} />
        <button className="btn btn-secondary" onClick={() => setOpen((v) => !v)} style={smallBtn} disabled={!available.length}>
          {open ? '닫기' : available.length ? '+ 항목 넣기' : '넣을 항목 없음'}
        </button>
      </div>
      {open ? (
        <div style={{ marginTop: 7, border: '1px dashed var(--color-neutral-400)', padding: '8px 10px' }}>
          <div style={{ fontSize: 10.5, color: 'var(--color-neutral-600)', marginBottom: 6 }}>
            전사 항목 목록입니다. 넣으면 "미입력"으로 생기고, 형식에 맞는 편집기가 붙습니다.
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {available.map((k) => (
              <Chip
                key={k}
                label={k}
                padding="4px 9px"
                on={false}
                onClick={() => {
                  setOpen(false);
                  dispatch({ type: 'PREVIEW_FIELD_ADD', blockKey: b.key, fieldKey: k });
                }}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};

const BlockCard = ({ p, b }: { p: Property; b: Block }) => {
  const { dispatch } = useStore();
  const rooms = roomCount(p, b);
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
            쓰는 중
          </span>
        ) : null}
        {isOff ? (
          <span className="tag tag-neutral" style={{ fontWeight: 700 }}>
            있지만 안 씀
          </span>
        ) : null}
        {isNone ? (
          <span className="tag tag-outline" style={{ fontWeight: 700 }}>
            없음
          </span>
        ) : null}
        <div style={{ flex: 1 }} />
        {isUsed && b.memberOf ? (
          <button
            className="btn btn-secondary"
            onClick={() => dispatch({ type: 'OPEN_PICK_ROOMS', blockKey: b.key })}
            style={smallBtn}
            title="이 시설을 쓰는 객실을 다시 고릅니다"
          >
            쓰는 객실 고치기
          </button>
        ) : null}
        {isUsed ? (
          <button
            className="btn btn-secondary"
            onClick={() => dispatch({ type: 'PREVIEW_BLOCK_STATE', blockKey: b.key, nextSt: 'off' })}
            style={smallBtn}
          >
            잠시 안 쓰기
          </button>
        ) : null}
        {isOff ? (
          <button
            className="btn btn-secondary"
            onClick={() => dispatch({ type: 'PREVIEW_BLOCK_STATE', blockKey: b.key, nextSt: 'none' })}
            style={smallBtn}
          >
            이 숙소에서 없애기
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
            이 숙소에 없는 시설입니다. 추가하면 채워야 할 항목이 생기고, 판매 사이트 {b.chanN}곳과 질문·답변 {b.faqN}개가
            같이 살아납니다.
          </div>
          <button
            className="btn btn-secondary"
            onClick={() => dispatch({ type: 'PREVIEW_ADD_BLOCK_ITEM', blockKey: b.key })}
            style={{ flex: 'none', height: 28, fontSize: 12 }}
          >
            + 시설 추가하기
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
            가지고 있지만 판매 사이트에는 안 내보내는 중입니다. 관련 질문·답변 {b.faqN}개도 함께 빠져 있습니다.
          </span>
          <button
            className="btn btn-primary"
            onClick={() => dispatch({ type: 'PREVIEW_BLOCK_USE', blockKey: b.key })}
            style={{ flex: 'none', height: 28, fontSize: 12 }}
          >
            쓰기 시작
          </button>
        </div>
      ) : null}

      {!isNone ? (
        <div style={{ padding: '4px 13px 12px' }}>
          {b.fields.map(([k, v]) => {
            const calc = isCalcField(b, k);
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
                    자동 계산
                  </span>
                ) : isFree ? (
                  <span className="tag tag-neutral" style={{ flex: 'none', fontSize: 10, opacity: 0.65 }}>
                    직접 입력
                  </span>
                ) : (
                  <span className="tag tag-neutral" style={{ flex: 'none', fontSize: 10 }}>
                    {typeName(t)}
                  </span>
                )}
                {isUsed && !calc ? (
                  <>
                    <button
                      className="btn btn-secondary"
                      onClick={() => dispatch({ type: 'OPEN_BLOCK_EDIT', blockKey: b.key, k, v })}
                      style={{ ...smallBtn, height: 23, flex: 'none' }}
                    >
                      고치기
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => dispatch({ type: 'PREVIEW_FIELD_DEL', blockKey: b.key, fieldKey: k })}
                      style={{ ...smallBtn, height: 23, flex: 'none' }}
                      title="이 항목을 뺍니다"
                    >
                      빼기
                    </button>
                  </>
                ) : null}
              </div>
            );
          })}

          {isUsed ? <FieldPicker b={b} /> : null}
          {isUsed ? <RulesSection b={b} /> : null}

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 9, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10.5, color: 'var(--color-neutral-500)' }}>이어져 있는 곳</span>
            {rooms === 0 ? <CountChip tone="accent">객실 0</CountChip> : <CountChip>객실 {rooms}</CountChip>}
            <CountChip>판매 사이트 {b.chanN}</CountChip>
            {b.st !== 'used' && b.faqN > 0 ? (
              <CountChip tone="accent">질문·답변 {b.faqN} 빠짐</CountChip>
            ) : (
              <CountChip>질문·답변 {b.faqN}</CountChip>
            )}
          </div>

        </div>
      ) : null}
    </div>
  );
};

export const BlocksTab = () => {
  const { state, dispatch } = useStore();
  const p = current(state);
  const derived = deriveBlocks(p);
  /** 전사 시설 목록 = 1000개 숙소가 쓰는 시설의 합집합. 이 숙소에 없는 것도 목록에는 있습니다. */
  const catalogN = new Set(state.properties.flatMap((x) => x.blocks.map((b) => b.key))).size;
  const count = (k: BlockFilter) => derived.filter((b) => b.st === k).length;
  /** 시설이 19개면 원하는 카드를 눈으로 찾는 데 시간이 걸립니다. 이름·항목·문구까지 봅니다 —
   *  직원은 "체크인"이 어느 시설에 있는지 모른 채 "체크인"을 칩니다. */
  const q = state.bq.trim();
  const hit = (b: (typeof derived)[number]) =>
    !q ||
    `${b.label}${b.key}`.includes(q) ||
    b.fields.some((f) => `${f[0]}${f[1]}`.includes(q)) ||
    (b.rules ?? []).some((r) => ruleText(r).includes(q));
  const shown = derived.filter((b) => (state.bfilter === 'all' || b.st === state.bfilter) && hit(b));

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 40px', background: 'var(--color-bg)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.01em' }}>이 숙소가 가진 시설</span>
        <input
          className="input"
          value={state.bq}
          onChange={(e) => dispatch({ type: 'SET_BQUERY', q: e.target.value })}
          placeholder="시설·항목·문구에서 찾기"
          style={{ width: 210, minHeight: 28, fontSize: 12.5 }}
        />
        {q ? (
          <span style={{ fontSize: 11, color: 'var(--color-neutral-600)' }}>
            {shown.length}개 나옴
            <button
              className="btn btn-secondary"
              onClick={() => dispatch({ type: 'SET_BQUERY', q: '' })}
              style={{ ...smallBtn, marginLeft: 6 }}
            >
              지우기
            </button>
          </span>
        ) : null}
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
        전체 시설 목록 {catalogN}개 중 이 숙소에 있는 것 <b>{derived.filter((b) => b.st !== 'none').length}</b>개
        — 쓰는 중 {count('used')} · 있지만 안 씀 {count('off')} · 없음 {count('none')}. 없는 시설은 판매 사이트로 나가지
        않고, 그 시설을 묻는 질문·답변도 자동으로 빠집니다.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 12 }}>
        {shown.map((b) => (
          <BlockCard key={b.key} p={p} b={b} />
        ))}
      </div>
      {shown.length === 0 ? (
        <div style={{ padding: '28px 0', fontSize: 12, color: 'var(--color-neutral-500)' }}>
          "{q}"에 맞는 시설이 없습니다.
        </div>
      ) : null}
    </div>
  );
};
