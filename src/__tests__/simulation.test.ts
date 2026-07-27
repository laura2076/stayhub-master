import { describe, expect, it } from 'vitest';
import { attrsOf, cur, feeOf, isOwn, showValue, valueOf } from '../domain/attrs';
import { audit, errorsOf } from '../domain/audit';
import { channelRows, deriveBlocks, roomCount, ruleText } from '../domain/derive';
import { renderFaq } from '../domain/faq';
import { initialState } from '../domain/seed';
import type { MasterState, Property, Room } from '../domain/types';
import { reducer, type Action } from '../state/store';

/* 직원 시나리오 시뮬레이션.
 *
 * 각 단계마다 실제 화면이 보내는 액션 순서 그대로 상태를 굴리고, 매 단계 끝에서
 * 일관성 검사(domain/audit.ts)를 돌립니다. 검사가 하나라도 걸리면 그 단계에서
 * "사람이 따로 챙겨야 하는 상태"가 생겼다는 뜻입니다. 검사는 세 숙소 전부를 봅니다. */

const run = (st: MasterState, ...actions: Action[]) => actions.reduce(reducer, st);
const P = (st: MasterState): Property => cur(st.properties, st.current);
const block = (st: MasterState, key: string) => deriveBlocks(P(st)).find((b) => b.key === key)!;
const field = (st: MasterState, key: string, f: string) => block(st, key).fields.find((x) => x[0] === f)![1];
const faq = (st: MasterState, qid: string) => renderFaq(P(st).faqs.find((f) => f.qid === qid)!, deriveBlocks(P(st)));
const room = (st: MasterState, name: string): Room => P(st).rooms.find((r) => r.name === name)!;
const fee = (st: MasterState, attr: string, r: Room) => feeOf(P(st), attr, valueOf(P(st), r, attr));
const replace = (st: MasterState, next: Property): MasterState => ({
  ...st,
  properties: st.properties.map((p) => (p.id === next.id ? next : p)),
});

const log: string[] = [];
const step = (title: string, st: MasterState, lines: string[]) => {
  const found = audit(st);
  log.push(
    [
      `\n■ ${title}`,
      ...lines.map((l) => `   ${l}`),
      `   검사: ${found.length === 0 ? '이상 없음' : found.map((f) => `[${f.severity}] ${f.where} — ${f.what}`).join('\n         ')}`,
    ].join('\n'),
  );
  return found;
};

/** 미리보기 → 적용까지 한 번에. 실제 화면의 "적용하고 저장" 버튼과 같습니다. */
const commit = (st: MasterState, ...preview: Action[]) => run(st, ...preview, { type: 'APPLY_CAS' });

describe('직원 시나리오 — 객실 추가·삭제', () => {
  it('4층에 객실을 추가하면 시설 문구·객실 수가 따라오고 어긋남이 없다', () => {
    const before = initialState();
    const after = commit(
      before,
      { type: 'OPEN_NEW_ROOM' },
      { type: 'SET_NR', patch: { name: 'A404', floorText: '4' } },
      { type: 'PREVIEW_NEW_ROOM' },
    );

    expect(P(after).rooms).toHaveLength(29);
    expect(field(after, 'shared_bbq', '이용 객실')).toBe('4~7층 객실 · 23객실');
    /** 아무것도 안 고른 항목은 숙소 전체값을 그대로 씁니다 — 요금도 그 값에서 따라옵니다. */
    expect(fee(after, 'bbq', room(after, 'A404'))).toBe(feeOf(P(after), 'bbq', 'shared_gas'));

    const found = step('객실 추가 · A404 (4층 · 전체값 그대로)', after, [
      `객실 수 ${P(before).rooms.length} → ${P(after).rooms.length}`,
      `공용 BBQ 이용 객실: ${field(before, 'shared_bbq', '이용 객실')} → ${field(after, 'shared_bbq', '이용 객실')}`,
      `A404 바베큐 요금(값에서 따라옴): ${fee(after, 'bbq', room(after, 'A404'))}`,
      `A404 기준/최대 인원(숫자): ${valueOf(P(after), room(after, 'A404'), 'capacity_base')} / ${valueOf(P(after), room(after, 'A404'), 'capacity_max')}`,
      `기록: ${P(after).history[0].title} · 같이 바뀐 것 ${P(after).history[0].n}건`,
    ]);
    expect(found.filter((f) => f.severity === 'error')).toEqual([]);
  });

  it('3층에 개별BBQ 객실을 추가하면 개별 BBQ가 6 → 7객실로 늘어난다', () => {
    const after = commit(
      initialState(),
      { type: 'OPEN_NEW_ROOM' },
      { type: 'SET_NR', patch: { name: 'C301', floorText: '3' } },
      { type: 'SET_NR_VALUE', attr: 'bbq', v: 'private_electric' },
      { type: 'PREVIEW_NEW_ROOM' },
    );

    expect(roomCount(P(after), block(after, 'private_bbq'))).toBe(7);
    expect(field(after, 'private_bbq', '이용 객실')).toBe('3층 객실 · 7객실');

    const found = step('객실 추가 · C301 (3층 · 개별BBQ)', after, [
      `개별 BBQ 이용 객실: ${field(after, 'private_bbq', '이용 객실')}`,
      `개별 BBQ 이용 요금(값에서 따라옴): ${field(after, 'private_bbq', '이용 요금')}`,
      `FAQ Q-0019: ${faq(after, 'Q-0019').a}`,
    ]);
    expect(found.filter((f) => f.severity === 'error')).toEqual([]);
  });

  it('객실을 지우면 남은 객실에서 문구가 다시 계산된다', () => {
    const before = initialState();
    const after = commit(
      before,
      { type: 'TOGGLE_ROOM', code: room(before, 'A403').code },
      { type: 'TOGGLE_ROOM', code: room(before, 'B403').code },
      { type: 'PREVIEW_DELETE' },
    );

    expect(P(after).rooms).toHaveLength(26);
    expect(field(after, 'shared_bbq', '이용 객실')).toBe('4~7층 객실 · 20객실');

    const found = step('객실 지우기 · A403 · B403', after, [
      `객실 수 ${P(before).rooms.length} → ${P(after).rooms.length}`,
      `공용 BBQ 이용 객실: ${field(after, 'shared_bbq', '이용 객실')}`,
      `선택 상태 초기화: ${after.sel.length === 0 ? '됨' : '안 됨'}`,
    ]);
    expect(found.filter((f) => f.severity === 'error')).toEqual([]);
  });

  it('3층 6실을 모두 지우면 개별 BBQ가 저절로 안 쓰는 상태가 된다', () => {
    const before = initialState();
    const third = P(before).rooms.filter((r) => r.floor === 3).map((r) => r.code);
    const after = commit(before, ...third.map((code): Action => ({ type: 'TOGGLE_ROOM', code })), {
      type: 'PREVIEW_DELETE',
    });

    expect(block(after, 'private_bbq').st).toBe('off');
    expect(faq(after, 'Q-0019').blank).toBe(true);

    const found = step('객실 지우기 · 3층 6실 전체', after, [
      `개별 BBQ 상태: 쓰는 중 → ${block(after, 'private_bbq').st === 'off' ? '있지만 안 씀' : '???'}`,
      `개별 BBQ 이용 객실: ${field(after, 'private_bbq', '이용 객실')}`,
      `FAQ Q-0019(개별BBQ 인용): ${faq(after, 'Q-0019').blank ? '자동으로 빠짐' : faq(after, 'Q-0019').a}`,
    ]);
    expect(found.filter((f) => f.severity === 'error')).toEqual([]);
  });
});

