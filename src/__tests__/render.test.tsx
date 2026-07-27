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

const onTab = (tab: TabId, ...rest: Action[]) => html({ type: 'SET_TAB', tab }, ...rest);

describe('console shell', () => {
  it('draws the chrome, the room grid and the inspector', () => {
    const out = html();
    expect(out).toContain('STAYHUB 마스터');
    expect(out).toContain('속초 더샵 스파 펜션');
    expect(out).toContain('A701');
    expect(out).toContain('이 객실만 따로 정함');
    expect(out).toContain('이 값 설명');
  });

  it('lists all 28 rooms', () => {
    const codes = html().match(/277\d\d/g) ?? [];
    expect(new Set(codes).size).toBe(28);
  });

  it('hides the inspector in the 2단 layout', () => {
    const out = html({ type: 'SET_SETTINGS', patch: { layout: '2panel' } });
    expect(out).not.toContain('이 값 설명');
  });

  it('shows the 숙소 기본값 under inherited cells in 고스트 mode', () => {
    expect(html()).not.toContain('전체 공용BBQ · 가스그릴');
    expect(html({ type: 'SET_SETTINGS', patch: { inheritanceViz: 'ghost' } })).toContain('전체 공용BBQ · 가스그릴');
  });
});

describe('every tab renders', () => {
  it('시설·블록정보 — cards, format tags and the rule editor', () => {
    const out = onTab('blocks');
    expect(out).toContain('이 숙소가 가진 시설');
    expect(out).toContain('자동 계산');
    expect(out).toContain('안내 문구');
    expect(out).toContain('21:00 이후 입실 시 사전 연락 필수');
    expect(out).toContain('없음');
  });

  it('옵션·요금 — one row per option with its fee and channel words', () => {
    const out = onTab('options');
    expect(out).toContain('바베큐 종류와 요금');
    expect(out).toContain('shared_charcoal');
    expect(out).toContain('참숯BBQ');
  });

  it('채널 매핑 — mismatches flagged against the dictionary', () => {
    const out = onTab('channels');
    expect(out).toContain('판매 사이트에 나가는 값');
    expect(out).toContain('다른 값 3개');
    expect(out).toContain('기준값으로 맞추기');
  });

  it('FAQ — derived answers carry their source', () => {
    const out = onTab('faq');
    expect(out).toContain('시설 정보에서 자동');
    expect(out).toContain('17:00~21:00에 이용 가능합니다.');
    expect(out).toContain('미사용 시설 · 자동 비활성');
  });

  it('변경 이력', () => {
    expect(onTab('history')).toContain('공용 BBQ · 이용 시간 변경');
  });
});

describe('every dialog renders', () => {
  it('일괄 편집', () => {
    const out = html({ type: 'TOGGLE_ROOM', code: '27740' }, { type: 'OPEN_BULK' });
    expect(out).toContain('객실 1개 한꺼번에 바꾸기');
    expect(out).toContain('숙소 기본값과 달라 객실 오버라이드로 기록됩니다.');
  });

  it('객실 만들기', () => {
    expect(html({ type: 'OPEN_NEW_ROOM' })).toContain('객실 만들기');
  });

  it('확인 창 — 지우기처럼 되돌리기로 못 되살리는 것만', () => {
    const out = html({ type: 'TOGGLE_ROOM', code: '27740' }, { type: 'PREVIEW_DELETE' });
    expect(out).toContain('이렇게 바뀝니다');
    expect(out).toContain('객실 1개를 지웁니다');
    expect(out).toContain('네, 바꿀게요');
  });

  it('값 편집기 — 시간대', () => {
    const out = onTab('blocks', {
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

  it('값 편집기 — 금액 구간', () => {
    const out = onTab('options', { type: 'OPEN_OPT_FEE', code: 'shared_gas' });
    expect(out).toContain('공용BBQ · 가스그릴 요금 고치기');
    expect(out).toContain('얼마 기준');
    expect(out).toContain('어디서 냄');
    expect(out).toContain('+ 구간 넣기');
  });

  it('바꾸면 문장으로 알리고 되돌릴 수 있다', () => {
    const out = html({ type: 'PICK_CELL', code: '27740', field: 'bbq', value: '이용 불가' });
    expect(out).toContain('되돌리기');
    expect(out).toContain('바꿨어요');
  });
});
