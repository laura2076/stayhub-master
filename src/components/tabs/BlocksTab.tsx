import { useState } from 'react';
import { FIELDCAT, RULECAT } from '../../domain/catalog';
import { ownRooms } from '../../domain/blockValues';
import { canSplit, deriveBlocks, isCalcField, membersOf, roomCount, ruleText, slotText } from '../../domain/derive';
import { typeName, typeOf } from '../../domain/fieldTypes';
import type { Block, BlockFilter, Property, Rule } from '../../domain/types';
import { current, useStore } from '../../state/store';
import { Chip, Corners, CountChip, Seg, SegItem } from '../primitives';

const FILTERS: [BlockFilter, string][] = [
  ['all', '전체'],
  ['used', '쓰는 중'],
  ['off', '있지만 안 씀'],
  ['none', '없음'],
];

const smallBtn = { height: 22, padding: '0 8px', fontSize: 11 } as const;

/** 눌러서 고치는 값. 객실 표와 **같은 규칙**입니다 — 점선 밑줄이면 누를 수 있다는 뜻.
 *  전에는 값 옆에 [형식 태그][고치기] 버튼이 따라붙어 카드 한 장에 버튼이 25개였습니다. */
const EditableValue = ({ v, title, onClick }: { v: string; title: string; onClick: () => void }) => (
  <span
    onClick={onClick}
    className="hov-accent"
    title={title}
    style={{
      cursor: 'pointer',
      borderBottom: '1px dashed var(--color-neutral-400)',
      padding: '1px 2px',
      margin: '-1px -2px',
    }}
  >
    {v}
  </span>
);

/** 문장 안의 숫자·시각을 그 자리에서 누르게 합니다.
 *  전에는 문장 뒤에 조각마다 버튼이 붙어 `퇴실 지연 시 … [1시간] [50,000원] [빼기]`였는데,
 *  이제 `퇴실 지연 시 사전 요청 · 1시간 초과 시 50,000원 추가`에서 숫자만 눌립니다. */
const RuleSentence = ({ r, blockKey, ri }: { r: Rule; blockKey: string; ri: number }) => {
  const { dispatch } = useStore();
  const parts = r.tpl.split(/(\{\w+\})/g);
  return (
    <span style={{ fontSize: 11.5, lineHeight: 1.6 }}>
      {parts.map((seg, i) => {
        const m = seg.match(/^\{(\w+)\}$/);
        if (!m) return <span key={i}>{seg}</span>;
        const si = r.slots.findIndex((s) => s.k === m[1]);
        if (si < 0) return <span key={i}>{seg}</span>;
        const s = r.slots[si];
        return (
          <EditableValue
            key={i}
            v={slotText(s)}
            title={`눌러서 ${typeName(s.type)} 수정`}
            onClick={() => dispatch({ type: 'OPEN_RULE_SLOT', blockKey, ri, si })}
          />
        );
      })}
    </span>
  );
};

