import { createContext, useContext, useMemo, useReducer, type Dispatch, type ReactNode } from 'react';
import { attrDef, attrsOf, cur, feeOf, valueOf } from '../domain/attrs';
import {
  applyCascade,
  buildRoom,
  previewAddBlockItem,
  previewBlockEdit,
  previewBlockMembers,
  previewBlockPer,
  previewBlockState,
  previewBlockUse,
  previewBulk,
  previewChannelSync,
  previewDefault,
  previewDelete,
  previewFieldAdd,
  previewFieldDel,
  previewNewRoom,
  previewOptFee,
  previewRoomInfo,
  previewRule,
  previewRuleAdd,
  previewRuleDel,
} from '../domain/cascade';
import { baseValue, fieldValueOf, ownRooms } from '../domain/blockValues';
import { canSplit, membersOf, slotText } from '../domain/derive';
import { composeVal, parseVal, typeOf } from '../domain/fieldTypes';
import { initialState } from '../domain/seed';
import { doneSentence, needsConfirm } from '../domain/summary';
import type {
  AttrValue,
  BlockFilter,
  Cascade,
  ChannelKey,
  ChannelRowId,
  MasterState,
  Parts,
  NewRoomDraft,
  Property,
  Room,
  RoomEdit,
  RoomSort,
  Settings,
  TabId,
  Tier,
} from '../domain/types';

export type Action =
  | { type: 'SET_PROPERTY'; id: string }
  | { type: 'SET_TAB'; tab: TabId }
  | { type: 'SET_QUERY'; q: string }
  | { type: 'SET_BQUERY'; q: string }
  | { type: 'SET_BFILTER'; f: BlockFilter }
  | { type: 'SET_SETTINGS'; patch: Partial<Settings> }
  | { type: 'TOGGLE_ROOM'; code: string }
  | { type: 'TOGGLE_ALL' }
  | { type: 'SELECT_FLOOR'; floor: number }
  | { type: 'SELECT_OWN' }
  | { type: 'SELECT_BY_VALUE'; attr: string; value: AttrValue }
  | { type: 'CLEAR_SEL' }
  | { type: 'OPEN_BULK' }
  | { type: 'CLOSE_BULK' }
  | { type: 'PICK_BULK_ATTR'; attr: string }
  | { type: 'PICK_BULK_VALUE'; value: AttrValue }
  | { type: 'SET_BULK_PER'; code: string; value: AttrValue }
  | { type: 'CLEAR_BULK_PER'; code: string }
  | { type: 'BULK_TOGGLE_ROOM'; code: string }
  | { type: 'BULK_TOGGLE_FLOOR'; floor: number }
  | { type: 'BULK_CLEAR_SEL' }
  | { type: 'TOGGLE_BULK_PER_OPEN' }
  | { type: 'PICK_CELL'; code: string; attr: string; value: AttrValue }
  | { type: 'PICK_DEFAULT'; attr: string; value: AttrValue }
  | { type: 'SET_SORT'; sort: RoomSort }
  | { type: 'TOGGLE_ONLY_OWN' }
  | { type: 'OPEN_NEW_ROOM'; from?: string }
  | { type: 'CLOSE_NEW_ROOM' }
  | { type: 'SET_NR'; patch: Partial<NewRoomDraft> }
  | { type: 'SET_NR_VALUE'; attr: string; v: AttrValue }
  | { type: 'OPEN_ROOM_EDIT'; code: string }
  | { type: 'CLOSE_ROOM_EDIT' }
  | { type: 'SET_RE'; patch: Partial<RoomEdit> }
  | { type: 'PREVIEW_ROOM_EDIT' }
  | { type: 'PREVIEW_FIELD_ADD'; blockKey: string; fieldKey: string }
  | { type: 'PREVIEW_FIELD_DEL'; blockKey: string; fieldKey: string }
  | { type: 'PREVIEW_BULK' }
  | { type: 'PREVIEW_DELETE' }
  | { type: 'PREVIEW_NEW_ROOM' }
  | { type: 'PREVIEW_BLOCK_STATE'; blockKey: string; nextSt: 'off' | 'none' }
  | { type: 'PREVIEW_BLOCK_USE'; blockKey: string }
  | { type: 'PREVIEW_ADD_BLOCK_ITEM'; blockKey: string }
  | { type: 'PREVIEW_RULE_ADD'; blockKey: string; ruleId: string }
  | { type: 'PREVIEW_RULE_DEL'; blockKey: string; ri: number }
  | { type: 'OPEN_BLOCK_EDIT'; blockKey: string; k: string }
  | { type: 'OPEN_BLOCK_ROOMS'; blockKey: string; fieldKey?: string; focusCode?: string }
  | { type: 'CLOSE_BLOCK_ROOMS' }
  | { type: 'BR_SET_TAB'; tab: 'members' | 'fields' }
  | { type: 'BR_SET_FIELD'; fieldKey: string }
  | { type: 'BR_TOGGLE_ROOM'; code: string }
  | { type: 'BR_TOGGLE_FLOOR'; floor: number }
  | { type: 'BR_SELECT_SAME'; value: string }
  | { type: 'BR_EDIT_PICKED' }
  | { type: 'BR_RESET_PICKED' }
  | { type: 'BR_APPLY_MEMBERS' }
  | { type: 'OPEN_ROOM_FACILITIES'; code: string }
  | { type: 'CLOSE_ROOM_FACILITIES' }
  | { type: 'OPEN_OPT_FEE'; attr: string; code: string }
  | { type: 'OPEN_RULE_SLOT'; blockKey: string; ri: number; si: number }
  | { type: 'CLOSE_EDIT' }
  | { type: 'SET_PART'; k: keyof Parts; v: Parts[keyof Parts] }
  | { type: 'SET_TIER'; i: number; k: keyof Tier; v: string }
  | { type: 'ADD_TIER' }
  | { type: 'DEL_TIER'; i: number }
  | { type: 'PREVIEW_EDIT' }
  | { type: 'SYNC_CHANNEL'; rowId: ChannelRowId; ck: ChannelKey; label: string; chName: string; to: string }
  | { type: 'TOGGLE_TARGET'; key: string }
  | { type: 'CLOSE_CAS' }
  | { type: 'APPLY_CAS' }
  | { type: 'UNDO' }
  | { type: 'CLEAR_TOAST' };

