import { describe, expect, it } from 'vitest';
import { attrsOf, cur, feeOf, isOwn, valueOf } from '../domain/attrs';
import { auditProperty } from '../domain/audit';
import { deriveBlocks, membersOf, roomCount, roomsLabel, ruleText } from '../domain/derive';
import { composeVal, parseVal, typeOf } from '../domain/fieldTypes';
import { renderFaq } from '../domain/faq';
import { initialState } from '../domain/seed';
import { reducer, type Action } from '../state/store';
import type { Block, MasterState, Property } from '../domain/types';

const run = (st: MasterState, ...actions: Action[]) => actions.reduce(reducer, st);
const P = (st: MasterState): Property => cur(st.properties, st.current);
const block = (st: MasterState, key: string): Block => deriveBlocks(P(st)).find((b) => b.key === key)!;
const field = (st: MasterState, key: string, f: string) => block(st, key).fields.find((x) => x[0] === f)![1];
const room = (st: MasterState, code: string) => P(st).rooms.find((r) => r.code === code)!;

const A401 = '27740';
const B401 = '27743';

describe('roomsLabel', () => {
  it('collapses contiguous floors and names the rooms left out', () => {
    const p = P(initialState());
    const shared = membersOf(p, p.blocks.find((b) => b.key === 'shared_bbq')!);
    expect(roomsLabel(shared, p.rooms)).toBe('4~7층 객실 · 22객실');

    const minusA401 = shared.filter((r) => r.code !== A401);
    expect(roomsLabel(minusA401, p.rooms)).toBe('4~7층 객실 · 21객실 (A401 제외)');
  });

  it('lists floors separately when they are not contiguous', () => {
    const p = P(initialState());
    const split = p.rooms.filter((r) => r.floor === 3 || r.floor === 7);
    expect(roomsLabel(split, p.rooms)).toMatch(/^3층,7층 객실 · 10객실/);
  });

  it('says so when nothing is left', () => {
    expect(roomsLabel([], P(initialState()).rooms)).toBe('이용 객실 없음');
  });
});

describe('typed values survive a round trip', () => {
  const cases: [string, string][] = [
    ['range', '입실~23시 (오전 이용 불가)'],
    ['range', '17:00~21:00'],
    ['int:세', '8세 이상'],
    ['money', '무료'],
    ['tier', '2~4인 30,000원 / 5~6인 40,000원 (1박기준/현장결제)'],
    ['tier', '1세트 20,000원 (1박기준/현장결제)'],
    ['daterange', '26년 7월 11일 ~ 8월 17일'],
  ];

  it.each(cases)('%s: %s', (type, value) => {
    const composed = composeVal(type as never, parseVal(type as never, value));
    // 입실~23시 normalises to 입실~23:00 — the qualifier and the reference must both survive.
    expect(composed.replace('23:00', '23시')).toBe(value);
  });

  it('keeps the "이상" comparator instead of dropping it', () => {
    expect(parseVal('int:세', '8세 이상')).toEqual({ n: 8, cmp: '이상' });
  });

  it('keeps the 과금 기준 / 결제 방식 qualifiers on a fee', () => {
    const p = parseVal('tier', '1세트 20,000원 (1박기준/현장결제)');
    expect(p.unit).toBe('1박기준');
    expect(p.pay).toBe('현장결제');
  });
});

describe('field format resolution', () => {
  it('sends unknown names to an option rather than to free text', () => {
    expect(typeOf('rooftop_bar', '이용 장소')).toBe('opt:place');
    expect(typeOf('karaoke', '사용 여부')).toBe('opt:onoff');
    expect(typeOf('anything', '무엇인가')).toBe('opt:onoff');
  });

  it('reaches free text only for fields named as prose', () => {
    expect(typeOf('shared_bbq', '주의사항')).toBe('text');
    expect(typeOf('parking', '기타 안내')).toBe('text');
  });

  it('resolves formats by keyword when there is no explicit entry', () => {
    expect(typeOf('karaoke', '이용 시간')).toBe('range');
    expect(typeOf('karaoke', '이용 요금')).toBe('money');
    expect(typeOf('karaoke', '유아 연령')).toBe('int:개월');
  });
});

