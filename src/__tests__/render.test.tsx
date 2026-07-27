import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import App from '../App';
import { initialState } from '../domain/seed';
import type { MasterState, TabId } from '../domain/types';
import { StoreProvider, reducer, type Action } from '../state/store';

/** Smoke test: every screen renders without throwing, and the pieces that carry
 *  the design's meaning are actually on the page. */
const html = (...actions: Action[]) => {
  const state: MasterState = actions.reduce(reducer, initialState());
  return renderToStaticMarkup(
    <StoreProvider initial={state}>
      <App />
    </StoreProvider>,
  );
};

const onTab = (tab: TabId) => html({ type: 'SET_TAB', tab });
const onTabWith = (tab: TabId, ...rest: Action[]) => html({ type: 'SET_TAB', tab }, ...rest);

const A401 = '27740';

describe('console shell', () => {
  it('draws the chrome, the room grid and the inspector', () => {
    const out = html();
    expect(out).toContain('STAYHUB 마스터');
    expect(out).toContain('속초 더샵 스파 펜션');
    expect(out).toContain('A701');
    expect(out).toContain('이 객실만 따로 정함');
    expect(out).toContain('이 숙소의 전체값');
  });

  it('lists all 28 rooms', () => {
    const codes = html().match(/277\d\d/g) ?? [];
    expect(new Set(codes).size).toBe(28);
  });

  it('hides the inspector in the 2단 layout', () => {
    const out = html({ type: 'SET_SETTINGS', patch: { layout: '2panel' } });
    expect(out).not.toContain('이 숙소의 전체값');
  });

  it('shows the 숙소 전체값 under inherited cells in 고스트 mode', () => {
    expect(html()).not.toContain('전체 공용BBQ · 가스그릴');
    expect(html({ type: 'SET_SETTINGS', patch: { inheritanceViz: 'ghost' } })).toContain('전체 공용BBQ · 가스그릴');
  });
});

/* ── 1000개를 담는 구조가 화면에 드러나는가 ─────────────────────────────── */

describe('숙소마다 열이 달라진다', () => {
  /** 옆 목록에는 세 숙소 이름이 모두 있으므로, 열이 진짜 달라졌는지는 표 안에만 나오는
   *  값(선택지 이름)으로 확인합니다. */
  it('draws a column per attribute the property declares — and none of the others', () => {
    const sokcho = html();
    expect(sokcho).toContain('공용BBQ · 가스그릴');
    expect(sokcho).toContain('제트스파 2인용');
    expect(sokcho).not.toContain('오토캠핑 (차량 진입)');

    const hongcheon = html({ type: 'SET_PROPERTY', id: 'hongcheon' });
    expect(hongcheon).toContain('홍천 카라반파크');
    expect(hongcheon).toContain('오토캠핑 (차량 진입)');
    expect(hongcheon).not.toContain('제트스파 2인용');

    const gapyeong = html({ type: 'SET_PROPERTY', id: 'gapyeong' });
    expect(gapyeong).toContain('개별풀 · 냉수');
    expect(gapyeong).toContain('소형견 1마리');
    expect(gapyeong).not.toContain('공용BBQ · 가스그릴');
  });

  it('lists every property in the sidebar, with the current one marked', () => {
    const out = html();
    expect(out).toContain('가평 리버뷰 풀빌라');
    expect(out).toContain('홍천 카라반파크');
  });

  it('shows 인원 as a number with its unit, not as a fixed choice', () => {
    const out = html();
    expect(out).toContain('기준 인원');
    expect(out).toContain('최대 인원');
    expect(out).toContain('인원과 요금은 숫자를 직접 넣습니다');
  });
});