/** 지금 보고 있는 숙소. 화면은 늘 한 곳만 다룹니다. */
export const current = (st: MasterState): Property => cur(st.properties, st.current);

const replace = (st: MasterState, next: Property): MasterState => ({
  ...st,
  properties: st.properties.map((p) => (p.id === next.id ? next : p)),
});

/** 바꾸기를 실제로 씁니다 — 데이터·기록·되돌리기 토스트가 한 번에 움직입니다. */
const commit = (st: MasterState, c: Cascade): MasterState => {
  const p = current(st);
  const { next, checkedN } = applyCascade(p, c);
  const withHistory: Property = {
    ...next,
    history: [
      { title: `${c.field} 변경`, before: c.from, after: c.to, n: checkedN, who: '김지현', at: '방금', chips: c.groups.map((g) => g.title) },
      ...p.history,
    ],
  };
  return { ...replace(st, withHistory), cas: null, sel: [], snapshot: p, toast: doneSentence(c) };
};

/** 값 바꾸기는 되돌릴 수 있어서 그냥 씁니다. 만들기·지우기와 남의 설정을 덮어쓰는
 *  것만 한 번 묻습니다 — 되돌리기로 되살릴 수 없는 판단이라서요. */
const openCascade = (st: MasterState, c: Cascade): MasterState =>
  st.settings.cascadeMode === 'always' || needsConfirm(c) ? { ...st, cas: c } : commit(st, c);