/* ── 1000개를 담는 구조 ───────────────────────────────────────────────────── */

describe('숙소마다 다른 모양을 같은 코드가 그린다', () => {
  it('gives each property only the attributes it declares', () => {
    const st = initialState();
    const keys = (id: string) => attrsOf(cur(st.properties, id)).map((a) => a.key);

    expect(keys('sokcho')).toContain('bbq');
    expect(keys('sokcho')).toContain('spa');
    expect(keys('sokcho')).not.toContain('camp_site');

    expect(keys('gapyeong')).toContain('private_pool');
    expect(keys('gapyeong')).toContain('pet');
    expect(keys('gapyeong')).not.toContain('bbq');

    expect(keys('hongcheon')).toContain('camp_site');
    expect(keys('hongcheon')).not.toContain('spa');
  });

  it('switches the whole console to another property without carrying state over', () => {
    const st = run(
      initialState(),
      { type: 'TOGGLE_ROOM', code: A401 },
      { type: 'SET_PROPERTY', id: 'hongcheon' },
    );
    expect(P(st).name).toBe('홍천 카라반파크');
    expect(st.sel).toEqual([]);
    expect(P(st).rooms).toHaveLength(24);
  });

  it('holds every seeded property to the same consistency rules', () => {
    initialState().properties.forEach((p) => {
      expect(auditProperty(p).filter((v) => v.severity === 'error')).toEqual([]);
    });
  });

  it('derives each property‘s facility phrases from its own attribute', () => {
    const st = run(initialState(), { type: 'SET_PROPERTY', id: 'hongcheon' });
    // 캠핑 자리는 zone 1=카라반 8 · zone 2=오토 8 · zone 3=텐트 8.
    expect(field(st, 'camping', '이용 객실')).toBe('1~3층 객실 · 24객실');
    expect(roomCount(P(st), block(st, 'shared_bbq'))).toBe(24);
  });
});

/* ── 인원은 목록이 아니라 숫자 ───────────────────────────────────────────── */

describe('인원과 요금은 숫자로 직접 넣는다', () => {
  it('accepts any number, not just the ones someone thought of in advance', () => {
    const st = run(initialState(), { type: 'PICK_CELL', code: A401, attr: 'capacity_max', value: 9 });
    expect(valueOf(P(st), room(st, A401), 'capacity_max')).toBe(9);
    expect(isOwn(room(st, A401), 'capacity_max')).toBe(true);
    expect(st.toast).toContain('9명');
  });

  it('drops the "따로 정함" mark when the number lands back on the property default', () => {
    const st = run(
      initialState(),
      { type: 'PICK_CELL', code: A401, attr: 'capacity_max', value: 9 },
      { type: 'PICK_CELL', code: A401, attr: 'capacity_max', value: 4 },
    );
    expect(isOwn(room(st, A401), 'capacity_max')).toBe(false);
    expect(valueOf(P(st), room(st, A401), 'capacity_max')).toBe(4);
  });

  it('catches a base capacity that exceeds the maximum — a mistake a fixed list could not make', () => {
    const st = run(initialState(), { type: 'PICK_CELL', code: A401, attr: 'capacity_base', value: 8 });
    const bad = auditProperty(P(st)).filter((v) => v.severity === 'error');
    expect(bad.map((v) => v.what).join()).toContain('기준 인원 8명이 최대 인원 4명보다 많습니다');
  });

  it('feeds the numeric capacity straight into the channel row', () => {
    const st = run(initialState(), { type: 'PICK_CELL', code: A401, attr: 'capacity_max', value: 9 });
    const p = P(st);
    const maxes = [...new Set(p.rooms.map((r) => Number(valueOf(p, r, 'capacity_max'))))].sort((a, b) => b - a);
    expect(maxes).toEqual([9, 6, 4]);
  });
});

/* ── 한 번 고치면 나머지가 따라온다 ──────────────────────────────────────── */