describe('직원 시나리오 — 인원을 숫자로 수정', () => {
  it('목록에 없던 인원도 그대로 들어가고, 판매 사이트 값까지 따라온다', () => {
    const before = initialState();
    const after = run(before, { type: 'PICK_CELL', code: room(before, 'A701').code, attr: 'capacity_max', value: 9 });

    expect(valueOf(P(after), room(after, 'A701'), 'capacity_max')).toBe(9);
    const maxRow = channelRows(P(after)).find((r) => r.id === 'maxpax')!;
    expect(maxRow.master).toContain('9명');

    const found = step('객실 · A701 최대 인원 6명 → 9명 (직접 입력)', after, [
      `A701 최대 인원: 6명 → ${valueOf(P(after), room(after, 'A701'), 'capacity_max')}명`,
      `판매 사이트 기준값: ${maxRow.master}`,
      `알림: ${after.toast}`,
    ]);
    expect(found.filter((f) => f.severity === 'error')).toEqual([]);
  });

  it('한꺼번에 바꾸기로 7층 4실의 기준 인원을 5명으로 올린다', () => {
    const before = initialState();
    const seventh = P(before).rooms.filter((r) => r.floor === 7).map((r) => r.code);
    const after = commit(
      before,
      ...seventh.map((code): Action => ({ type: 'TOGGLE_ROOM', code })),
      { type: 'OPEN_BULK' },
      { type: 'PICK_BULK_ATTR', attr: 'capacity_base' },
      { type: 'PICK_BULK_VALUE', value: 5 },
      { type: 'PREVIEW_BULK' },
    );

    const p = P(after);
    expect(p.rooms.filter((r) => r.floor === 7).every((r) => valueOf(p, r, 'capacity_base') === 5)).toBe(true);
    /** 7층 최대는 6명이라 5명은 아직 규칙 안입니다 — 넘어서면 검사가 잡습니다. */
    expect(errorsOf(after)).toEqual([]);

    const found = step('한꺼번에 · 7층 4실 기준 인원 4명 → 5명', after, [
      `대상: ${seventh.length}실`,
      `기준/최대: 5명 / ${valueOf(p, room(after, 'A701'), 'capacity_max')}명`,
      `추가인원 요금(전체값): ${p.defaults.extra_fee}원`,
    ]);
    expect(found.filter((f) => f.severity === 'error')).toEqual([]);
  });

  it('추가인원 요금도 숫자로 고치고, 그 자리에서 값이 남는다', () => {
    const before = initialState();
    const after = run(before, { type: 'PICK_CELL', code: room(before, 'A301').code, attr: 'extra_fee', value: 45000 });
    expect(valueOf(P(after), room(after, 'A301'), 'extra_fee')).toBe(45000);

    const found = step('객실 · A301 추가인원 요금 30,000 → 45,000 (직접 입력)', after, [
      `A301 추가인원 요금: ${valueOf(P(after), room(after, 'A301'), 'extra_fee')}원`,
      `나머지 27실: 전체값 ${P(after).defaults.extra_fee}원 그대로`,
    ]);
    expect(found.filter((f) => f.severity === 'error')).toEqual([]);
  });
});

describe('직원 시나리오 — 한 창에서 고르고 객실마다 다른 값 넣기', () => {
  /** 참고한 화면(Biz회원 할인 수정)의 패턴입니다 — 왼쪽에서 골라 오른쪽으로 보내고,
   *  일괄값을 넣되 항목마다 덮어씁니다. 전에는 "고른 객실 전부 같은 값"만 됐습니다. */
  it('창 안에서 층째로 고르고, 그중 일부만 다른 값을 넣는다', () => {
    const before = initialState();
    const a301 = room(before, 'A301').code;
    const a302 = room(before, 'A302').code;

    const after = commit(
      before,
      { type: 'OPEN_BULK' },
      { type: 'BULK_CLEAR_SEL' },
      { type: 'BULK_TOGGLE_FLOOR', floor: 3 },
      { type: 'PICK_BULK_ATTR', attr: 'capacity_max' },
      { type: 'PICK_BULK_VALUE', value: 6 },
      { type: 'SET_BULK_PER', code: a301, value: 8 },
      { type: 'SET_BULK_PER', code: a302, value: 8 },
      { type: 'PREVIEW_BULK' },
    );

    const q = P(after);
    expect(valueOf(q, q.rooms.find((r) => r.code === a301)!, 'capacity_max')).toBe(8);
    expect(valueOf(q, q.rooms.find((r) => r.code === a302)!, 'capacity_max')).toBe(8);
    /** 나머지 3층 4실은 일괄값 6명. */
    expect(
      q.rooms.filter((r) => r.floor === 3 && ![a301, a302].includes(r.code)).every((r) => valueOf(q, r, 'capacity_max') === 6),
    ).toBe(true);
    /** 다른 층은 손대지 않습니다. */
    expect(q.rooms.filter((r) => r.floor === 4).every((r) => valueOf(q, r, 'capacity_max') === 4)).toBe(true);

    const found = step('한 창에서 · 3층 6실 최대 인원 (4실은 6명 / 2실은 8명)', after, [
      `3층 최대 인원: ${field(after, 'extra_person', '최대 인원')}`,
      `기록에 남은 값: ${q.history[0].after}`,
      `알림: ${after.toast}`,
    ]);
    expect(found.filter((f) => f.severity === 'error')).toEqual([]);
  });

  it('창에서 객실을 빼면 그 객실의 개별값도 함께 버려진다', () => {
    const before = initialState();
    const a301 = room(before, 'A301').code;
    const st = run(
      before,
      { type: 'OPEN_BULK' },
      { type: 'BULK_CLEAR_SEL' },
      { type: 'BULK_TOGGLE_FLOOR', floor: 3 },
      { type: 'SET_BULK_PER', code: a301, value: 9 },
      { type: 'BULK_TOGGLE_ROOM', code: a301 },
    );
    expect(st.bulk!.per).toEqual({});
    expect(st.bulk!.sel).toHaveLength(5);
  });

  it('바꿀 항목을 바꾸면 개별값은 버린다 — 인원에 넣은 6이 바베큐에 남으면 안 된다', () => {
    const before = initialState();
    const st = run(
      before,
      { type: 'OPEN_BULK' },
      { type: 'PICK_BULK_ATTR', attr: 'capacity_max' },
      { type: 'SET_BULK_PER', code: room(before, 'A301').code, value: 9 },
      { type: 'PICK_BULK_ATTR', attr: 'bbq' },
    );
    expect(st.bulk!.per).toEqual({});
    expect(st.bulk!.value).toBe(P(before).defaults.bbq);
  });
});