/** 항목과 문구를 한 자리에서 넣습니다 — 전에는 카드마다 넣기 버튼이 둘이었습니다. */
const AddPanel = ({ b }: { b: Block }) => {
  const { dispatch } = useStore();
  const [open, setOpen] = useState<'' | 'field' | 'rule'>('');
  const have = b.fields.map((f) => f[0]);
  const fields = FIELDCAT.filter((k) => !have.includes(k) && !b.computed?.[k]);
  const owned = (b.rules ?? []).map((r) => r.id);
  const rules = RULECAT.filter((c) => (!c.blocks || c.blocks.includes(b.key)) && (c.repeatable || !owned.includes(c.id)));
  const groups = [...new Set(rules.map((c) => c.group))];

  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          className="btn btn-secondary"
          onClick={() => setOpen((v) => (v === 'field' ? '' : 'field'))}
          style={smallBtn}
          disabled={!fields.length}
        >
          + 항목
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => setOpen((v) => (v === 'rule' ? '' : 'rule'))}
          style={smallBtn}
          disabled={!rules.length}
        >
          + 안내 문구
        </button>
      </div>

      {open === 'field' ? (
        <div style={{ marginTop: 7, border: '1px dashed var(--color-neutral-400)', borderRadius: 'var(--radius-sm)', padding: '8px 10px' }}>
          <div style={{ fontSize: 10.5, color: 'var(--color-neutral-600)', marginBottom: 6 }}>
            넣으면 "미입력"으로 생기고, 값을 누르면 형식에 맞는 편집기가 뜹니다.
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {fields.map((k) => (
              <Chip
                key={k}
                label={k}
                padding="4px 9px"
                on={false}
                onClick={() => {
                  setOpen('');
                  dispatch({ type: 'PREVIEW_FIELD_ADD', blockKey: b.key, fieldKey: k });
                }}
              />
            ))}
          </div>
        </div>
      ) : null}

      {open === 'rule' ? (
        <div
          style={{
            marginTop: 7,
            border: '1px dashed var(--color-neutral-400)',
            borderRadius: 'var(--radius-sm)',
            padding: '8px 10px',
            maxHeight: 260,
            overflowY: 'auto',
          }}
        >
          <div style={{ fontSize: 10.5, color: 'var(--color-neutral-600)', marginBottom: 6 }}>
            고른 다음 숫자·시각만 이 숙소에 맞게 바꾸면 됩니다.
          </div>
          {groups.map((g) => (
            <div key={g} style={{ marginBottom: 6 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-neutral-500)', padding: '4px 0 2px' }}>{g}</div>
              {rules
                .filter((c) => c.group === g)
                .map((c) => (
                  <div
                    key={c.id}
                    onClick={() => {
                      setOpen('');
                      dispatch({ type: 'PREVIEW_RULE_ADD', blockKey: b.key, ruleId: c.id });
                    }}
                    className="hov-surface"
                    style={{ padding: '4px 6px', margin: '0 -6px', fontSize: 11.5, cursor: 'pointer', borderRadius: 'var(--radius-sm)' }}
                  >
                    {ruleText(c)}
                  </div>
                ))}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
};

const BlockCard = ({ p, b }: { p: Property; b: Block }) => {
  const { dispatch } = useStore();
  const rooms = roomCount(p, b);
  /** 이 시설이 걸린 객실 — 항목을 객실마다 다르게 정할 때의 대상 범위입니다. */
  const scope = b.memberOf ? membersOf(p, b) : p.rooms;
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
        <span style={{ fontSize: 13, fontWeight: 800 }}>{b.label}</span>
        {isUsed ? <span className="tag tag-accent">쓰는 중</span> : null}
        {isOff ? <span className="tag tag-neutral">있지만 안 씀</span> : null}
        {isNone ? <span className="tag tag-outline">없음</span> : null}
        <div style={{ flex: 1 }} />
        {isUsed && b.memberOf ? (
          <button
            className="btn btn-secondary"
            onClick={() => dispatch({ type: 'OPEN_BLOCK_ROOMS', blockKey: b.key })}
            style={smallBtn}
          >
            쓰는 객실 수정
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
      </div>

      {isNone ? (
        <div style={{ padding: '12px 13px', display: 'flex', alignItems: 'center', gap: 11 }}>
          <div style={{ flex: 1, fontSize: 11.5, lineHeight: 1.6, color: 'var(--color-neutral-600)' }}>
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
        <div style={{ padding: '6px 13px 12px' }}>
          {b.fields.map(([k, v]) => {
            const calc = isCalcField(b, k);
            /** 이 항목을 따로 정한 객실이 몇 개인지. 0이면 숙소 하나에 값도 하나입니다. */
            const own = canSplit(b, k) ? ownRooms(b, scope, k).length : 0;
            return (
              <div
                key={k}
                className="row"
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  padding: '6px 0',
                  borderBottom: '1px solid var(--color-surface)',
                }}
              >
                <span style={{ width: 88, flex: 'none', fontSize: 11, color: 'var(--color-neutral-600)', paddingTop: 1 }}>
                  {k}
                </span>
                <span style={{ flex: 1, fontSize: 12, lineHeight: 1.5, minWidth: 0 }}>
                  {calc || !isUsed ? (
                    <span style={{ color: calc ? 'var(--color-neutral-600)' : undefined }}>{v}</span>
                  ) : (
                    <EditableValue
                      v={v}
                      title={`눌러서 ${typeName(typeOf(b.key, k))} 수정${own ? ' (따로 정하지 않은 객실만)' : ''}`}
                      onClick={() => dispatch({ type: 'OPEN_BLOCK_EDIT', blockKey: b.key, k })}
                    />
                  )}
                  {/** 갈려 있으면 그 사실을 값 옆에 적습니다 — 카드만 보고도 "이 시설은 객실마다 다르다"를 압니다. */}
                  {own ? (
                    <span
                      onClick={() => dispatch({ type: 'OPEN_BLOCK_ROOMS', blockKey: b.key, fieldKey: k })}
                      className="hov-accent"
                      title="눌러서 객실별 값 수정"
                      style={{ marginLeft: 6, fontSize: 10.5, color: 'var(--color-neutral-600)', cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      객실 {own}개 따로
                    </span>
                  ) : null}
                </span>
                {calc ? (
                  /** 알약 모양이면 눌러야 할 것처럼 보입니다. 이건 누를 수 없는 것이므로 글자로만. */
                  <span style={{ flex: 'none', fontSize: 10, color: 'var(--color-neutral-500)', paddingTop: 2 }}>
                    자동 계산
                  </span>
                ) : isUsed ? (
                  <span className="row-actions" style={{ flex: 'none', display: 'flex', gap: 4 }}>
                    {canSplit(b, k) && scope.length > 1 ? (
                      <button
                        className="btn btn-secondary"
                        onClick={() => dispatch({ type: 'OPEN_BLOCK_ROOMS', blockKey: b.key, fieldKey: k })}
                        style={{ ...smallBtn, height: 20, fontSize: 10.5 }}
                      >
                        객실별
                      </button>
                    ) : null}
                    <button
                      className="btn btn-secondary"
                      onClick={() => dispatch({ type: 'PREVIEW_FIELD_DEL', blockKey: b.key, fieldKey: k })}
                      style={{ ...smallBtn, height: 20, fontSize: 10.5 }}
                    >
                      제외
                    </button>
                  </span>
                ) : null}
              </div>
            );
          })}

          {isUsed && (b.rules ?? []).length ? (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-neutral-600)', marginBottom: 3 }}>
                안내 문구 {(b.rules ?? []).length}개
                <span style={{ fontWeight: 400, marginLeft: 6, color: 'var(--color-neutral-500)' }}>
                  숫자를 누르면 문장이 다시 만들어집니다
                </span>
              </div>
              {(b.rules ?? []).map((r, ri) => (
                <div
                  key={`${r.tpl}-${ri}`}
                  className="row"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '3px 0',
                    borderBottom: '1px solid var(--color-surface)',
                  }}
                >
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <RuleSentence r={r} blockKey={b.key} ri={ri} />
                  </span>
                  <span className="row-actions" style={{ flex: 'none' }}>
                    <button
                      className="btn btn-secondary"
                      onClick={() => dispatch({ type: 'PREVIEW_RULE_DEL', blockKey: b.key, ri })}
                      style={{ ...smallBtn, height: 20, fontSize: 10.5 }}
                    >
                      제외
                    </button>
                  </span>
                </div>
              ))}
            </div>
          ) : null}

          {isUsed ? <AddPanel b={b} /> : null}

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
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
  const mine = derived.filter((b) => b.st !== 'none').length;

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 40px', background: 'var(--color-bg)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.01em' }}>이 숙소가 가진 시설 {mine}</span>
        <input
          className="input"
          value={state.bq}
          onChange={(e) => dispatch({ type: 'SET_BQUERY', q: e.target.value })}
          placeholder="시설·항목·문구에서 찾기"
          style={{ width: 210, minHeight: 28, fontSize: 12.5 }}
        />
        {q ? <span style={{ fontSize: 11, color: 'var(--color-neutral-600)' }}>{shown.length}개 나옴</span> : null}
        <div style={{ flex: 1 }} />
        <Seg>
          {FILTERS.map(([f, label], i) => (
            <SegItem
              key={f}
              label={`${label} ${f === 'all' ? derived.length : count(f)}`}
              on={state.bfilter === f}
              onClick={() => dispatch({ type: 'SET_BFILTER', f })}
              borderLeft={i > 0}
            />
          ))}
        </Seg>
      </div>

      <div style={{ fontSize: 11, color: 'var(--color-neutral-600)', lineHeight: 1.6, marginBottom: 12 }}>
        전체 시설 목록 {catalogN}개 중 이 숙소에 있는 것 <b>{mine}</b>개 — 쓰는 중 {count('used')} · 있지만 안 씀{' '}
        {count('off')} · 없음 {count('none')}. 없는 시설은 판매 사이트로 나가지 않고, 그 시설을 묻는 질문·답변도 자동으로
        빠집니다. <b>값을 누르면 수정할 수 있습니다.</b>
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