describe('A401 바베큐 이용 불가 — one edit, everything follows', () => {
  /** 값 변경은 평소 확인 창 없이 바로 반영되므로, 미리보기 내용을 볼 때만 "항상 확인"을 켭니다. */
  const previewed = () =>
    run(
      initialState(),
      { type: 'SET_SETTINGS', patch: { cascadeMode: 'always' } },
      { type: 'TOGGLE_ROOM', code: A401 },
      { type: 'OPEN_BULK' },
      { type: 'PICK_BULK_ATTR', attr: 'bbq' },
      { type: 'PICK_BULK_VALUE', value: 'none' },
      { type: 'PREVIEW_BULK' },
    );

  /** 실제 사용 흐름: 칸에서 값을 고르면 그대로 반영됩니다. */
  const edited = () => run(initialState(), { type: 'PICK_CELL', code: A401, attr: 'bbq', value: 'none' });

  it('shows the block phrase recomputing in the preview, locked', () => {
    const st = previewed();
    const derived = st.cas!.groups.find((g) => g.title.startsWith('자동으로 같이 바뀌는 것'))!;
    const phrase = derived.items.find((i) => i.label === '공용 BBQ · 이용 객실')!;
    expect(phrase.before).toBe('4~7층 객실 · 22객실');
    expect(phrase.after).toBe('4~7층 객실 · 21객실 (A401 제외)');
    expect(derived.items.every((i) => i.locked)).toBe(true);
  });

  it('writes the room and the derived phrase together on apply', () => {
    const st = edited();
    expect(valueOf(P(st), room(st, A401), 'bbq')).toBe('none');
    expect(field(st, 'shared_bbq', '이용 객실')).toBe('4~7층 객실 · 21객실 (A401 제외)');
    expect(roomCount(P(st), block(st, 'shared_bbq'))).toBe(21);
    expect(P(st).history[0].title).toContain('바베큐');
  });

  it('restores both sides on undo', () => {
    const st = run(edited(), { type: 'UNDO' });
    expect(valueOf(P(st), room(st, A401), 'bbq')).toBe('shared_gas');
    expect(field(st, 'shared_bbq', '이용 객실')).toBe('4~7층 객실 · 22객실');
    expect(P(st).history).toHaveLength(P(initialState()).history.length);
  });
});

describe('facility lifecycle', () => {
  it('drops a BBQ block to 안 씀 when its last room leaves', () => {
    const st = initialState();
    const threeF = P(st).rooms.filter((r) => r.floor === 3).map((r) => r.code);
    const gone = run(
      st,
      ...threeF.map((code): Action => ({ type: 'TOGGLE_ROOM', code })),
      { type: 'PREVIEW_DELETE' },
      { type: 'APPLY_CAS' },
    );
    expect(block(gone, 'private_bbq').st).toBe('off');
    expect(roomCount(P(gone), block(gone, 'private_bbq'))).toBe(0);
  });

  it('clears room values when a facility is switched off', () => {
    const st = run(
      initialState(),
      { type: 'PREVIEW_BLOCK_STATE', blockKey: 'private_bbq', nextSt: 'off' },
      { type: 'APPLY_CAS' },
    );
    const p = P(st);
    const third = p.rooms.filter((r) => r.floor === 3);
    expect(third.every((r) => valueOf(p, r, 'bbq') === 'none' && feeOf(p, 'bbq', 'none') === '—')).toBe(true);
  });

  it('re-attaches the picked rooms when a facility is switched back on', () => {
    const off = run(
      initialState(),
      { type: 'PREVIEW_BLOCK_STATE', blockKey: 'private_bbq', nextSt: 'off' },
      { type: 'APPLY_CAS' },
    );
    const back = run(off, { type: 'PREVIEW_BLOCK_USE', blockKey: 'private_bbq' }, { type: 'APPLY_CAS' });
    const p = P(back);
    const third = p.rooms.filter((r) => r.floor === 3);
    expect(third.every((r) => valueOf(p, r, 'bbq') === 'private_electric')).toBe(true);
    expect(roomCount(p, block(back, 'private_bbq'))).toBe(6);
  });
});