describe('직원 시나리오 — 숙소 전체값 바꾸기', () => {
  /** 상속 구조의 나머지 절반입니다. 전체값을 바꾸면 손대지 않은 객실만 따라오고,
   *  따로 정해둔 객실은 그대로 남아야 합니다 — 그러라고 따로 정해둔 것이니까요. */
  it('따로 정하지 않은 객실만 따라오고, 따로 정한 객실은 그대로 남는다', () => {
    const before = initialState();
    const p0 = P(before);
    const ownRooms = p0.rooms.filter((r) => isOwn(r, 'spa')).map((r) => r.code);
    expect(ownRooms.length).toBe(4); // 7층 4실이 제트스파 4인용

    const after = commit(before, { type: 'PICK_DEFAULT', attr: 'spa', value: 'whirl' });
    const p = P(after);

    expect(p.defaults.spa).toBe('whirl');
    expect(p.rooms.filter((r) => !ownRooms.includes(r.code)).every((r) => valueOf(p, r, 'spa') === 'whirl')).toBe(true);
    /** 7층은 손대지 않습니다. */
    expect(p.rooms.filter((r) => ownRooms.includes(r.code)).every((r) => valueOf(p, r, 'spa') === 'jet4')).toBe(true);

    const found = step('숙소 전체값 · 스파 제트스파 2인용 → 월풀 2인용', after, [
      `전체값: ${showValue('spa', p0.defaults.spa)} → ${showValue('spa', p.defaults.spa)}`,
      `따라온 객실: ${p.rooms.length - ownRooms.length}실 · 그대로 둔 객실: ${ownRooms.length}실`,
      `스파 시설 수용인원(자동 계산): ${field(after, 'spa', '수용인원')}`,
      `알림: ${after.toast}`,
    ]);
    expect(found.filter((f) => f.severity === 'error')).toEqual([]);
  });

  it('전체값을 어떤 객실이 따로 정해둔 값으로 바꾸면 그 객실의 "따로 정함"이 풀린다', () => {
    const before = initialState();
    const after = commit(before, { type: 'PICK_DEFAULT', attr: 'spa', value: 'jet4' });
    const p = P(after);
    /** 7층은 이제 전체값과 같으므로 따로 정한 표시가 남아 있으면 안 됩니다. */
    expect(p.rooms.filter((r) => r.floor === 7).every((r) => !isOwn(r, 'spa'))).toBe(true);
    expect(errorsOf(after)).toEqual([]);

    const found = step('숙소 전체값 · 스파 → 제트스파 4인용 (7층이 쓰던 값)', after, [
      `전 객실 스파: ${showValue('spa', p.defaults.spa)}`,
      `따로 정한 객실: ${p.rooms.filter((r) => isOwn(r, 'spa')).length}실`,
    ]);
    expect(found.filter((f) => f.severity === 'error')).toEqual([]);
  });

  it('인원 전체값도 숫자로 바꾼다', () => {
    const after = commit(initialState(), { type: 'PICK_DEFAULT', attr: 'capacity_max', value: 5 });
    const p = P(after);
    expect(p.defaults.capacity_max).toBe(5);
    /** 7층은 6명을 따로 정해뒀으므로 그대로. */
    expect(p.rooms.filter((r) => r.floor === 7).every((r) => valueOf(p, r, 'capacity_max') === 6)).toBe(true);
    expect(field(after, 'extra_person', '최대 인원')).toBe('7층 6명 / 3~6층 5명');
    expect(errorsOf(after)).toEqual([]);
  });
});

describe('직원 시나리오 — 객실 정보 수정 · 복제', () => {
  it('층을 바꾸면 그 객실을 쓰는 시설 문구가 다시 계산된다', () => {
    const before = initialState();
    const a401 = room(before, 'A401');
    const after = commit(
      before,
      { type: 'OPEN_ROOM_EDIT', code: a401.code },
      { type: 'SET_RE', patch: { floorText: '8', name: 'A801' } },
      { type: 'PREVIEW_ROOM_EDIT' },
    );
    const p = P(after);
    expect(p.rooms.find((r) => r.code === a401.code)!.floor).toBe(8);
    expect(p.rooms.find((r) => r.code === a401.code)!.name).toBe('A801');
    expect(field(after, 'shared_bbq', '이용 객실')).toContain('8층');

    const found = step('객실 정보 · A401 4층 → A801 8층', after, [
      `공용 BBQ 이용 객실: ${field(before, 'shared_bbq', '이용 객실')} → ${field(after, 'shared_bbq', '이용 객실')}`,
      `알림: ${after.toast}`,
    ]);
    expect(found.filter((f) => f.severity === 'error')).toEqual([]);
  });

  it('복제하면 값·구조·침구까지 그대로 오고 이름만 다르다', () => {
    const before = initialState();
    const src = room(before, 'A701');
    const after = commit(
      before,
      { type: 'OPEN_NEW_ROOM', from: src.code },
      { type: 'SET_NR', patch: { name: 'A703' } },
      { type: 'PREVIEW_NEW_ROOM' },
    );
    const made = room(after, 'A703');
    expect(made.floor).toBe(7);
    expect(made.area).toBe(src.area);
    expect(made.bed).toBe(src.bed);
    expect(made.values).toEqual(src.values);
    expect(valueOf(P(after), made, 'capacity_max')).toBe(6);

    const found = step('객실 복제 · A701 → A703', after, [
      `구조·침구: ${made.form} · ${made.bed}`,
      `인원(따라옴): 기준 ${valueOf(P(after), made, 'capacity_base')}명 / 최대 ${valueOf(P(after), made, 'capacity_max')}명`,
      `스파(따라옴): ${showValue('spa', valueOf(P(after), made, 'spa'))}`,
    ]);
    expect(found.filter((f) => f.severity === 'error')).toEqual([]);
  });
});

describe('직원 시나리오 — 시설 항목 넣고 제외 · 쓰는 객실 수정', () => {
  it('전사 목록에서 항목을 넣으면 형식에 맞는 편집기가 붙는다', () => {
    const after = commit(initialState(), { type: 'PREVIEW_FIELD_ADD', blockKey: 'spa', fieldKey: '이용 복장' });
    expect(field(after, 'spa', '이용 복장')).toBe('미입력');

    const filled = commit(
      after,
      { type: 'OPEN_BLOCK_EDIT', blockKey: 'spa', k: '이용 복장' },
      { type: 'SET_PART', k: 'v', v: '수영복 필수' },
      { type: 'PREVIEW_EDIT' },
    );
    expect(field(filled, 'spa', '이용 복장')).toBe('수영복 필수');

    const found = step('시설 · 스파에 "이용 복장" 넣고 값 채우기', filled, [
      `넣은 항목: 이용 복장 = ${field(filled, 'spa', '이용 복장')}`,
      `항목 수: ${block(after, 'spa').fields.length}개`,
    ]);
    expect(found.filter((f) => f.severity === 'error')).toEqual([]);
  });

  it('자동 계산 항목은 뺄 수 없고, 사람이 쓴 항목만 빠진다', () => {
    const before = initialState();
    const after = commit(before, { type: 'PREVIEW_FIELD_DEL', blockKey: 'shared_bbq', fieldKey: '이용 장소' });
    expect(block(after, 'shared_bbq').fields.some((f) => f[0] === '이용 장소')).toBe(false);
    /** 자동 계산 항목은 그대로 있어야 합니다. */
    expect(field(after, 'shared_bbq', '이용 객실')).toBe('4~7층 객실 · 22객실');
    expect(errorsOf(after)).toEqual([]);
  });

  it('쓰는 중인 시설에서 객실 하나를 빼면 값이 비워지고 문구가 줄어든다', () => {
    const before = initialState();
    const a401 = room(before, 'A401').code;
    const opened = run(before, { type: 'OPEN_BLOCK_ROOMS', blockKey: 'shared_bbq' }, { type: 'BR_TOGGLE_ROOM', code: a401 }, { type: 'BR_APPLY_MEMBERS' });
    expect(opened.cas).not.toBeNull();

    const after = run(opened, { type: 'APPLY_CAS' });
    const p = P(after);
    expect(valueOf(p, p.rooms.find((r) => r.code === a401)!, 'bbq')).toBe('none');
    expect(field(after, 'shared_bbq', '이용 객실')).toBe('4~7층 객실 · 21객실 (A401 제외)');
    /** 나머지 객실은 원래 종류를 그대로 유지해야 합니다 — 체크가 종류를 덮어쓰면 안 됩니다. */
    expect(valueOf(p, p.rooms.find((r) => r.name === 'B401')!, 'bbq')).toBe('shared_gas');

    const found = step('시설 · 공용 BBQ에서 A401 제외 (쓰는 객실 수정)', after, [
      `공용 BBQ 이용 객실: ${field(before, 'shared_bbq', '이용 객실')} → ${field(after, 'shared_bbq', '이용 객실')}`,
      `A401 바베큐: ${showValue('bbq', valueOf(p, p.rooms.find((r) => r.code === a401)!, 'bbq'))}`,
    ]);
    expect(found.filter((f) => f.severity === 'error')).toEqual([]);
  });

  it('전사 목록에서 시설을 가져오면 속성·가려내기 규칙·자동 계산이 함께 붙는다', () => {
    const before = initialState();
    expect(P(before).attrs).not.toContain('camp_site');

    const added = commit(before, { type: 'PREVIEW_ADD_BLOCK_ITEM', blockKey: 'camping' });
    const p = P(added);
    /** 객실 표에 열이 생겨야 값을 넣을 수 있습니다. */
    expect(p.attrs).toContain('camp_site');
    expect(p.defaults.camp_site).toBe('none');
    expect(p.blocks.find((b) => b.key === 'camping')!.memberOf).toEqual({
      attr: 'camp_site',
      codes: ['auto', 'tent', 'caravan'],
    });

    /** 값을 넣으면 문구가 저절로 계산됩니다 — 손으로 쓸 곳이 없습니다. */
    const filled = commit(
      added,
      { type: 'TOGGLE_ROOM', code: room(added, 'A301').code },
      { type: 'OPEN_BULK' },
      { type: 'PICK_BULK_ATTR', attr: 'camp_site' },
      { type: 'PICK_BULK_VALUE', value: 'tent' },
      { type: 'PREVIEW_BULK' },
    );
    expect(field(filled, 'camping', '이용 객실')).toBe('3층 객실 · 1객실 (A302,A303,B301,B302,B303 제외)');

    const found = step('시설 · 전사 목록에서 "캠핑 · 오토캠핑" 가져오기', filled, [
      `숙소가 쓰는 값: ${attrsOf(p).map((a) => a.label).join(', ')}`,
      `캠핑 이용 객실(자동 계산): ${field(filled, 'camping', '이용 객실')}`,
      `가려내기 규칙: ${JSON.stringify(p.blocks.find((b) => b.key === 'camping')!.memberOf)}`,
    ]);
    expect(found.filter((f) => f.severity === 'error')).toEqual([]);
  });
});

