import { describe, expect, it } from 'vitest';
import { audit, errorsOf } from '../domain/audit';
import { deriveBlocks, ruleText } from '../domain/derive';
import { renderFaq } from '../domain/faq';
import { initialState } from '../domain/seed';
import type { MasterState } from '../domain/types';
import { reducer, type Action } from '../state/store';

/* 직원 시나리오 시뮬레이션.
 *
 * 각 단계마다 실제 UI가 보내는 액션 순서 그대로 상태를 굴리고, 매 단계 끝에서
 * 일관성 검사(domain/audit.ts)를 돌립니다. 검사가 하나라도 걸리면 그 단계에서
 * "사람이 따로 챙겨야 하는 상태"가 생겼다는 뜻입니다. */

const run = (st: MasterState, ...actions: Action[]) => actions.reduce(reducer, st);
const block = (st: MasterState, key: string) => deriveBlocks(st.rooms, st.blocks).find((b) => b.key === key)!;
const field = (st: MasterState, key: string, f: string) => block(st, key).fields.find((x) => x[0] === f)![1];
const faq = (st: MasterState, qid: string) =>
  renderFaq(st.faqs.find((f) => f.qid === qid)!, deriveBlocks(st.rooms, st.blocks));
const room = (st: MasterState, short: string) => st.rooms.find((r) => r.short === short)!;

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
  it('4층에 객실을 추가하면 블록 문구·객실 수가 따라오고 어긋남이 없다', () => {
    const before = initialState();
    const after = commit(
      before,
      { type: 'OPEN_NEW_ROOM' },
      { type: 'SET_NR', k: 'name', v: 'A404' },
      { type: 'SET_NR', k: 'floor', v: '4' },
      { type: 'SET_NR', k: 'bbq', v: '공용BBQ · 가스그릴' },
      { type: 'PREVIEW_NEW_ROOM' },
    );

    expect(after.rooms).toHaveLength(29);
    expect(field(after, 'shared_bbq', '이용 객실')).toBe('4~7층 객실 · 23객실');
    expect(room(after, 'A404').bbqFee).toBe(after.optFees.shared_gas);

    const found = step('객실 추가 · A404 (4층 · 공용BBQ)', after, [
      `객실 수 ${before.rooms.length} → ${after.rooms.length}`,
      `공용 BBQ 이용 객실: ${field(before, 'shared_bbq', '이용 객실')} → ${field(after, 'shared_bbq', '이용 객실')}`,
      `A404 바베큐 요금(옵션에서 상속): ${room(after, 'A404').bbqFee}`,
      `이력: ${after.history[0].title} · 연쇄 ${after.history[0].n}건`,
    ]);
    expect(found.filter((f) => f.severity === 'error')).toEqual([]);
  });

  it('3층에 개별BBQ 객실을 추가하면 개별 BBQ 블록이 6 → 7객실로 늘어난다', () => {
    const after = commit(
      initialState(),
      { type: 'OPEN_NEW_ROOM' },
      { type: 'SET_NR', k: 'name', v: 'C301' },
      { type: 'SET_NR', k: 'floor', v: '3' },
      { type: 'SET_NR', k: 'bbq', v: '개별BBQ · 전기그릴' },
      { type: 'PREVIEW_NEW_ROOM' },
    );

    expect(block(after, 'private_bbq').rooms).toBe(7);
    expect(field(after, 'private_bbq', '이용 객실')).toBe('3층 객실 · 7객실');

    const found = step('객실 추가 · C301 (3층 · 개별BBQ)', after, [
      `개별 BBQ 이용 객실: ${field(after, 'private_bbq', '이용 객실')}`,
      `개별 BBQ 요금(옵션): ${field(after, 'private_bbq', '이용 요금')}`,
      `FAQ Q-0019: ${faq(after, 'Q-0019').a}`,
    ]);
    expect(found.filter((f) => f.severity === 'error')).toEqual([]);
  });

  it('객실을 삭제하면 남은 객실에서 문구가 다시 계산되고 제외 표기가 붙는다', () => {
    const before = initialState();
    const after = commit(
      before,
      { type: 'TOGGLE_ROOM', code: room(before, 'A403').code },
      { type: 'TOGGLE_ROOM', code: room(before, 'B403').code },
      { type: 'PREVIEW_DELETE' },
    );

    expect(after.rooms).toHaveLength(26);
    expect(field(after, 'shared_bbq', '이용 객실')).toBe('4~7층 객실 · 20객실');

    const found = step('객실 삭제 · A403 · B403', after, [
      `객실 수 ${before.rooms.length} → ${after.rooms.length}`,
      `공용 BBQ 이용 객실: ${field(after, 'shared_bbq', '이용 객실')}`,
      `선택 상태 초기화: ${after.sel.length === 0 ? '됨' : '안 됨'}`,
    ]);
    expect(found.filter((f) => f.severity === 'error')).toEqual([]);
  });

  it('3층 6실을 모두 지우면 개별 BBQ가 사용안함으로 내려간다', () => {
    const before = initialState();
    const third = before.rooms.filter((r) => r.floor === 3).map((r) => r.code);
    const after = commit(before, ...third.map((code): Action => ({ type: 'TOGGLE_ROOM', code })), {
      type: 'PREVIEW_DELETE',
    });

    expect(block(after, 'private_bbq').st).toBe('off');
    expect(faq(after, 'Q-0019').blank).toBe(true);

    const found = step('객실 삭제 · 3층 6실 전체', after, [
      `개별 BBQ 상태: 사용중 → ${block(after, 'private_bbq').st === 'off' ? '보유·사용안함' : '???'}`,
      `개별 BBQ 이용 객실: ${field(after, 'private_bbq', '이용 객실')}`,
      `FAQ Q-0019(개별BBQ 인용): ${faq(after, 'Q-0019').blank ? '자동 비활성' : faq(after, 'Q-0019').a}`,
    ]);
    expect(found.filter((f) => f.severity === 'error')).toEqual([]);
  });
});