describe('fees hang off the option', () => {
  it('reaches every room using it, plus the block phrase', () => {
    const st = run(
      initialState(),
      { type: 'OPEN_OPT_FEE', attr: 'bbq', code: 'private_electric' },
      { type: 'SET_PART', k: 'amt', v: 25000 },
      { type: 'PREVIEW_EDIT' },
      { type: 'APPLY_CAS' },
    );
    const expected = '1세트 25,000원 (1박기준/현장결제)';
    expect(feeOf(P(st), 'bbq', 'private_electric')).toBe(expected);
    expect(field(st, 'private_bbq', '이용 요금')).toBe(expected);
  });

  it('restores the option fee on undo so rooms and options cannot drift', () => {
    const before = P(initialState());
    const st = run(
      initialState(),
      { type: 'OPEN_OPT_FEE', attr: 'bbq', code: 'private_electric' },
      { type: 'SET_PART', k: 'amt', v: 25000 },
      { type: 'PREVIEW_EDIT' },
      { type: 'APPLY_CAS' },
      { type: 'UNDO' },
    );
    expect(feeOf(P(st), 'bbq', 'private_electric')).toBe(feeOf(before, 'bbq', 'private_electric'));
    expect(field(st, 'private_bbq', '이용 요금')).toBe(feeOf(before, 'bbq', 'private_electric'));
  });

  it('applies to whichever attribute carries the fee — 캠핑 자리도 같은 길을 지난다', () => {
    const st = run(
      initialState(),
      { type: 'SET_PROPERTY', id: 'hongcheon' },
      { type: 'OPEN_OPT_FEE', attr: 'camp_site', code: 'tent' },
      { type: 'SET_PART', k: 'amt', v: 39000 },
      { type: 'PREVIEW_EDIT' },
      { type: 'APPLY_CAS' },
    );
    expect(feeOf(P(st), 'camp_site', 'tent')).toContain('39,000원');
    expect(field(st, 'camping', '이용 요금')).toContain('39,000원');
  });
});

describe('안내 규칙', () => {
  it('regenerates the sentence from an edited fragment', () => {
    const applied = run(
      initialState(),
      { type: 'OPEN_RULE_SLOT', blockKey: 'checkin_checkout', ri: 0, si: 0 },
      { type: 'SET_PART', k: 'h', v: '20' },
      { type: 'PREVIEW_EDIT' },
    );
    const rules = P(applied).blocks.find((b) => b.key === 'checkin_checkout')!.rules!;
    expect(ruleText(rules[0])).toBe('20:00 이후 입실 시 사전 연락 필수');
    expect(applied.toast).toContain('20:00 이후 입실 시 사전 연락 필수');
  });

  it('adds a rule from the catalogue and deletes it again', () => {
    const added = run(
      initialState(),
      { type: 'PREVIEW_RULE_ADD', blockKey: 'parking', ruleId: 'nonsmoking' },
      { type: 'APPLY_CAS' },
    );
    const rules = P(added).blocks.find((b) => b.key === 'parking')!.rules!;
    expect(rules).toHaveLength(1);
    expect(ruleText(rules[0])).toBe('전 구역 금연 · 지정 외부구역만 흡연 가능');

    const removed = run(added, { type: 'PREVIEW_RULE_DEL', blockKey: 'parking', ri: 0 }, { type: 'APPLY_CAS' });
    expect(P(removed).blocks.find((b) => b.key === 'parking')!.rules).toHaveLength(0);
  });
});