describe('직원 시나리오 — 인원을 바꾸면 초과입실 안내가 따라오는가', () => {
  /** 인원을 숫자로 넣게 한 순간 생긴 문제입니다. "최대 4명까지 가능합니다"처럼 답변이
   *  숫자를 인용하면, 인원을 올려도 답변은 그 자리에 남아 조용히 거짓말이 됩니다.
   *  판매 사이트 값은 계산되므로 따라오고, 답변만 안 따라와서 **서로 다른 말**을 하게 됩니다. */
  it('초과입실 3문항이 인원 값에서 만들어져 손댈 곳이 없다', () => {
    const before = initialState();
    ['Q-0011', 'Q-0012', 'Q-0013'].forEach((qid) => {
      const f = P(before).faqs.find((x) => x.qid === qid)!;
      expect(f.tpl).not.toBe('');
      expect(faq(before, qid).derived).toBe(true);
    });
    expect(faq(before, 'Q-0013').a).toBe('객실 최대 인원은 7층 6명 / 3~6층 4명입니다. 그 이상은 받지 않습니다.');
  });

  it('최대 인원을 올리면 답변·시설 값·판매 사이트가 한 번에 움직인다', () => {
    const before = initialState();
    const after = run(before, { type: 'PICK_CELL', code: room(before, 'A701').code, attr: 'capacity_max', value: 9 });

    /** 7층에 9명 객실과 6명 객실이 섞이므로 층이 아니라 객실 수로 셉니다. */
    expect(field(after, 'extra_person', '최대 인원')).toBe('9명 1객실 / 6명 3객실 / 4명 24객실');
    expect(faq(after, 'Q-0013').a).toBe('객실 최대 인원은 9명 1객실 / 6명 3객실 / 4명 24객실입니다. 그 이상은 받지 않습니다.');
    expect(channelRows(P(after)).find((r) => r.id === 'maxpax')!.master).toContain('9명');

    const found = step('객실 · A701 최대 인원 6명 → 9명 (초과입실 안내 추적)', after, [
      `추가 인원 시설 · 최대 인원: ${field(before, 'extra_person', '최대 인원')} → ${field(after, 'extra_person', '최대 인원')}`,
      `Q-0011: ${faq(after, 'Q-0011').a}`,
      `Q-0013: ${faq(after, 'Q-0013').a}`,
      `판매 사이트 최대 인원: ${channelRows(P(after)).find((r) => r.id === 'maxpax')!.master}`,
      `시설 문구(숫자 인용 없음): ${ruleText(P(after).blocks.find((b) => b.key === 'extra_person')!.rules![3])}`,
    ]);
    expect(found.filter((f) => f.severity === 'error')).toEqual([]);
  });

  it('전 객실 인원이 같아지면 층 표기가 사라지고 한 값으로 말한다', () => {
    const before = initialState();
    const codes = P(before).rooms.filter((r) => r.floor !== 7).map((r) => r.code);
    const after = commit(
      before,
      ...codes.map((code): Action => ({ type: 'TOGGLE_ROOM', code })),
      { type: 'OPEN_BULK' },
      { type: 'PICK_BULK_ATTR', attr: 'capacity_max' },
      { type: 'PICK_BULK_VALUE', value: 6 },
      { type: 'PREVIEW_BULK' },
    );
    expect(field(after, 'extra_person', '최대 인원')).toBe('6명');
    expect(faq(after, 'Q-0013').a).toBe('객실 최대 인원은 6명입니다. 그 이상은 받지 않습니다.');

    const found = step('한꺼번에 · 3~6층 최대 인원 4 → 6명 (전 객실 6명)', after, [
      `추가 인원 시설 · 최대 인원: ${field(after, 'extra_person', '최대 인원')}`,
      `Q-0013: ${faq(after, 'Q-0013').a}`,
    ]);
    expect(found.filter((f) => f.severity === 'error')).toEqual([]);
  });

  /** 1000곳의 나머지 답변은 아직 손으로 쓴 문장입니다. 그것까지 자동으로 만들 수는 없으니,
   *  최소한 낡았을 때 알려는 줘야 합니다. */
  it('손으로 쓴 답변이 인원을 잘못 인용하면 검사기가 알려준다', () => {
    const base = initialState();
    const p = P(base);
    const st0 = replace(base, {
      ...p,
      faqs: p.faqs.map((f) => (f.qid === 'Q-0049' ? { ...f, tpl: '', a: '최대 6명까지 입실 가능합니다.' } : f)),
    });
    expect(audit(st0).filter((v) => v.what.includes('손으로 쓴 답변'))).toHaveLength(0);

    const st1 = commit(
      st0,
      ...P(st0).rooms.map((r): Action => ({ type: 'TOGGLE_ROOM', code: r.code })),
      { type: 'OPEN_BULK' },
      { type: 'PICK_BULK_ATTR', attr: 'capacity_max' },
      { type: 'PICK_BULK_VALUE', value: 8 },
      { type: 'PREVIEW_BULK' },
    );
    const flagged = audit(st1).filter((v) => v.what.includes('손으로 쓴 답변'));
    expect(flagged).toHaveLength(1);

    const found = step('검사기 · 손으로 쓴 답변이 낡은 인원을 인용', st1, [
      `전 객실 최대 인원 → 8명 (6명 객실이 사라짐)`,
      `자동 답변 Q-0013: ${faq(st1, 'Q-0013').a}`,
      `검사기가 잡은 것: ${flagged[0].what}`,
    ]);
    expect(found.filter((f) => f.severity === 'error')).toEqual([]);
  });
});