describe('직원 시나리오 — 시설 정보에서 이용요금·이용시간 수정', () => {
  it('시설의 이용 요금(금액)을 고쳐도 다른 값이 오염되지 않는다', () => {
    const before = initialState();
    const after = commit(
      before,
      { type: 'OPEN_BLOCK_EDIT', blockKey: 'spa', k: '이용 요금', v: '무료' },
      { type: 'SET_PART', k: 'amt', v: 10000 },
      { type: 'PREVIEW_EDIT' },
    );

    expect(field(after, 'spa', '이용 요금')).toBe('10,000원');
    // 예전 프로토타입에서 이 편집이 28객실의 바베큐 요금을 덮어쓰던 자리입니다.
    expect(after.rooms.every((r) => r.bbqFee === before.rooms.find((b) => b.code === r.code)!.bbqFee)).toBe(true);

    const found = step('시설 · 스파 이용 요금 무료 → 10,000원', after, [
      `스파 이용 요금: ${field(before, 'spa', '이용 요금')} → ${field(after, 'spa', '이용 요금')}`,
      `객실 바베큐 요금 오염 여부: 없음 (${after.rooms[0].bbqFee})`,
      `공용 BBQ 이용 요금(자동 산출): ${field(after, 'shared_bbq', '이용 요금')}`,
    ]);
    expect(found.filter((f) => f.severity === 'error')).toEqual([]);
  });

  it('시설의 이용 시간(시간대)을 고치면 FAQ 답변이 같이 따라온다', () => {
    const before = initialState();
    const after = commit(
      before,
      { type: 'OPEN_BLOCK_EDIT', blockKey: 'shared_bbq', k: '이용 시간', v: '17:00~21:00' },
      { type: 'SET_PART', k: 'h', v: '16' },
      { type: 'SET_PART', k: 'h2', v: '22' },
      { type: 'PREVIEW_EDIT' },
    );

    expect(field(after, 'shared_bbq', '이용 시간')).toBe('16:00~22:00');
    expect(faq(after, 'Q-0015').a).toBe('16:00~22:00에 이용 가능합니다.');

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
      { type: 'OPEN_BLOCK_EDIT', blockKey: 'spa', k: '이용 시간', v: '입실~23시 (오전 이용 불가)' },
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
  it('객실의 바베큐 옵션을 바꾸면 요금이 옵션에서 따라온다', () => {
    const before = initialState();
    const after = commit(
      before,
      { type: 'EDIT_ROOM_FIELD', code: room(before, 'B401').code, field: 'bbq' },
      { type: 'PICK_BULK_VALUE', value: '공용BBQ · 숯불' },
      { type: 'PREVIEW_BULK' },
    );

    expect(room(after, 'B401').bbqFee).toBe(after.optFees.shared_charcoal);
    expect(field(after, 'shared_bbq', '바베큐 형태')).toBe('가스그릴, 숯불');

    const found = step('객실 · B401 바베큐 가스그릴 → 숯불', after, [
      `B401 요금: ${room(before, 'B401').bbqFee} → ${room(after, 'B401').bbqFee}`,
      `공용 BBQ 형태(자동 산출): ${field(before, 'shared_bbq', '바베큐 형태')} → ${field(after, 'shared_bbq', '바베큐 형태')}`,
      `공용 BBQ 이용 요금(자동 산출): ${field(after, 'shared_bbq', '이용 요금')}`,
    ]);
    expect(found.filter((f) => f.severity === 'error')).toEqual([]);
  });

  it('옵션 요금을 고치면 그 옵션을 쓰는 객실 전부와 블록 문구가 한 번에 갱신된다', () => {
    const before = initialState();
    const after = commit(
      before,
      { type: 'OPEN_OPT_FEE', code: 'private_electric' },
      { type: 'SET_PART', k: 'amt', v: 25000 },
      { type: 'PREVIEW_EDIT' },
    );

    const users = after.rooms.filter((r) => r.bbqOpt === 'private_electric');
    expect(users.every((r) => r.bbqFee === '1세트 25,000원 (1박기준/현장결제)')).toBe(true);
    expect(field(after, 'private_bbq', '이용 요금')).toBe('1세트 25,000원 (1박기준/현장결제)');

    const found = step('옵션 · 개별BBQ 전기그릴 요금 20,000 → 25,000', after, [
      `옵션 요금: ${before.optFees.private_electric} → ${after.optFees.private_electric}`,
      `이 옵션을 쓰는 객실 ${users.length}실 전부 갱신`,
      `개별 BBQ 이용 요금(자동 산출): ${field(after, 'private_bbq', '이용 요금')}`,
    ]);
    expect(found.filter((f) => f.severity === 'error')).toEqual([]);
  });

  it('되돌리기는 객실·옵션·블록을 함께 원복한다', () => {
    const before = initialState();
    const after = run(
      before,
      { type: 'OPEN_OPT_FEE', code: 'private_electric' },
      { type: 'SET_PART', k: 'amt', v: 25000 },
      { type: 'PREVIEW_EDIT' },
      { type: 'APPLY_CAS' },
      { type: 'UNDO' },
    );

    expect(after.optFees).toEqual(before.optFees);
    expect(after.rooms).toEqual(before.rooms);

    const found = step('되돌리기', after, [
      `옵션 요금 복원: ${after.optFees.private_electric}`,
      `객실 요금 복원: ${room(after, 'A301').bbqFee}`,
      `이력 되감김: ${after.history.length}건`,
    ]);
    expect(found.filter((f) => f.severity === 'error')).toEqual([]);
  });
});

describe('직원 시나리오 — 시설 껐다 켜기 · 규칙 조각 수정', () => {
  it('시설을 껐다 켜도 상태·객실 값·사용 여부 필드가 서로 어긋나지 않는다', () => {
    const off = commit(initialState(), { type: 'PREVIEW_BLOCK_STATE', blockKey: 'private_pool', nextSt: 'off' });
    const offFound = step('시설 · 개별 수영장 사용 중지', off, [
      `상태: ${block(off, 'private_pool').st}`,
      `사용 여부 필드: ${field(off, 'private_pool', '사용 여부')}`,
    ]);
    expect(offFound.filter((f) => f.severity === 'error')).toEqual([]);

    const on = commit(off, { type: 'PREVIEW_BLOCK_USE', blockKey: 'private_pool' });
    const onFound = step('시설 · 개별 수영장 사용으로 전환', on, [
      `상태: ${block(on, 'private_pool').st}`,
      `사용 여부 필드: ${field(on, 'private_pool', '사용 여부')}`,
      `연결 FAQ(개별수영장 8건): ${faq(on, 'Q-0028').blank ? '여전히 비활성' : '활성'}`,
    ]);
    expect(onFound.filter((f) => f.severity === 'error')).toEqual([]);
  });

  it('규칙 조각을 고치면 문장이 다시 만들어진다', () => {
    const before = initialState();
    const after = commit(
      before,
      { type: 'OPEN_RULE_SLOT', blockKey: 'special_notes', ri: 2, si: 0 },
      { type: 'SET_PART', k: 'h', v: '23' },
      { type: 'PREVIEW_EDIT' },
    );

    const rules = after.blocks.find((b) => b.key === 'special_notes')!.rules!;
    expect(ruleText(rules[2])).toBe('23:00 이후 고성방가 자제');

    const found = step('규칙 · 특이사항 "22:00 이후 고성방가 자제" → 23:00', after, [
      `문장 재생성: ${ruleText(before.blocks.find((b) => b.key === 'special_notes')!.rules![2])} → ${ruleText(rules[2])}`,
      `조각만 수정 · 문장 직접 입력 없음`,
    ]);
    expect(found.filter((f) => f.severity === 'error')).toEqual([]);
  });

  it('여러 건 허용 규칙을 추가해도 기존 규칙이 밀리지 않는다', () => {
    const before = initialState();
    const after = commit(before, { type: 'PREVIEW_RULE_ADD', blockKey: 'transportation', ruleId: 'nearby_car' });
    const rules = after.blocks.find((b) => b.key === 'transportation')!.rules!;

    expect(rules).toHaveLength(before.blocks.find((b) => b.key === 'transportation')!.rules!.length + 1);
    expect(ruleText(rules[rules.length - 1])).toBe('주변 명소 차량 약 10분');

    const found = step('규칙 · 교통에 "주변 명소 차량 약 N분" 추가', after, [
      `규칙 수: ${rules.length}건`,
      `추가된 문장: ${ruleText(rules[rules.length - 1])} (이름·분은 조각으로 수정)`,
    ]);
    expect(found.filter((f) => f.severity === 'error')).toEqual([]);
  });
});

describe('연속 작업 — 한 직원이 하루에 하는 일 전부', () => {
  it('9단계를 연달아 해도 마지막까지 어긋난 값이 없다', () => {
    const s0 = initialState();

    const s1 = commit(
      s0,
      { type: 'OPEN_NEW_ROOM' },
      { type: 'SET_NR', k: 'name', v: 'A404' },
      { type: 'SET_NR', k: 'floor', v: '4' },
      { type: 'PREVIEW_NEW_ROOM' },
    );
    const s2 = commit(
      s1,
      { type: 'EDIT_ROOM_FIELD', code: room(s1, 'A404').code, field: 'bbq' },
      { type: 'PICK_BULK_VALUE', value: '공용BBQ · 숯불' },
      { type: 'PREVIEW_BULK' },
    );
    const s3 = commit(
      s2,
      { type: 'OPEN_OPT_FEE', code: 'shared_charcoal' },
      { type: 'SET_PART', k: 'amt', v: 38000 },
      { type: 'PREVIEW_EDIT' },
    );
    const s4 = commit(
      s3,
      { type: 'OPEN_BLOCK_EDIT', blockKey: 'shared_bbq', k: '이용 시간', v: field(s3, 'shared_bbq', '이용 시간') },
      { type: 'SET_PART', k: 'h2', v: '22' },
      { type: 'PREVIEW_EDIT' },
    );
    const s5 = commit(s4, { type: 'TOGGLE_ROOM', code: room(s4, 'A402').code }, { type: 'PREVIEW_DELETE' });
    const s6 = commit(s5, { type: 'PREVIEW_BLOCK_STATE', blockKey: 'pickup', nextSt: 'none' });
    const s7 = commit(s6, { type: 'PREVIEW_ADD_BLOCK_ITEM', blockKey: 'ev_charger' });
    const s8 = commit(
      s7,
      { type: 'OPEN_RULE_SLOT', blockKey: 'extra_person', ri: 1, si: 0 },
      { type: 'SET_PART', k: 'amt', v: 25000 },
      { type: 'PREVIEW_EDIT' },
    );
    const s9 = commit(
      s8,
      { type: 'SYNC_CHANNEL', rowId: 'theme', ck: 'b', label: '테마', chName: '여기어때', to: '가족추천, 커플, 실외수영장' },
    );

    const found = step('연속 9단계 (추가 → 옵션 변경 → 옵션 요금 → 이용 시간 → 삭제 → 항목 제거 → 항목 추가 → 규칙 → 채널 교정)', s9, [
      `객실 ${s0.rooms.length} → ${s9.rooms.length}`,
      `공용 BBQ: ${field(s9, 'shared_bbq', '이용 객실')} · ${field(s9, 'shared_bbq', '바베큐 형태')} · ${field(s9, 'shared_bbq', '이용 시간')}`,
      `공용 BBQ 요금(자동 산출): ${field(s9, 'shared_bbq', '이용 요금')}`,
      `FAQ Q-0015: ${faq(s9, 'Q-0015').a}`,
      `추가 인원 규칙: ${ruleText(s9.blocks.find((b) => b.key === 'extra_person')!.rules![1])}`,
      `이력 ${s9.history.length}건`,
    ]);

    expect(errorsOf(s9)).toEqual([]);
    expect(found.filter((f) => f.severity === 'error')).toEqual([]);
  });
});

describe('일관성 검사기 자체 검증', () => {
  it('요금이 옵션과 어긋나면 잡아낸다', () => {
    const st = initialState();
    const broken = { ...st, rooms: st.rooms.map((r, i) => (i === 0 ? { ...r, bbqFee: '1세트 9,999원' } : r)) };
    expect(errorsOf(broken).some((v) => v.what.includes('옵션 요금과 다릅니다'))).toBe(true);
  });

  it('자동 산출 필드가 낡으면 잡아낸다', () => {
    const st = initialState();
    const broken = {
      ...st,
      blocks: st.blocks.map((b) =>
        b.key === 'shared_bbq' ? { ...b, fields: b.fields.map((f) => (f[0] === '이용 객실' ? [f[0], '4~7층 객실 · 99객실'] as [string, string] : f)) } : b,
      ),
    };
    expect(errorsOf(broken).some((v) => v.what.includes('낡았습니다'))).toBe(true);
  });

  it('객실명이 중복되면 잡아낸다', () => {
    const st = initialState();
    const broken = { ...st, rooms: [...st.rooms, { ...st.rooms[0], code: '99999' }] };
    expect(errorsOf(broken).some((v) => v.what.includes('객실명이 중복'))).toBe(true);
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