describe('FAQ answers derived from facility values', () => {
  it('quotes the current facility value', () => {
    const p = P(initialState());
    const blocks = deriveBlocks(p);
    const q15 = renderFaq(p.faqs.find((f) => f.qid === 'Q-0015')!, blocks);
    expect(q15.derived).toBe(true);
    expect(q15.a).toBe('17:00~21:00에 이용 가능합니다.');
    expect(q15.src).toBe('공용 BBQ · 이용 시간');
  });

  it('follows the facility when it changes — with nowhere else to edit it', () => {
    const st = run(
      initialState(),
      { type: 'OPEN_BLOCK_EDIT', blockKey: 'shared_bbq', k: '이용 시간', v: '17:00~21:00' },
      { type: 'SET_PART', k: 'h2', v: '22' },
      { type: 'PREVIEW_EDIT' },
      { type: 'APPLY_CAS' },
    );
    const p = P(st);
    const q15 = renderFaq(p.faqs.find((f) => f.qid === 'Q-0015')!, deriveBlocks(p));
    expect(q15.a).toBe('17:00~22:00에 이용 가능합니다.');
  });

  it('deactivates the answer when the facility is not in use', () => {
    const st = run(
      initialState(),
      { type: 'PREVIEW_BLOCK_STATE', blockKey: 'shared_bbq', nextSt: 'off' },
      { type: 'APPLY_CAS' },
    );
    const p = P(st);
    const q15 = renderFaq(p.faqs.find((f) => f.qid === 'Q-0015')!, deriveBlocks(p));
    expect(q15.blank).toBe(true);
    expect(q15.a).toBe('');
  });
});

describe('cascade preview hygiene', () => {
  it('never shows an empty auto-derived group', () => {
    const st = run(initialState(), { type: 'PREVIEW_BLOCK_STATE', blockKey: 'parking', nextSt: 'off' });
    expect(st.cas!.groups.some((g) => g.title.startsWith('자동으로 같이 바뀌는 것') && g.items.length === 0)).toBe(false);
  });

  it('값 변경은 확인 창 없이 바로 반영되고, 무엇이 바뀌었는지 문장으로 알린다', () => {
    const st = run(initialState(), { type: 'PICK_CELL', code: A401, attr: 'bbq', value: 'none' });
    expect(st.cas).toBeNull();
    expect(valueOf(P(st), room(st, A401), 'bbq')).toBe('none');
    expect(st.toast).toContain('객실 1개의 바베큐를 이용 불가로 바꿨어요.');
  });

  it('남이 따로 정해둔 값을 여러 개 덮어쓸 때만 확인 창이 뜬다', () => {
    const before = initialState();
    const third = P(before).rooms.filter((r) => r.floor === 3).map((r) => r.code);
    const st = run(
      before,
      ...third.map((code): Action => ({ type: 'TOGGLE_ROOM', code })),
      { type: 'OPEN_BULK' },
      { type: 'PICK_BULK_ATTR', attr: 'bbq' },
      { type: 'PICK_BULK_VALUE', value: 'shared_gas' },
      { type: 'PREVIEW_BULK' },
    );
    expect(st.cas).not.toBeNull();
  });
});

describe('channel mapping', () => {
  it('corrects a channel value to the dictionary rule', () => {
    const st = run(
      initialState(),
      { type: 'SYNC_CHANNEL', rowId: 'theme', ck: 'b', label: '테마', chName: '여기어때', to: '오션뷰, 가스BBQ, 스파' },
      { type: 'APPLY_CAS' },
    );
    expect(P(st).channels.theme.b).toBe('오션뷰, 가스BBQ, 스파');
  });
});

describe('the preview and the save agree', () => {
  it('shows the same fee the commit writes when switching a room to another BBQ option', () => {
    const st = initialState();
    const previewed = run(
      st,
      { type: 'SET_SETTINGS', patch: { cascadeMode: 'always' } },
      { type: 'TOGGLE_ROOM', code: B401 },
      { type: 'OPEN_BULK' },
      { type: 'PICK_BULK_ATTR', attr: 'bbq' },
      { type: 'PICK_BULK_VALUE', value: 'shared_charcoal' },
      { type: 'PREVIEW_BULK' },
    );
    const shownFee = previewed.cas!.groups.flatMap((g) => g.items).find((i) => i.label === '공용 BBQ · 이용 요금')!.after;

    const saved = run(previewed, { type: 'APPLY_CAS' });
    expect(shownFee).toBe(field(saved, 'shared_bbq', '이용 요금'));
    expect(shownFee).toContain(feeOf(P(st), 'bbq', 'shared_charcoal'));
  });
});