describe('직원 시나리오 — 시설 정보에서 이용요금·이용시간 수정', () => {
  it('시설의 이용 요금(금액)을 고쳐도 다른 값이 오염되지 않는다', () => {
    const before = initialState();
    const after = commit(
      before,
      { type: 'OPEN_BLOCK_EDIT', blockKey: 'spa', k: '이용 요금' },
      { type: 'SET_PART', k: 'amt', v: 10000 },
      { type: 'PREVIEW_EDIT' },
    );

    expect(field(after, 'spa', '이용 요금')).toBe('10,000원');
    // 예전 프로토타입에서 이 편집이 28객실의 바베큐 요금을 덮어쓰던 자리입니다.
    expect(P(after).fees).toEqual(P(before).fees);

    const found = step('시설 · 스파 이용 요금 무료 → 10,000원', after, [
      `스파 이용 요금: ${field(before, 'spa', '이용 요금')} → ${field(after, 'spa', '이용 요금')}`,
      `객실 바베큐 요금 오염 여부: 없음 (${fee(after, 'bbq', P(after).rooms[0])})`,
      `공용 BBQ 이용 요금(자동 계산): ${field(after, 'shared_bbq', '이용 요금')}`,
    ]);
    expect(found.filter((f) => f.severity === 'error')).toEqual([]);
  });

  it('시설의 이용 시간(시간대)을 고치면 질문 답변이 같이 따라온다', () => {
    const before = initialState();
    const after = commit(
      before,
      { type: 'OPEN_BLOCK_EDIT', blockKey: 'shared_bbq', k: '이용 시간' },
      { type: 'SET_PART', k: 'h', v: '16' },
      { type: 'SET_PART', k: 'h2', v: '22' },
      { type: 'PREVIEW_EDIT' },
    );

    /** 7층 4실은 따로 정한 값을 지키고, 나머지 18실만 따라옵니다. */
    expect(field(after, 'shared_bbq', '이용 시간')).toBe('7층 15:00~22:00 / 4~6층 16:00~22:00');
    expect(faq(after, 'Q-0015').a).toBe('7층 15:00~22:00 / 4~6층 16:00~22:00에 이용 가능합니다.');

    const found = step('시설 · 공용 BBQ 이용 시간 17:00~21:00 → 16:00~22:00', after, [
      `공용 BBQ 이용 시간: ${field(before, 'shared_bbq', '이용 시간')} → ${field(after, 'shared_bbq', '이용 시간')}`,
      `FAQ Q-0015(시설 값 인용): ${faq(before, 'Q-0015').a} → ${faq(after, 'Q-0015').a}`,
      `개별 BBQ 이용 시간(영향 없어야 함): ${field(after, 'private_bbq', '이용 시간')}`,
    ]);
    expect(found.filter((f) => f.severity === 'error')).toEqual([]);
  });

  it('입실 기준 시간대의 부가 조건이 편집 왕복에서 사라지지 않는다', () => {
    const after = commit(
      initialState(),
      { type: 'OPEN_BLOCK_EDIT', blockKey: 'spa', k: '이용 시간' },
      { type: 'SET_PART', k: 'h2', v: '22' },
      { type: 'PREVIEW_EDIT' },
    );

    expect(field(after, 'spa', '이용 시간')).toBe('입실~22:00 (오전 이용 불가)');
    expect(faq(after, 'Q-0039').a).toBe('입실~22:00 (오전 이용 불가)까지 가능합니다.');

    const found = step('시설 · 스파 이용 시간 입실~23시 → 입실~22시', after, [
      `스파 이용 시간: ${field(after, 'spa', '이용 시간')} (시작 기준 "입실"과 괄호 조건 유지)`,
      `FAQ Q-0039: ${faq(after, 'Q-0039').a}`,
    ]);
    expect(found.filter((f) => f.severity === 'error')).toEqual([]);
  });
});

describe('직원 시나리오 — 객실 정보에서 이용요금 수정', () => {
  it('객실의 바베큐 값을 바꾸면 요금이 그 값에서 따라온다', () => {
    const before = initialState();
    const after = run(before, {
      type: 'PICK_CELL',
      code: room(before, 'B401').code,
      attr: 'bbq',
      value: 'shared_charcoal',
    });

    expect(fee(after, 'bbq', room(after, 'B401'))).toBe(feeOf(P(after), 'bbq', 'shared_charcoal'));
    expect(field(after, 'shared_bbq', '바베큐 형태')).toBe('가스그릴, 숯불');

    const found = step('객실 · B401 바베큐 가스그릴 → 숯불', after, [
      `B401 요금: ${fee(before, 'bbq', room(before, 'B401'))} → ${fee(after, 'bbq', room(after, 'B401'))}`,
      `공용 BBQ 형태(자동 계산): ${field(before, 'shared_bbq', '바베큐 형태')} → ${field(after, 'shared_bbq', '바베큐 형태')}`,
      `공용 BBQ 이용 요금(자동 계산): ${field(after, 'shared_bbq', '이용 요금')}`,
    ]);
    expect(found.filter((f) => f.severity === 'error')).toEqual([]);
  });

  it('값에 붙은 요금을 고치면 그 값을 쓰는 객실 전부와 시설 문구가 한 번에 갱신된다', () => {
    const before = initialState();
    const after = commit(
      before,
      { type: 'OPEN_OPT_FEE', attr: 'bbq', code: 'private_electric' },
      { type: 'SET_PART', k: 'amt', v: 25000 },
      { type: 'PREVIEW_EDIT' },
    );

    const users = P(after).rooms.filter((r) => valueOf(P(after), r, 'bbq') === 'private_electric');
    expect(users.every((r) => fee(after, 'bbq', r) === '1세트 25,000원 (1박기준/현장결제)')).toBe(true);
    expect(field(after, 'private_bbq', '이용 요금')).toBe('1세트 25,000원 (1박기준/현장결제)');

    const found = step('요금표 · 개별BBQ 전기그릴 20,000 → 25,000', after, [
      `값에 붙은 요금: ${feeOf(P(before), 'bbq', 'private_electric')} → ${feeOf(P(after), 'bbq', 'private_electric')}`,
      `이 값을 쓰는 객실 ${users.length}실 전부 갱신`,
      `개별 BBQ 이용 요금(자동 계산): ${field(after, 'private_bbq', '이용 요금')}`,
    ]);
    expect(found.filter((f) => f.severity === 'error')).toEqual([]);
  });

  it('되돌리기는 객실·요금·시설을 함께 원복한다', () => {
    const before = initialState();
    const after = run(
      before,
      { type: 'OPEN_OPT_FEE', attr: 'bbq', code: 'private_electric' },
      { type: 'SET_PART', k: 'amt', v: 25000 },
      { type: 'PREVIEW_EDIT' },
      { type: 'APPLY_CAS' },
      { type: 'UNDO' },
    );

    expect(P(after).fees).toEqual(P(before).fees);
    expect(P(after).rooms).toEqual(P(before).rooms);

    const found = step('되돌리기', after, [
      `요금 복원: ${feeOf(P(after), 'bbq', 'private_electric')}`,
      `객실 요금 복원: ${fee(after, 'bbq', room(after, 'A301'))}`,
      `기록 되감김: ${P(after).history.length}건`,
    ]);
    expect(found.filter((f) => f.severity === 'error')).toEqual([]);
  });
});

