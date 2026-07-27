import { createContext, useContext, useMemo, useReducer, type Dispatch, type ReactNode } from 'react';
import { attrDef, attrsOf, cur, feeOf, valueOf } from '../domain/attrs';
import {
  applyCascade,
  buildRoom,
  previewAddBlockItem,
  previewBlockEdit,
  previewBlockState,
  previewBlockUse,
  previewBulk,
  previewChannelSync,
  previewDelete,
  previewNewRoom,
  previewOptFee,
  previewRule,
  previewRuleAdd,
  previewRuleDel,
} from '../domain/cascade';
import { slotText } from '../domain/derive';
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
  Property,
  Settings,
  TabId,
  Tier,
} from '../domain/types';

export type Action =
  | { type: 'SET_PROPERTY'; id: string }
  | { type: 'SET_TAB'; tab: TabId }
  | { type: 'SET_QUERY'; q: string }
  | { type: 'SET_BFILTER'; f: BlockFilter }
  | { type: 'SET_SETTINGS'; patch: Partial<Settings> }
  | { type: 'TOGGLE_ROOM'; code: string }
  | { type: 'TOGGLE_ALL' }
  | { type: 'CLEAR_SEL' }
  | { type: 'OPEN_BULK' }
  | { type: 'CLOSE_BULK' }
  | { type: 'PICK_BULK_ATTR'; attr: string }
  | { type: 'PICK_BULK_VALUE'; value: AttrValue }
  | { type: 'PICK_CELL'; code: string; attr: string; value: AttrValue }
  | { type: 'OPEN_NEW_ROOM' }
  | { type: 'CLOSE_NEW_ROOM' }
  | { type: 'SET_NR_NAME'; v: string }
  | { type: 'SET_NR_FLOOR'; v: string }
  | { type: 'SET_NR_VALUE'; attr: string; v: AttrValue }
  | { type: 'PREVIEW_BULK' }
  | { type: 'PREVIEW_DELETE' }
  | { type: 'PREVIEW_NEW_ROOM' }
  | { type: 'PREVIEW_BLOCK_STATE'; blockKey: string; nextSt: 'off' | 'none' }
  | { type: 'PREVIEW_BLOCK_USE'; blockKey: string }
  | { type: 'PREVIEW_ADD_BLOCK_ITEM'; blockKey: string }
  | { type: 'PREVIEW_RULE_ADD'; blockKey: string; ruleId: string }
  | { type: 'PREVIEW_RULE_DEL'; blockKey: string; ri: number }
  | { type: 'OPEN_BLOCK_EDIT'; blockKey: string; k: string; v: string }
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
      return { ...st, current: a.id, sel: [], q: '', bulk: null, nr: null, cas: null, edit: null, toast: '' };
    case 'SET_TAB':
      return { ...st, tab: a.tab };
    case 'SET_QUERY':
      return { ...st, q: a.q };
    case 'SET_BFILTER':
      return { ...st, bfilter: a.f };
    case 'SET_SETTINGS':
      return { ...st, settings: { ...st.settings, ...a.patch } };

    case 'TOGGLE_ROOM':
      return { ...st, sel: st.sel.includes(a.code) ? st.sel.filter((c) => c !== a.code) : [...st.sel, a.code] };
    case 'TOGGLE_ALL':
      return { ...st, sel: st.sel.length === p.rooms.length ? [] : p.rooms.map((r) => r.code) };
    case 'CLEAR_SEL':
      return { ...st, sel: [] };

    case 'OPEN_BULK': {
      const attr = firstAttr(p);
      return { ...st, bulk: { attr, value: p.defaults[attr] } };
    }
    case 'CLOSE_BULK':
      return { ...st, bulk: null };
    case 'PICK_BULK_ATTR':
      return { ...st, bulk: { attr: a.attr, value: p.defaults[a.attr] } };
    case 'PICK_BULK_VALUE':
      return st.bulk ? { ...st, bulk: { ...st.bulk, value: a.value } } : st;

    /** 칸에서 값을 고르면 그 객실에만 바로 씁니다 — 창을 거치지 않습니다. */
    case 'PICK_CELL': {
      const room = p.rooms.find((r) => r.code === a.code);
      if (!room || valueOf(p, room, a.attr) === a.value) return { ...st, bulk: null };
      return openCascade({ ...st, sel: [a.code], bulk: null }, previewBulk(p, [a.code], a.attr, a.value));
    }

    case 'OPEN_NEW_ROOM':
      return { ...st, nr: { name: '', floor: String(p.rooms[0]?.floor ?? 1), values: {} } };
    case 'CLOSE_NEW_ROOM':
      return { ...st, nr: null };
    case 'SET_NR_NAME':
      return st.nr ? { ...st, nr: { ...st.nr, name: a.v } } : st;
    case 'SET_NR_FLOOR':
      return st.nr ? { ...st, nr: { ...st.nr, floor: a.v } } : st;
    case 'SET_NR_VALUE':
      return st.nr ? { ...st, nr: { ...st.nr, values: { ...st.nr.values, [a.attr]: a.v } } } : st;

    case 'PREVIEW_BULK':
      return st.bulk ? openCascade({ ...st, bulk: null }, previewBulk(p, st.sel, st.bulk.attr, st.bulk.value)) : st;
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

    case 'OPEN_BLOCK_EDIT': {
      const bk = p.blocks.find((b) => b.key === a.blockKey);
      if (!bk) return st;
      const type = typeOf(bk.key, a.k);
      return { ...st, edit: { kind: 'block', bk, k: a.k, type, p: parseVal(type, a.v) } };
    }
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