const patchParts = (st: MasterState, p: Parts): MasterState => (st.edit ? { ...st, edit: { ...st.edit, p } } : st);

/** 이 숙소에서 한꺼번에 바꿀 수 있는 첫 속성. */
const firstAttr = (p: Property): string => p.attrs[0];

export const reducer = (st: MasterState, a: Action): MasterState => {
  const p = current(st);

  switch (a.type) {
    case 'SET_PROPERTY':
      return { ...st, current: a.id, sel: [], q: '', bq: '', bulk: null, nr: null, re: null, cas: null, edit: null, toast: '' };
    case 'SET_TAB':
      return { ...st, tab: a.tab };
    case 'SET_QUERY':
      return { ...st, q: a.q };
    case 'SET_BQUERY':
      return { ...st, bq: a.q };
    case 'SET_BFILTER':
      return { ...st, bfilter: a.f };
    case 'SET_SETTINGS':
      return { ...st, settings: { ...st.settings, ...a.patch } };

    case 'TOGGLE_ROOM':
      return { ...st, sel: st.sel.includes(a.code) ? st.sel.filter((c) => c !== a.code) : [...st.sel, a.code] };
    case 'TOGGLE_ALL':
      return { ...st, sel: st.sel.length === p.rooms.length ? [] : p.rooms.map((r) => r.code) };
    /** 직원은 층으로 생각합니다 — "3층은 개별바베큐야". 체크박스 6번이 한 번이 됩니다.
     *  이미 그 층이 다 골라져 있으면 해제해서, 같은 버튼으로 켜고 끕니다. */
    case 'SELECT_FLOOR': {
      const codes = p.rooms.filter((r) => r.floor === a.floor).map((r) => r.code);
      const allOn = codes.every((c) => st.sel.includes(c));
      return {
        ...st,
        sel: allOn ? st.sel.filter((c) => !codes.includes(c)) : [...new Set([...st.sel, ...codes])],
      };
    }
    case 'SELECT_OWN': {
      const codes = p.rooms
        .filter((r) => attrsOf(p).some((d) => d.key in r.values && r.values[d.key] !== p.defaults[d.key]))
        .map((r) => r.code);
      const allOn = codes.length > 0 && codes.every((c) => st.sel.includes(c));
      return { ...st, sel: allOn ? st.sel.filter((c) => !codes.includes(c)) : [...new Set([...st.sel, ...codes])] };
    }
    /** "이 값을 쓰는 객실 전부" — 공용BBQ 22실을 숯불로 바꾸는 일이 두 번 클릭이 됩니다. */
    case 'SELECT_BY_VALUE': {
      const codes = p.rooms.filter((r) => valueOf(p, r, a.attr) === a.value).map((r) => r.code);
      return { ...st, sel: [...new Set([...st.sel, ...codes])] };
    }
    case 'CLEAR_SEL':
      return { ...st, sel: [] };

    /** 창은 표에서 고른 객실을 물려받되, 그 뒤로는 창 안에서 더 넣고 뺄 수 있습니다.
     *  고르는 일과 값 넣는 일이 한 창 안에서 끝나야 왔다 갔다 하지 않습니다. */
    case 'OPEN_BULK': {
      const attr = firstAttr(p);
      const sel = st.sel.length ? st.sel : p.rooms.map((r) => r.code);
      return { ...st, bulk: { attr, value: p.defaults[attr], per: {}, sel, open: false } };
    }
    case 'CLOSE_BULK':
      return { ...st, bulk: null };
    /** 속성을 바꾸면 개별값은 버립니다 — 인원에 넣은 6이 바베큐에 남으면 안 됩니다. */
    case 'PICK_BULK_ATTR':
      return st.bulk ? { ...st, bulk: { ...st.bulk, attr: a.attr, value: p.defaults[a.attr], per: {} } } : st;
    case 'PICK_BULK_VALUE':
      return st.bulk ? { ...st, bulk: { ...st.bulk, value: a.value } } : st;
    case 'SET_BULK_PER':
      return st.bulk ? { ...st, bulk: { ...st.bulk, per: { ...st.bulk.per, [a.code]: a.value } } } : st;
    case 'CLEAR_BULK_PER': {
      if (!st.bulk) return st;
      const per = { ...st.bulk.per };
      delete per[a.code];
      return { ...st, bulk: { ...st.bulk, per } };
    }
    case 'BULK_TOGGLE_ROOM': {
      if (!st.bulk) return st;
      const on = st.bulk.sel.includes(a.code);
      const per = { ...st.bulk.per };
      if (on) delete per[a.code];
      return { ...st, bulk: { ...st.bulk, sel: on ? st.bulk.sel.filter((c) => c !== a.code) : [...st.bulk.sel, a.code], per } };
    }
    case 'BULK_TOGGLE_FLOOR': {
      if (!st.bulk) return st;
      const codes = p.rooms.filter((r) => r.floor === a.floor).map((r) => r.code);
      const allOn = codes.every((c) => st.bulk!.sel.includes(c));
      const per = { ...st.bulk.per };
      if (allOn) codes.forEach((c) => delete per[c]);
      return {
        ...st,
        bulk: {
          ...st.bulk,
          sel: allOn ? st.bulk.sel.filter((c) => !codes.includes(c)) : [...new Set([...st.bulk.sel, ...codes])],
          per,
        },
      };
    }
    case 'BULK_CLEAR_SEL':
      return st.bulk ? { ...st, bulk: { ...st.bulk, sel: [], per: {} } } : st;
    case 'TOGGLE_BULK_PER_OPEN':
      return st.bulk ? { ...st, bulk: { ...st.bulk, open: !st.bulk.open } } : st;

    /** 칸에서 값을 고르면 그 객실에만 바로 씁니다 — 창을 거치지 않습니다. */
    case 'PICK_CELL': {
      const room = p.rooms.find((r) => r.code === a.code);
      if (!room || valueOf(p, room, a.attr) === a.value) return { ...st, bulk: null };
      return openCascade({ ...st, sel: [a.code], bulk: null }, previewBulk(p, [a.code], a.attr, a.value));
    }

    /** 숙소 전체값 — 따로 정하지 않은 객실이 전부 따라오므로 늘 한 번 묻습니다. */
    case 'PICK_DEFAULT':
      return p.defaults[a.attr] === a.value ? st : { ...st, cas: previewDefault(p, a.attr, a.value) };

    case 'SET_SORT':
      return { ...st, sort: a.sort };
    case 'TOGGLE_ONLY_OWN':
      return { ...st, onlyOwn: !st.onlyOwn };

    case 'OPEN_NEW_ROOM': {
      /** 복제하면 값·구조·침구까지 그대로 가져옵니다 — 28실 펜션에서 한 실씩 채우는 일이 사라집니다. */
      const src = a.from ? p.rooms.find((r) => r.code === a.from) : undefined;
      /** 그냥 만들 때는 이 숙소에서 **가장 흔한** 모양을 채워 둡니다. 첫 객실을 쓰면
       *  하필 그 한 실이 특이한 경우(7층 복층)에 매번 지우고 다시 쓰게 됩니다. */
      const common = (pick: (r: Room) => string): string => {
        const n = new Map<string, number>();
        p.rooms.forEach((r) => n.set(pick(r), (n.get(pick(r)) ?? 0) + 1));
        return [...n].sort((x, y) => y[1] - x[1])[0]?.[0] ?? '';
      };
      const floor = src?.floor ?? Math.min(...p.rooms.map((r) => r.floor));
      return {
        ...st,
        re: null,
        nr: {
          name: src ? `${src.name} 사본` : '',
          floor,
          floorText: String(floor),
          area: src?.area ?? common((r) => r.area),
          form: src?.form ?? common((r) => r.form),
          bed: src?.bed ?? common((r) => r.bed),
          tag: src?.tag ?? '신규 등록',
          values: src ? { ...src.values } : {},
          from: a.from,
        },
      };
    }
    case 'CLOSE_NEW_ROOM':
      return { ...st, nr: null };
    case 'SET_NR':
      return st.nr ? { ...st, nr: { ...st.nr, ...a.patch } } : st;
    case 'SET_NR_VALUE':
      return st.nr ? { ...st, nr: { ...st.nr, values: { ...st.nr.values, [a.attr]: a.v } } } : st;

    case 'OPEN_ROOM_EDIT': {
      const r = p.rooms.find((x) => x.code === a.code);
      return r
        ? { ...st, re: { code: r.code, name: r.name, floor: r.floor, floorText: String(r.floor), area: r.area, form: r.form, bed: r.bed, tag: r.tag } }
        : st;
    }
    case 'CLOSE_ROOM_EDIT':
      return { ...st, re: null };
    case 'SET_RE':
      return st.re ? { ...st, re: { ...st.re, ...a.patch } } : st;
    case 'PREVIEW_ROOM_EDIT': {
      if (!st.re) return st;
      const { code, floorText, ...rest } = st.re;
      const patch = { ...rest, floor: Number(floorText) || rest.floor };
      return openCascade({ ...st, re: null }, previewRoomInfo(p, code, patch));
    }

    case 'PREVIEW_FIELD_ADD': {
      const bk = p.blocks.find((b) => b.key === a.blockKey);
      return bk ? openCascade(st, previewFieldAdd(bk, a.fieldKey)) : st;
    }
    case 'PREVIEW_FIELD_DEL': {
      const bk = p.blocks.find((b) => b.key === a.blockKey);
      return bk ? openCascade(st, previewFieldDel(p, bk, a.fieldKey)) : st;
    }

    case 'PREVIEW_BULK':
      return st.bulk ? openCascade({ ...st, bulk: null }, previewBulk(p, st.bulk.sel, st.bulk.attr, st.bulk.value, st.bulk.per)) : st;
    case 'PREVIEW_DELETE':
      return st.sel.length ? openCascade(st, previewDelete(p, st.sel)) : st;
    case 'PREVIEW_NEW_ROOM':
      return st.nr ? openCascade({ ...st, nr: null }, previewNewRoom(p, buildRoom(p, st.nr))) : st;

    case 'PREVIEW_BLOCK_STATE': {
      const bk = p.blocks.find((b) => b.key === a.blockKey);
      return bk ? openCascade(st, previewBlockState(p, bk, a.nextSt)) : st;
    }
    case 'PREVIEW_BLOCK_USE': {
      const bk = p.blocks.find((b) => b.key === a.blockKey);
      return bk ? openCascade(st, previewBlockUse(p, bk)) : st;
    }
    case 'PREVIEW_ADD_BLOCK_ITEM': {
      const bk = p.blocks.find((b) => b.key === a.blockKey);
      return bk ? openCascade(st, previewAddBlockItem(p, bk)) : st;
    }
    case 'PREVIEW_RULE_ADD': {
      const bk = p.blocks.find((b) => b.key === a.blockKey);
      return bk ? openCascade(st, previewRuleAdd(bk, a.ruleId)) : st;
    }
    case 'PREVIEW_RULE_DEL': {
      const bk = p.blocks.find((b) => b.key === a.blockKey);
      return bk?.rules?.[a.ri] ? openCascade(st, previewRuleDel(bk, a.ri)) : st;
    }

    /** 값을 고칠 때는 화면에 그려진 문장이 아니라 **저장된 값**을 읽습니다. 객실마다 갈린
     *  항목은 화면에 "7층 15:00~22:00 / 3~6층 17:00~21:00"으로 보이는데, 그 문장을 편집기에
     *  넣으면 형식이 깨집니다. */
    case 'OPEN_BLOCK_EDIT': {
      const bk = p.blocks.find((b) => b.key === a.blockKey);
      if (!bk) return st;
      const type = typeOf(bk.key, a.k);
      return { ...st, edit: { kind: 'block', bk, k: a.k, type, p: parseVal(type, baseValue(bk, a.k)) } };
    }

    /** 시설의 "이용 객실"을 고치는 한 창 — 멤버십과 항목별 예외가 탭으로 갈립니다.
     *  `fieldKey`를 주면 항목 탭으로, 아니면 멤버십 탭(있으면)으로 엽니다. */
    case 'OPEN_BLOCK_ROOMS': {
      const bk = p.blocks.find((b) => b.key === a.blockKey);
      if (!bk) return st;
      const scope = bk.memberOf ? membersOf(p, bk) : p.rooms;
      const splittable = bk.fields.filter(([k]) => canSplit(bk, k)).map(([k]) => k);
      const fieldKey = a.fieldKey ?? splittable[0] ?? '';
      const tab: 'members' | 'fields' = a.fieldKey ? 'fields' : bk.memberOf ? 'members' : 'fields';
      const memberSel = bk.memberOf ? membersOf(p, bk).map((r) => r.code) : [];
      /** 표에서 들어왔으면 그 객실을 항목 탭 선택에 더해 둡니다 — 대개 그 객실 값을 고치러
       *  왔을 테니까요. 멤버십 탭은 건드리지 않습니다 — 최종 목록이라 잘못 건드리면
       *  다른 객실이 빠질 수 있습니다. */
      const own = fieldKey ? ownRooms(bk, scope, fieldKey).map((r) => r.code) : [];
      const fieldSel = a.focusCode && !own.includes(a.focusCode) ? [...own, a.focusCode] : own;
      return { ...st, roomFacilityPick: null, br: { blockKey: a.blockKey, tab, fieldKey, memberSel, fieldSel, focusCode: a.focusCode } };
    }
    case 'CLOSE_BLOCK_ROOMS':
      return { ...st, br: null };
    case 'BR_SET_TAB':
      return st.br ? { ...st, br: { ...st.br, tab: a.tab } } : st;
    case 'BR_SET_FIELD': {
      const bk = st.br && p.blocks.find((b) => b.key === st.br!.blockKey);
      if (!st.br || !bk) return st;
      const scope = bk.memberOf ? membersOf(p, bk) : p.rooms;
      return { ...st, br: { ...st.br, fieldKey: a.fieldKey, fieldSel: ownRooms(bk, scope, a.fieldKey).map((r) => r.code) } };
    }
    case 'BR_TOGGLE_ROOM': {
      if (!st.br) return st;
      const k = st.br.tab === 'members' ? 'memberSel' : 'fieldSel';
      const list = st.br[k];
      return { ...st, br: { ...st.br, [k]: list.includes(a.code) ? list.filter((c) => c !== a.code) : [...list, a.code] } };
    }
    case 'BR_TOGGLE_FLOOR': {
      if (!st.br) return st;
      const k = st.br.tab === 'members' ? 'memberSel' : 'fieldSel';
      const codes = p.rooms.filter((r) => r.floor === a.floor).map((r) => r.code);
      const list = st.br[k];
      const allOn = codes.every((c) => list.includes(c));
      return { ...st, br: { ...st.br, [k]: allOn ? list.filter((c) => !codes.includes(c)) : [...new Set([...list, ...codes])] } };
    }
    /** "지금 이 값을 쓰는 객실 전부" — 항목 탭에서만 뜻이 있습니다. */
    case 'BR_SELECT_SAME': {
      const br = st.br;
      const bk = br && p.blocks.find((b) => b.key === br.blockKey);
      if (!br || !bk || br.tab !== 'fields') return st;
      const scope = bk.memberOf ? membersOf(p, bk) : p.rooms;
      const codes = scope.filter((r) => fieldValueOf(bk, r, br.fieldKey) === a.value).map((r) => r.code);
      return { ...st, br: { ...br, fieldSel: [...new Set([...br.fieldSel, ...codes])] } };
    }
    /** 고른 객실에 넣을 값을 편집기로 받습니다 — 형식은 시설 값을 고칠 때와 똑같습니다. */
    case 'BR_EDIT_PICKED': {
      const br = st.br;
      const bk = br && p.blocks.find((b) => b.key === br.blockKey);
      if (!br || !bk || !br.fieldSel.length) return st;
      const first = p.rooms.find((r) => r.code === br.fieldSel[0]);
      const type = typeOf(bk.key, br.fieldKey);
      const seed = first ? fieldValueOf(bk, first, br.fieldKey) : baseValue(bk, br.fieldKey);
      return { ...st, edit: { kind: 'block', bk, k: br.fieldKey, type, p: parseVal(type, seed), codes: br.fieldSel } };
    }
    /** 따로 정한 값을 떼고 시설 값을 따라가게 되돌립니다 — 값 넣기와 같은 경로를 씁니다. */
    case 'BR_RESET_PICKED': {
      const br = st.br;
      const bk = br && p.blocks.find((b) => b.key === br.blockKey);
      if (!br || !bk || !br.fieldSel.length) return st;
      return openCascade({ ...st, br: null }, previewBlockPer(p, bk, br.fieldKey, br.fieldSel, baseValue(bk, br.fieldKey)));
    }
    /** 멤버십 탭에서 고른 목록을 최종으로 확정합니다 — 늘 한 번 더 확인 창을 거칩니다
     *  (판매 사이트·질문·답변까지 걸린 조작이라서요). */
    case 'BR_APPLY_MEMBERS': {
      const br = st.br;
      const bk = br && p.blocks.find((b) => b.key === br.blockKey);
      if (!br || !bk || !bk.memberOf) return st;
      return openCascade({ ...st, br: null }, previewBlockMembers(p, bk, br.memberSel));
    }

    case 'OPEN_ROOM_FACILITIES':
      return { ...st, roomFacilityPick: a.code };
    case 'CLOSE_ROOM_FACILITIES':
      return { ...st, roomFacilityPick: null };
    case 'OPEN_OPT_FEE': {
      const def = attrDef(a.attr);
      const label = def?.kind === 'option' ? (def.options.find((o) => o.code === a.code)?.label ?? a.code) : a.code;
      return {
        ...st,
        edit: { kind: 'optfee', attr: a.attr, code: a.code, label, k: '요금', type: 'tier', p: parseVal('tier', feeOf(p, a.attr, a.code)) },
      };
    }
    case 'OPEN_RULE_SLOT': {
      const bk = p.blocks.find((b) => b.key === a.blockKey);
      const s = bk?.rules?.[a.ri]?.slots[a.si];
      if (!bk || !s) return st;
      return { ...st, edit: { kind: 'rule', bk, ri: a.ri, si: a.si, k: `${bk.label} 문구`, type: s.type, p: parseVal(s.type, slotText(s)) } };
    }
    case 'CLOSE_EDIT':
      return { ...st, edit: null };

    case 'SET_PART':
      return st.edit ? patchParts(st, { ...st.edit.p, [a.k]: a.v }) : st;
    case 'SET_TIER': {
      if (!st.edit?.p.tiers) return st;
      const tiers = st.edit.p.tiers.map((t, i) => (i === a.i ? { ...t, [a.k]: Number(a.v) || 0 } : t));
      return patchParts(st, { ...st.edit.p, tiers });
    }
    case 'ADD_TIER': {
      if (!st.edit?.p.tiers) return st;
      const last = st.edit.p.tiers[st.edit.p.tiers.length - 1] ?? { b: 4, amt: 30000 };
      return patchParts(st, { ...st.edit.p, tiers: [...st.edit.p.tiers, { a: last.b + 1, b: last.b + 2, amt: last.amt + 10000 }] });
    }
    case 'DEL_TIER': {
      if (!st.edit?.p.tiers) return st;
      const tiers = st.edit.p.tiers.filter((_, i) => i !== a.i);
      return patchParts(st, { ...st.edit.p, tiers: tiers.length ? tiers : st.edit.p.tiers });
    }

    case 'PREVIEW_EDIT': {
      const e = st.edit;
      if (!e) return st;
      const cleared = { ...st, edit: null };
      if (e.kind === 'optfee') return openCascade(cleared, previewOptFee(p, e.attr, e.code, composeVal('tier', e.p)));
      if (e.kind === 'rule') {
        const slot = e.bk.rules![e.ri].slots[e.si];
        const nv =
          slot.type === 'money' ? (e.p.amt ?? 0) : slot.type.startsWith('int:') ? (e.p.n ?? 0) : composeVal(slot.type, e.p);
        return openCascade(cleared, previewRule(e.bk, e.ri, e.si, nv));
      }
      /** 고른 객실이 있으면 그 객실에만, 없으면 시설 값 전체에 — 편집기는 하나입니다. */
      if (e.codes?.length) {
        return openCascade({ ...cleared, br: null }, previewBlockPer(p, e.bk, e.k, e.codes, composeVal(e.type, e.p)));
      }
      return openCascade(cleared, previewBlockEdit(p, e.bk, e.k, composeVal(e.type, e.p)));
    }

    case 'SYNC_CHANNEL':
      return openCascade(st, previewChannelSync(p, a.rowId, a.ck, a.label, a.chName, a.to));

    case 'TOGGLE_TARGET':
      return st.cas
        ? {
            ...st,
            cas: {
              ...st.cas,
              groups: st.cas.groups.map((g) => ({
                ...g,
                items: g.items.map((i) => (i.key === a.key ? { ...i, on: !i.on } : i)),
              })),
            },
          }
        : st;
    case 'CLOSE_CAS':
      return { ...st, cas: null };
    case 'APPLY_CAS':
      return st.cas ? commit(st, st.cas) : st;

    /** 되돌리기는 숙소 전체를 바꾸기 직전으로 되돌립니다 — 조각조각 복원하지 않습니다. */
    case 'UNDO':
      return st.snapshot ? { ...replace(st, st.snapshot), snapshot: null, toast: '' } : { ...st, toast: '' };
    case 'CLEAR_TOAST':
      return { ...st, toast: '' };

    default:
      return st;
  }
};