describe('직원 시나리오 — 시설 껐다 켜기 · 문구 조각 수정', () => {
  it('시설을 껐다 켜도 상태·객실 값·사용 여부 필드가 서로 어긋나지 않는다', () => {
    const off = commit(initialState(), { type: 'PREVIEW_BLOCK_STATE', blockKey: 'private_pool', nextSt: 'off' });
    const offFound = step('시설 · 개별 수영장 잠시 안 쓰기', off, [
      `상태: ${block(off, 'private_pool').st}`,
      `사용 여부 필드: ${field(off, 'private_pool', '사용 여부')}`,
    ]);
    expect(offFound.filter((f) => f.severity === 'error')).toEqual([]);

    const on = commit(off, { type: 'PREVIEW_BLOCK_USE', blockKey: 'private_pool' });
    const onFound = step('시설 · 개별 수영장 쓰기 시작', on, [
      `상태: ${block(on, 'private_pool').st}`,
      `사용 여부 필드: ${field(on, 'private_pool', '사용 여부')}`,
      `이어진 질문(개별수영장 8건): ${faq(on, 'Q-0028').blank ? '여전히 빠져 있음' : '살아남'}`,
    ]);
    expect(onFound.filter((f) => f.severity === 'error')).toEqual([]);
  });

  it('문구 조각을 고치면 문장이 다시 만들어진다', () => {
    const before = initialState();
    const after = commit(
      before,
      { type: 'OPEN_RULE_SLOT', blockKey: 'special_notes', ri: 2, si: 0 },
      { type: 'SET_PART', k: 'h', v: '23' },
      { type: 'PREVIEW_EDIT' },
    );

    const rules = P(after).blocks.find((b) => b.key === 'special_notes')!.rules!;
    expect(ruleText(rules[2])).toBe('23:00 이후 고성방가 자제');

    const found = step('문구 · 특이사항 "22:00 이후 고성방가 자제" → 23:00', after, [
      `문장 다시 만들기: ${ruleText(P(before).blocks.find((b) => b.key === 'special_notes')!.rules![2])} → ${ruleText(rules[2])}`,
      `조각만 수정 · 문장 직접 입력 없음`,
    ]);
    expect(found.filter((f) => f.severity === 'error')).toEqual([]);
  });

  it('여러 건 허용 문구를 넣어도 기존 문구가 밀리지 않는다', () => {
    const before = initialState();
    const after = commit(before, { type: 'PREVIEW_RULE_ADD', blockKey: 'transportation', ruleId: 'nearby_car' });
    const rules = P(after).blocks.find((b) => b.key === 'transportation')!.rules!;

    expect(rules).toHaveLength(P(before).blocks.find((b) => b.key === 'transportation')!.rules!.length + 1);
    expect(ruleText(rules[rules.length - 1])).toBe('주변 명소 차량 약 10분');

    const found = step('문구 · 교통에 "주변 명소 차량 약 N분" 넣기', after, [
      `문구 수: ${rules.length}건`,
      `넣은 문장: ${ruleText(rules[rules.length - 1])} (이름·분은 조각으로 수정)`,
    ]);
    expect(found.filter((f) => f.severity === 'error')).toEqual([]);
  });
});

describe('직원 시나리오 — 모양이 다른 숙소로 옮겨서 같은 일을 한다', () => {
  it('가평(개별풀·애견동반)에서 같은 조작이 그대로 동작한다', () => {
    const before = run(initialState(), { type: 'SET_PROPERTY', id: 'gapyeong' });
    expect(attrsOf(P(before)).map((a) => a.key)).not.toContain('bbq');

    const after = commit(
      before,
      { type: 'TOGGLE_ROOM', code: room(before, 'RV101').code },
      { type: 'OPEN_BULK' },
      { type: 'PICK_BULK_ATTR', attr: 'private_pool' },
      { type: 'PICK_BULK_VALUE', value: 'warm' },
      { type: 'PREVIEW_BULK' },
    );

    expect(valueOf(P(after), room(after, 'RV101'), 'private_pool')).toBe('warm');
    expect(field(after, 'private_pool', '이용 요금')).toContain('50,000원');

    const found = step('가평 · RV101 개별풀 냉수 → 온수', after, [
      `이 숙소가 쓰는 값: ${attrsOf(P(after)).map((a) => a.label).join(', ')}`,
      `개별 수영장 이용 객실: ${field(after, 'private_pool', '이용 객실')}`,
      `개별 수영장 이용 요금(값에서 따라옴): ${field(after, 'private_pool', '이용 요금')}`,
      `반려동물 이용 객실: ${field(after, 'pet_friendly', '이용 객실')}`,
    ]);
    expect(found.filter((f) => f.severity === 'error')).toEqual([]);
  });

  it('홍천(캠핑장)에서 캠핑 자리를 바꾸면 같은 길로 요금·문구가 따라온다', () => {
    const before = run(initialState(), { type: 'SET_PROPERTY', id: 'hongcheon' });
    const after = run(before, {
      type: 'PICK_CELL',
      code: room(before, 'T17').code,
      attr: 'camp_site',
      value: 'caravan',
    });

    expect(valueOf(P(after), room(after, 'T17'), 'camp_site')).toBe('caravan');
    expect(field(after, 'camping', '이용 요금')).toContain('90,000원');

    const found = step('홍천 · T17 텐트 데크 → 카라반', after, [
      `이 숙소가 쓰는 값: ${attrsOf(P(after)).map((a) => a.label).join(', ')}`,
      `캠핑 이용 요금(자동 계산): ${field(after, 'camping', '이용 요금')}`,
      `알림: ${after.toast}`,
    ]);
    expect(found.filter((f) => f.severity === 'error')).toEqual([]);
  });
});

