import { describe, expect, it } from 'vitest';
import { deriveBlocks, roomsLabel, ruleText } from '../domain/derive';
import { composeVal, parseVal, typeOf } from '../domain/fieldTypes';
import { renderFaq } from '../domain/faq';
import { initialState } from '../domain/seed';
import { reducer, type Action } from '../state/store';
import type { Block, MasterState } from '../domain/types';

const run = (st: MasterState, ...actions: Action[]) => actions.reduce(reducer, st);
const block = (st: MasterState, key: string): Block =>
  deriveBlocks(st.rooms, st.blocks).find((b) => b.key === key)!;
const field = (st: MasterState, key: string, f: string) => block(st, key).fields.find((x) => x[0] === f)![1];

const A401 = '27740';

describe('roomsLabel', () => {
  it('collapses contiguous floors and names the rooms left out', () => {
    const st = initialState();
    const shared = st.rooms.filter((r) => r.bbq.includes('공용BBQ'));
    expect(roomsLabel(shared, st.rooms)).toBe('4~7층 객실 · 22객실');

    const minusA401 = shared.filter((r) => r.code !== A401);
    expect(roomsLabel(minusA401, st.rooms)).toBe('4~7층 객실 · 21객실 (A401 제외)');
  });

  it('lists floors separately when they are not contiguous', () => {
    const st = initialState();
    const split = st.rooms.filter((r) => r.floor === 3 || r.floor === 7);
    expect(roomsLabel(split, st.rooms)).toMatch(/^3층,7층 객실 · 10객실/);
  });

  it('says so when nothing is left', () => {
    expect(roomsLabel([], initialState().rooms)).toBe('이용 객실 없음');
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

describe('A401 바베큐 이용 불가 — one edit, everything follows', () => {
  const edited = () => {
    const st = initialState();
    return run(
      st,
      { type: 'EDIT_ROOM_FIELD', code: A401, field: 'bbq' },
      { type: 'PICK_BULK_VALUE', value: '이용 불가' },
      { type: 'PREVIEW_BULK' },
    );
  };

  it('shows the block phrase recomputing in the preview, locked', () => {
    const st = edited();
    const derived = st.cas!.groups.find((g) => g.title.startsWith('숙소 블록'))!;
    const phrase = derived.items.find((i) => i.label === '공용 BBQ · 이용 객실')!;
    expect(phrase.before).toBe('4~7층 객실 · 22객실');
    expect(phrase.after).toBe('4~7층 객실 · 21객실 (A401 제외)');
    expect(phrase.locked).toBe(true);
    expect(derived.items.every((i) => i.locked)).toBe(true);
  });

  it('writes the room and the derived phrase together on apply', () => {
    const st = run(edited(), { type: 'APPLY_CAS' });
    expect(st.rooms.find((r) => r.code === A401)!.bbq).toBe('이용 불가');
    expect(field(st, 'shared_bbq', '이용 객실')).toBe('4~7층 객실 · 21객실 (A401 제외)');
    expect(block(st, 'shared_bbq').rooms).toBe(21);
    expect(st.history[0].title).toContain('바베큐 유형');
  });

  it('restores both sides on undo', () => {
    const st = run(edited(), { type: 'APPLY_CAS' }, { type: 'UNDO' });
    expect(st.rooms.find((r) => r.code === A401)!.bbq).toBe('공용BBQ · 가스그릴');
    expect(field(st, 'shared_bbq', '이용 객실')).toBe('4~7층 객실 · 22객실');
    expect(st.history).toHaveLength(initialState().history.length);
  });
});

describe('facility lifecycle', () => {
  it('drops a BBQ block to 사용안함 when its last room leaves', () => {
    const st = initialState();
    const threeF = st.rooms.filter((r) => r.floor === 3).map((r) => r.code);
    const gone = run(
      st,
      ...threeF.map((code): Action => ({ type: 'TOGGLE_ROOM', code })),
      { type: 'PREVIEW_DELETE' },
      { type: 'APPLY_CAS' },
    );
    expect(block(gone, 'private_bbq').st).toBe('off');
    expect(block(gone, 'private_bbq').rooms).toBe(0);
  });

  it('clears room values when a facility is switched off', () => {
    const st = run(
      initialState(),
      { type: 'PREVIEW_BLOCK_STATE', blockKey: 'private_bbq', nextSt: 'off' },
      { type: 'APPLY_CAS' },
    );
    const third = st.rooms.filter((r) => r.floor === 3);
    expect(third.every((r) => r.bbq === '이용 불가' && r.bbqOpt === 'none' && r.bbqFee === '—')).toBe(true);
  });

  it('re-attaches the picked rooms when a facility is switched back on', () => {
    const off = run(
      initialState(),
      { type: 'PREVIEW_BLOCK_STATE', blockKey: 'private_bbq', nextSt: 'off' },
      { type: 'APPLY_CAS' },
    );
    const back = run(off, { type: 'PREVIEW_BLOCK_USE', blockKey: 'private_bbq' }, { type: 'APPLY_CAS' });
    const third = back.rooms.filter((r) => r.floor === 3);
    expect(third.every((r) => r.bbq === '개별BBQ · 전기그릴')).toBe(true);
    // The fee comes from the option, not from a hardcoded number in the revive path.
    expect(third.every((r) => r.bbqFee === back.optFees.private_electric)).toBe(true);
    expect(block(back, 'private_bbq').rooms).toBe(6);
  });
});

describe('fees hang off the option', () => {
  it('reaches every room using it, plus the block phrase', () => {
    const st = run(
      initialState(),
      { type: 'OPEN_OPT_FEE', code: 'private_electric' },
      { type: 'SET_PART', k: 'amt', v: 25000 },
      { type: 'PREVIEW_EDIT' },
      { type: 'APPLY_CAS' },
    );
    const expected = '1세트 25,000원 (1박기준/현장결제)';
    expect(st.optFees.private_electric).toBe(expected);
    expect(st.rooms.filter((r) => r.bbqOpt === 'private_electric').every((r) => r.bbqFee === expected)).toBe(true);
    expect(field(st, 'private_bbq', '이용 요금')).toBe(expected);
  });

  it('restores the option fee on undo so rooms and options cannot drift', () => {
    const before = initialState();
    const st = run(
      before,
      { type: 'OPEN_OPT_FEE', code: 'private_electric' },
      { type: 'SET_PART', k: 'amt', v: 25000 },
      { type: 'PREVIEW_EDIT' },
      { type: 'APPLY_CAS' },
      { type: 'UNDO' },
    );
    expect(st.optFees.private_electric).toBe(before.optFees.private_electric);
    expect(st.rooms.filter((r) => r.bbqOpt === 'private_electric').every((r) => r.bbqFee === before.optFees.private_electric)).toBe(true);
  });
});

describe('안내 규칙', () => {
  it('regenerates the sentence from an edited fragment', () => {
    const st = run(
      initialState(),
      { type: 'OPEN_RULE_SLOT', blockKey: 'checkin_checkout', ri: 0, si: 0 },
      { type: 'SET_PART', k: 'h', v: '20' },
      { type: 'PREVIEW_EDIT' },
    );
    expect(st.cas!.from).toBe('21:00 이후 입실 시 사전 연락 필수');
    expect(st.cas!.to).toBe('20:00 이후 입실 시 사전 연락 필수');

    const applied = run(st, { type: 'APPLY_CAS' });
    const rules = applied.blocks.find((b) => b.key === 'checkin_checkout')!.rules!;
    expect(ruleText(rules[0])).toBe('20:00 이후 입실 시 사전 연락 필수');
  });

  it('adds a rule from the catalogue and deletes it again', () => {
    const added = run(
      initialState(),
      { type: 'PREVIEW_RULE_ADD', blockKey: 'parking', ruleId: 'nonsmoking' },
      { type: 'APPLY_CAS' },
    );
    const rules = added.blocks.find((b) => b.key === 'parking')!.rules!;
    expect(rules).toHaveLength(1);
    expect(ruleText(rules[0])).toBe('전 구역 금연 · 지정 외부구역만 흡연 가능');

    const removed = run(added, { type: 'PREVIEW_RULE_DEL', blockKey: 'parking', ri: 0 }, { type: 'APPLY_CAS' });
    expect(removed.blocks.find((b) => b.key === 'parking')!.rules).toHaveLength(0);
  });
});

describe('FAQ answers derived from facility values', () => {
  it('quotes the current facility value', () => {
    const st = initialState();
    const blocks = deriveBlocks(st.rooms, st.blocks);
    const q15 = renderFaq(st.faqs.find((f) => f.qid === 'Q-0015')!, blocks);
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
    const q15 = renderFaq(st.faqs.find((f) => f.qid === 'Q-0015')!, deriveBlocks(st.rooms, st.blocks));
    expect(q15.a).toBe('17:00~22:00에 이용 가능합니다.');
  });

  it('deactivates the answer when the facility is not in use', () => {
    const st = run(
      initialState(),
      { type: 'PREVIEW_BLOCK_STATE', blockKey: 'shared_bbq', nextSt: 'off' },
      { type: 'APPLY_CAS' },
    );
    const q15 = renderFaq(st.faqs.find((f) => f.qid === 'Q-0015')!, deriveBlocks(st.rooms, st.blocks));
    expect(q15.blank).toBe(true);
    expect(q15.a).toBe('');
  });
});

describe('cascade preview hygiene', () => {
  it('never shows an empty auto-derived group', () => {
    const st = run(
      initialState(),
      { type: 'PREVIEW_BLOCK_STATE', blockKey: 'parking', nextSt: 'off' },
    );
    expect(st.cas!.groups.some((g) => g.title.startsWith('숙소 블록 · 자동 재생성') && g.items.length === 0)).toBe(false);
  });

  it('applies straight away in 즉시 적용 mode', () => {
    const st = run(
      initialState(),
      { type: 'SET_SETTINGS', patch: { cascadeMode: 'instant' } },
      { type: 'EDIT_ROOM_FIELD', code: A401, field: 'bbq' },
      { type: 'PICK_BULK_VALUE', value: '이용 불가' },
      { type: 'PREVIEW_BULK' },
    );
    expect(st.cas).toBeNull();
    expect(st.rooms.find((r) => r.code === A401)!.bbq).toBe('이용 불가');
    expect(st.toast).toContain('연쇄 갱신');
  });
});

describe('channel mapping', () => {
  it('corrects a channel value to the dictionary rule', () => {
    const st = run(
      initialState(),
      { type: 'SYNC_CHANNEL', rowId: 'theme', ck: 'b', label: '테마', chName: '여기어때', to: '가족추천, 커플, 실외수영장' },
      { type: 'APPLY_CAS' },
    );
    expect(st.channels.theme.b).toBe('가족추천, 커플, 실외수영장');
  });
});

describe('the preview and the save agree', () => {
  it('shows the same fee the commit writes when switching a room to another BBQ option', () => {
    const st = initialState();
    const b401 = st.rooms.find((r) => r.short === 'B401')!.code;
    const previewed = run(
      st,
      { type: 'EDIT_ROOM_FIELD', code: b401, field: 'bbq' },
      { type: 'PICK_BULK_VALUE', value: '공용BBQ · 숯불' },
      { type: 'PREVIEW_BULK' },
    );
    const shownFee = previewed
      .cas!.groups.flatMap((g) => g.items)
      .find((i) => i.label === '공용 BBQ · 이용 요금')!.after;

    const saved = run(previewed, { type: 'APPLY_CAS' });
    expect(shownFee).toBe(field(saved, 'shared_bbq', '이용 요금'));
    expect(shownFee).toContain(st.optFees.shared_charcoal);
  });
});