/** 한꺼번에 바꾸기에서 고를 수 있는 값 목록. */
export const bulkValues = (p: Property, attr: string): { value: AttrValue; label: string; note?: string }[] => {
  const def = attrDef(attr);
  if (def?.kind !== 'option') return [];
  return def.options.map((o) => ({
    value: o.code,
    label: o.label,
    note: [p.defaults[attr] === o.code ? '전체와 같음' : '', def.feeBearing ? feeOf(p, attr, o.code) : '']
      .filter((x) => x && x !== '—')
      .join(' · '),
  }));
};

export const bulkHint = (p: Property, attr: string, value: AttrValue): string =>
  p.defaults[attr] === value
    ? '숙소 전체값과 같습니다 — 따로 정한 표시가 사라지고 전체값을 따라갑니다.'
    : '숙소 전체값과 달라 "이 객실만 따로 정함"으로 기록됩니다.';

export const editableAttrs = attrsOf;

type Store = { state: MasterState; dispatch: Dispatch<Action> };
const StoreContext = createContext<Store | null>(null);

export const StoreProvider = ({ children, initial }: { children: ReactNode; initial?: MasterState }) => {
  const [state, dispatch] = useReducer(reducer, initial ?? null, (i) => i ?? initialState());
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
};

export const useStore = (): Store => {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>');
  return ctx;
};

/** 화면 어디서나 "지금 숙소"를 바로 꺼내 쓰기 위한 지름길. */
export const useProperty = (): Property => current(useStore().state);