describe('연속 작업 — 한 직원이 하루에 하는 일 전부', () => {
  it('10단계를 연달아 해도 마지막까지 어긋난 값이 없다', () => {
    const s0 = initialState();

    const s1 = commit(
      s0,
      { type: 'OPEN_NEW_ROOM' },
      { type: 'SET_NR', patch: { name: 'A404', floorText: '4' } },
      { type: 'PREVIEW_NEW_ROOM' },
    );
    const s2 = run(s1, { type: 'PICK_CELL', code: room(s1, 'A404').code, attr: 'bbq', value: 'shared_charcoal' });
    const s3 = run(s2, { type: 'PICK_CELL', code: room(s2, 'A404').code, attr: 'capacity_max', value: 7 });
    const s4 = commit(
      s3,
      { type: 'OPEN_OPT_FEE', attr: 'bbq', code: 'shared_charcoal' },
      { type: 'SET_PART', k: 'amt', v: 38000 },
      { type: 'PREVIEW_EDIT' },
    );
    const s5 = commit(
      s4,
      { type: 'OPEN_BLOCK_EDIT', blockKey: 'shared_bbq', k: '이용 시간' },
      { type: 'SET_PART', k: 'h2', v: '22' },
      { type: 'PREVIEW_EDIT' },
    );
    const s6 = commit(s5, { type: 'TOGGLE_ROOM', code: room(s5, 'A402').code }, { type: 'PREVIEW_DELETE' });
    const s7 = commit(s6, { type: 'PREVIEW_BLOCK_STATE', blockKey: 'pickup', nextSt: 'none' });
    const s8 = commit(s7, { type: 'PREVIEW_ADD_BLOCK_ITEM', blockKey: 'ev_charger' });
    const s9 = commit(
      s8,
      { type: 'OPEN_RULE_SLOT', blockKey: 'extra_person', ri: 1, si: 0 },
      { type: 'SET_PART', k: 'amt', v: 25000 },
      { type: 'PREVIEW_EDIT' },
    );
    const themeB = channelRows(P(s9)).find((r) => r.id === 'theme')!.cells.find((c) => c.ck === 'b')!;
    const s10 = commit(s9, {
      type: 'SYNC_CHANNEL',
      rowId: 'theme',
      ck: 'b',
      label: '테마',
      chName: '여기어때',
      to: themeB.expected,
    });

    const found = step(
      '연속 10단계 (추가 → 값 변경 → 인원 숫자 → 요금 → 이용 시간 → 지우기 → 시설 없애기 → 시설 추가 → 문구 → 사이트 교정)',
      s10,
      [
        `객실 ${P(s0).rooms.length} → ${P(s10).rooms.length}`,
        `공용 BBQ: ${field(s10, 'shared_bbq', '이용 객실')} · ${field(s10, 'shared_bbq', '바베큐 형태')} · ${field(s10, 'shared_bbq', '이용 시간')}`,
        `공용 BBQ 요금(자동 계산): ${field(s10, 'shared_bbq', '이용 요금')}`,
        `A404 최대 인원: ${valueOf(P(s10), room(s10, 'A404'), 'capacity_max')}명`,
        `FAQ Q-0015: ${faq(s10, 'Q-0015').a}`,
        `추가 인원 문구: ${ruleText(P(s10).blocks.find((b) => b.key === 'extra_person')!.rules![1])}`,
        `기록 ${P(s10).history.length}건`,
      ],
    );

    expect(errorsOf(s10)).toEqual([]);
    expect(found.filter((f) => f.severity === 'error')).toEqual([]);
  });
});

describe('일관성 검사기 자체 검증', () => {
  it('선택지에 없는 값을 잡아낸다', () => {
    const st = initialState();
    const p = P(st);
    const broken = replace(st, { ...p, rooms: p.rooms.map((r, i) => (i === 0 ? { ...r, values: { ...r.values, bbq: 'ufo' } } : r)) });
    expect(errorsOf(broken).some((v) => v.what.includes('없는 값입니다'))).toBe(true);
  });

  it('기준 인원이 최대 인원을 넘으면 잡아낸다 — 숫자 입력에서만 생기는 실수', () => {
    const st = initialState();
    const p = P(st);
    const broken = replace(st, {
      ...p,
      rooms: p.rooms.map((r, i) => (i === 0 ? { ...r, values: { ...r.values, capacity_base: 12 } } : r)),
    });
    expect(errorsOf(broken).some((v) => v.what.includes('많습니다'))).toBe(true);
  });

  it('자동 계산 필드가 낡으면 잡아낸다', () => {
    const st = initialState();
    const p = P(st);
    const broken = replace(st, {
      ...p,
      blocks: p.blocks.map((b) =>
        b.key === 'shared_bbq'
          ? { ...b, fields: b.fields.map((f) => (f[0] === '이용 객실' ? ([f[0], '4~7층 객실 · 99객실'] as [string, string]) : f)) }
          : b,
      ),
    });
    expect(errorsOf(broken).some((v) => v.what.includes('낡았습니다'))).toBe(true);
  });

  it('전체값과 같은 값을 굳이 따로 저장해 두면 잡아낸다', () => {
    const st = initialState();
    const p = P(st);
    const broken = replace(st, {
      ...p,
      rooms: p.rooms.map((r, i) => (i === 0 ? { ...r, values: { ...r.values, view: p.defaults.view } } : r)),
    });
    expect(errorsOf(broken).some((v) => v.what.includes('따로 정한 값으로 저장'))).toBe(true);
  });

  it('객실명이 겹치면 잡아낸다', () => {
    const st = initialState();
    const p = P(st);
    const broken = replace(st, { ...p, rooms: [...p.rooms, { ...p.rooms[0], code: '99999' }] });
    expect(errorsOf(broken).some((v) => v.what.includes('객실명이 겹칩니다'))).toBe(true);
  });
});