describe('every tab renders', () => {
  it('시설 정보 — cards, format tags and the rule editor', () => {
    const out = onTab('blocks');
    expect(out).toContain('이 숙소가 가진 시설');
    expect(out).toContain('자동 계산');
    expect(out).toContain('안내 문구');
    expect(out).toContain('21:00 이후 입실 시 사전 연락 필수');
    expect(out).toContain('없음');
  });

  it('요금표 — one row per option with its fee and channel words', () => {
    const out = onTab('options');
    expect(out).toContain('바베큐 종류와 요금');
    expect(out).toContain('shared_charcoal');
    expect(out).toContain('참숯BBQ');
  });

  it('요금표 — follows the property: 홍천은 캠핑 자리 요금이 나온다', () => {
    const out = html({ type: 'SET_PROPERTY', id: 'hongcheon' }, { type: 'SET_TAB', tab: 'options' });
    expect(out).toContain('캠핑 자리 종류와 요금');
    expect(out).toContain('caravan');
    expect(out).not.toContain('스파 종류와 요금');
  });

  it('판매 사이트 — mismatches flagged against the computed value', () => {
    const out = onTab('channels');
    expect(out).toContain('판매 사이트에 나가는 값');
    expect(out).toContain('다른 값 3개');
    expect(out).toContain('기준값으로 맞추기');
  });

  it('자주 묻는 질문 — derived answers carry their source', () => {
    const out = onTab('faq');
    expect(out).toContain('시설 정보에서 자동');
    expect(out).toContain('17:00~21:00에 이용 가능합니다.');
    expect(out).toContain('미사용 시설 · 자동 비활성');
  });

  it('바꾼 기록', () => {
    expect(onTab('history')).toContain('공용 BBQ · 이용 시간 변경');
  });
});

describe('every dialog renders', () => {
  it('한꺼번에 바꾸기 — 선택지 값', () => {
    const out = html(
      { type: 'TOGGLE_ROOM', code: A401 },
      { type: 'OPEN_BULK' },
      { type: 'PICK_BULK_ATTR', attr: 'bbq' },
      { type: 'PICK_BULK_VALUE', value: 'shared_charcoal' },
    );
    expect(out).toContain('객실 1개 한꺼번에 바꾸기');
    expect(out).toContain('숙소 전체값과 달라 &quot;이 객실만 따로 정함&quot;으로 기록됩니다.');
  });

  it('한꺼번에 바꾸기 — 인원은 숫자 입력칸이 나온다', () => {
    const out = html({ type: 'TOGGLE_ROOM', code: A401 }, { type: 'OPEN_BULK' });
    expect(out).toContain('숫자를 넣으세요');
    expect(out).toContain('type="number"');
    expect(out).toContain('요금에 포함된 인원');
  });

  it('객실 만들기 — 이 숙소가 쓰는 값만 물어본다', () => {
    const out = html({ type: 'OPEN_NEW_ROOM' });
    expect(out).toContain('객실 만들기');
    expect(out).toContain('기준 인원');
    expect(out).toContain('type="number"');
    expect(out).toContain('공용BBQ · 가스그릴');
    expect(out).not.toContain('오토캠핑 (차량 진입)');
  });

  it('확인 창 — 지우기처럼 되돌리기로 못 되살리는 것만', () => {
    const out = html({ type: 'TOGGLE_ROOM', code: A401 }, { type: 'PREVIEW_DELETE' });
    expect(out).toContain('이렇게 바뀝니다');
    expect(out).toContain('객실 1개를 지웁니다');
    expect(out).toContain('네, 바꿀게요');
  });

  it('값 고치기 — 시간대', () => {
    const out = onTabWith('blocks', {
      type: 'OPEN_BLOCK_EDIT',
      blockKey: 'shared_bbq',
      k: '이용 시간',
      v: '17:00~21:00',
    });
    expect(out).toContain('공용 BBQ · 이용 시간');
    expect(out).toContain('언제부터');
    expect(out).toContain('덧붙일 조건');
    expect(out).toContain('이렇게 저장돼요');
  });

  it('값 고치기 — 금액 구간', () => {
    const out = onTabWith('options', { type: 'OPEN_OPT_FEE', attr: 'bbq', code: 'shared_gas' });
    expect(out).toContain('공용BBQ · 가스그릴 요금 고치기');
    expect(out).toContain('얼마 기준');
    expect(out).toContain('어디서 냄');
    expect(out).toContain('+ 구간 넣기');
  });

  it('바꾸면 문장으로 알리고 되돌릴 수 있다', () => {
    const out = html({ type: 'PICK_CELL', code: A401, attr: 'bbq', value: 'none' });
    expect(out).toContain('되돌리기');
    expect(out).toContain('바꿨어요');
  });
});