describe('직원 시나리오 — 시설은 하나인데 조건만 객실마다 다를 때', () => {
  /** 실제로 가장 자주 걸리는 모양입니다. 공용 BBQ는 하나인데 7층만 두 시간 일찍 열고,
   *  4층 몇 실은 장소가 다릅니다. 전에는 시설을 둘로 쪼개 넣어야 했고, 그러면 판매
   *  사이트 시설 목록에 같은 시설이 두 번 나갔습니다. */
  const SEVEN = ['27758', '27759', '27760', '27761'];

  it('시설 값은 그대로 두고 고른 객실만 다른 값을 갖는다', () => {
    const before = initialState();
    /** 씨앗에 이미 7층 4실이 15:00~22:00으로 들어 있습니다 — 카드는 갈린 채로 부릅니다. */
    expect(field(before, 'shared_bbq', '이용 시간')).toBe('7층 15:00~22:00 / 4~6층 17:00~21:00');
    /** 저장된 값은 갈린 문장이 아니라 기본값 하나입니다. 문장을 저장하면 다음 계산의
     *  기본값이 되어 겹쳐 쌓입니다. */
    expect(P(before).blocks.find((b) => b.key === 'shared_bbq')!.fields.find((f) => f[0] === '이용 시간')![1]).toBe('17:00~21:00');

    const after = commit(
      before,
      { type: 'OPEN_BLOCK_ROOMS', blockKey: 'shared_bbq', fieldKey: '이용 시간' },
      { type: 'BR_EDIT_PICKED' },
      { type: 'SET_PART', k: 'h', v: '14' },
      { type: 'PREVIEW_EDIT' },
    );

    const p = P(after);
    expect(SEVEN.every((c) => p.rooms.find((r) => r.code === c)!.values['blk:shared_bbq:이용 시간'] === '14:00~22:00')).toBe(true);
    /** 나머지 18실은 시설 값을 그대로 씁니다 — 아무 값도 안 생깁니다. */
    expect(p.rooms.filter((r) => r.floor !== 7).every((r) => !('blk:shared_bbq:이용 시간' in r.values))).toBe(true);
    expect(field(after, 'shared_bbq', '이용 시간')).toBe('7층 14:00~22:00 / 4~6층 17:00~21:00');

    const found = step('시설 · 공용 BBQ 이용 시간을 7층 4실만 14:00~22:00으로', after, [
      `공용 BBQ 이용 시간: ${field(before, 'shared_bbq', '이용 시간')} → ${field(after, 'shared_bbq', '이용 시간')}`,
      `시설에 저장된 기본값(안 바뀜): ${P(after).blocks.find((b) => b.key === 'shared_bbq')!.fields.find((f) => f[0] === '이용 시간')![1]}`,
      `따로 정한 객실: ${p.rooms.filter((r) => 'blk:shared_bbq:이용 시간' in r.values).map((r) => r.name).join(',')}`,
      `FAQ Q-0015: ${faq(after, 'Q-0015').a}`,
      `알림: ${after.toast}`,
    ]);
    expect(found.filter((f) => f.severity === 'error')).toEqual([]);
  });

  it('시설 값을 바꾸면 따로 정하지 않은 객실만 따라온다', () => {
    const after = commit(
      initialState(),
      { type: 'OPEN_BLOCK_EDIT', blockKey: 'shared_bbq', k: '이용 시간' },
      { type: 'SET_PART', k: 'h', v: '18' },
      { type: 'PREVIEW_EDIT' },
    );
    expect(field(after, 'shared_bbq', '이용 시간')).toBe('7층 15:00~22:00 / 4~6층 18:00~21:00');
    expect(errorsOf(after)).toEqual([]);
  });

  it('시설 값으로 되돌리면 따로 정한 값이 사라진다', () => {
    const after = commit(
      initialState(),
      { type: 'OPEN_BLOCK_ROOMS', blockKey: 'shared_bbq', fieldKey: '이용 시간' },
      { type: 'BR_RESET_PICKED' },
    );
    const p = P(after);
    expect(p.rooms.every((r) => !('blk:shared_bbq:이용 시간' in r.values))).toBe(true);
    expect(field(after, 'shared_bbq', '이용 시간')).toBe('17:00~21:00');
    expect(errorsOf(after)).toEqual([]);
  });

  it('시설 값과 같은 값을 넣으면 따로 정한 표시가 남지 않는다', () => {
    const after = commit(
      initialState(),
      { type: 'OPEN_BLOCK_ROOMS', blockKey: 'shared_bbq', fieldKey: '이용 시간' },
      { type: 'BR_EDIT_PICKED' },
      { type: 'SET_PART', k: 'h', v: '17' },
      { type: 'SET_PART', k: 'h2', v: '21' },
      { type: 'PREVIEW_EDIT' },
    );
    expect(P(after).rooms.every((r) => !('blk:shared_bbq:이용 시간' in r.values))).toBe(true);
    expect(errorsOf(after)).toEqual([]);
  });

  it('항목을 제외하면 객실에 남은 값도 함께 사라진다', () => {
    const after = commit(initialState(), { type: 'PREVIEW_FIELD_DEL', blockKey: 'shared_bbq', fieldKey: '이용 시간' });
    expect(P(after).rooms.every((r) => !('blk:shared_bbq:이용 시간' in r.values))).toBe(true);
    expect(errorsOf(after).some((v) => v.what.includes('남아 있습니다'))).toBe(false);
    /** 이 항목을 인용하던 질문은 답이 비게 됩니다 — 확인 창이 미리 알려 주는 그대로이고,
     *  검사도 같은 것을 짚습니다. 값이 조용히 사라지는 쪽이 훨씬 나쁩니다. */
    expect(errorsOf(after).map((v) => v.what)).toEqual(['자동 답변이 값을 못 찾았습니다: "—에 이용 가능합니다."']);
  });

  it('시설을 이 숙소에서 없애면 객실에 남은 값도 함께 사라진다', () => {
    const off = commit(initialState(), { type: 'PREVIEW_BLOCK_STATE', blockKey: 'shared_bbq', nextSt: 'off' });
    const gone = commit(off, { type: 'PREVIEW_BLOCK_STATE', blockKey: 'shared_bbq', nextSt: 'none' });
    expect(P(gone).rooms.every((r) => !Object.keys(r.values).some((k) => k.startsWith('blk:shared_bbq:')))).toBe(true);
    expect(errorsOf(gone)).toEqual([]);
  });

  it('갈 곳 없는 값이 객실에 남아 있으면 검사가 잡는다', () => {
    const st = initialState();
    const p = P(st);
    const cases: [string, string][] = [
      ['blk:shared_bbq:없는 항목', '19:00~20:00'],
      ['blk:shared_bbq:이용 객실', '아무 값'],
      ['blk:checkin_checkout:체크인', '16:00'],
      ['blk:없는시설:이용 시간', '19:00~20:00'],
    ];
    cases.forEach(([key, v]) => {
      const broken = replace(st, {
        ...p,
        rooms: p.rooms.map((r, i) => (i === 4 ? { ...r, values: { ...r.values, [key]: v } } : r)),
      });
      expect(errorsOf(broken).length).toBeGreaterThan(0);
    });
  });

  it('그 시설을 안 쓰는 객실에 값만 남으면 검사가 잡는다', () => {
    const st = initialState();
    const p = P(st);
    /** 3층은 개별BBQ라 공용 BBQ 소속이 아닙니다. */
    const broken = replace(st, {
      ...p,
      rooms: p.rooms.map((r) => (r.name === 'A301' ? { ...r, values: { ...r.values, 'blk:shared_bbq:이용 시간': '19:00~20:00' } } : r)),
    });
    expect(errorsOf(broken).some((v) => v.what.includes('쓰지 않는 객실인데'))).toBe(true);
  });

  it('객실 표에서 들어가면 그 객실이 항목 선택에 이미 들어가 있다', () => {
    const st = run(initialState(), {
      type: 'OPEN_BLOCK_ROOMS',
      blockKey: 'shared_bbq',
      fieldKey: '이용 시간',
      focusCode: room(initialState(), 'A501').code,
    });
    expect(st.br?.tab).toBe('fields');
    expect(st.br?.fieldSel).toContain(room(initialState(), 'A501').code);
    /** 표에서 들어와도 멤버십은 건드리지 않습니다 — 조회일 뿐, 최종 목록을 바꾸는 게
     *  아니라서요. */
    expect(st.br?.memberSel.length).toBe(22);
  });
});

describe('직원 시나리오 — 이용 객실 창에서 멤버십과 항목별 값을 함께 다룬다', () => {
  it('멤버십이 있고 갈리는 항목도 있으면 두 탭이 다 뜬다', () => {
    const st = run(initialState(), { type: 'OPEN_BLOCK_ROOMS', blockKey: 'shared_bbq' });
    expect(st.br?.tab).toBe('members');
    expect(st.br?.memberSel.length).toBe(22);
    /** 탭을 넘어가면 항목 탭 선택은 그대로 남아 있습니다 — 창을 나눈 게 아니라 한 창
     *  안에서 왔다 갔다 하는 것이므로 진행 중이던 것을 잃지 않습니다. */
    const onFields = run(st, { type: 'BR_SET_TAB', tab: 'fields' }, { type: 'BR_TOGGLE_ROOM', code: '27746' });
    const backToMembers = run(onFields, { type: 'BR_SET_TAB', tab: 'members' });
    expect(backToMembers.br?.fieldSel).toContain('27746');
    expect(backToMembers.br?.memberSel.length).toBe(22);
  });

  it('멤버십만 있고 갈리는 항목이 없는 시설은 항목 탭이 뜨지 않는다', () => {
    const st = run(initialState(), { type: 'OPEN_BLOCK_ROOMS', blockKey: 'spa' });
    /** 스파는 멤버십은 있지만 이 숙소에서 갈릴 수 있는 항목이 하나도 없습니다. */
    const bk = P(st).blocks.find((b) => b.key === 'spa')!;
    expect(bk.fields.some(([k]) => k === '이용 시간')).toBe(true);
    expect(st.br?.tab).toBe('members');
  });

  it('멤버십이 없는 시설(공용 수영장)은 항목 탭으로 곧장 연다', () => {
    const st = run(initialState(), { type: 'OPEN_BLOCK_ROOMS', blockKey: 'shared_pool' });
    expect(P(st).blocks.find((b) => b.key === 'shared_pool')!.memberOf).toBeUndefined();
    expect(st.br?.tab).toBe('fields');
    expect(st.br?.fieldKey).toBeTruthy();
  });
});

/* 시뮬레이션 리포트를 마지막에 한 번에 출력합니다. */
describe('시뮬레이션 리포트', () => {
  it('출력', () => {
    // eslint-disable-next-line no-console
    console.log(`\n${'═'.repeat(78)}\n직원 시나리오 시뮬레이션 리포트\n${'═'.repeat(78)}${log.join('\n')}\n`);
    expect(log.length).toBeGreaterThan(0);
  });
});
