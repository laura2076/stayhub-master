import { createContext, useContext, useMemo, useReducer, type Dispatch, type ReactNode } from 'react';
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
import { FIELDS, OPTIONS, optByCode } from '../domain/catalog';
import { curVal, slotText } from '../domain/derive';
import { composeVal, parseVal, typeOf } from '../domain/fieldTypes';
import { initialState } from '../domain/seed';
import type {
  BlockFilter,
  BulkFieldId,
  Cascade,
  ChannelKey,
  ChannelRowId,
  MasterState,
  OptionCode,
  Parts,
  Settings,
  TabId,
  Tier,
} from '../domain/types';

export type Action =
  | { type: 'SET_TAB'; tab: TabId }
  | { type: 'SET_QUERY'; q: string }
  | { type: 'SET_BFILTER'; f: BlockFilter }
  | { type: 'SET_SETTINGS'; patch: Partial<Settings> }
  | { type: 'TOGGLE_ROOM'; code: string }
  | { type: 'TOGGLE_ALL' }
  | { type: 'CLEAR_SEL' }
  | { type: 'OPEN_BULK' }
  | { type: 'CLOSE_BULK' }
  | { type: 'PICK_BULK_FIELD'; id: BulkFieldId }
  | { type: 'PICK_BULK_VALUE'; value: string }
  | { type: 'EDIT_ROOM_FIELD'; code: string; field: BulkFieldId }
  | { type: 'OPEN_NEW_ROOM' }
  | { type: 'CLOSE_NEW_ROOM' }
  | { type: 'SET_NR'; k: 'name' | 'floor' | 'bbq' | 'pax'; v: string }
  | { type: 'PREVIEW_BULK' }
  | { type: 'PREVIEW_DELETE' }
  | { type: 'PREVIEW_NEW_ROOM' }
  | { type: 'PREVIEW_BLOCK_STATE'; blockKey: string; nextSt: 'off' | 'none' }
  | { type: 'PREVIEW_BLOCK_USE'; blockKey: string }
  | { type: 'PREVIEW_ADD_BLOCK_ITEM'; blockKey: string }
  | { type: 'PREVIEW_RULE_ADD'; blockKey: string; ruleId: string }
  | { type: 'PREVIEW_RULE_DEL'; blockKey: string; ri: number }
  | { type: 'OPEN_BLOCK_EDIT'; blockKey: string; k: string; v: string }
  | { type: 'OPEN_OPT_FEE'; code: OptionCode }
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

const SAVED_AT = '2026-07-26 09:41';

/** Commit a cascade: write the data, log the history entry, raise the undo toast. */
const commit = (st: MasterState, c: Cascade): MasterState => {
  const { rooms, blocks, channels, optFees, snapshot, checkedN } = applyCascade(st, c);
  return {
    ...st,
    rooms,
    blocks,
    channels,
    optFees,
    cas: null,
    sel: [],
    snapshot,
    savedAt: SAVED_AT,
    toast: `연쇄 갱신 ${checkedN}건 적용됨 · ${c.field}`,
    history: [
      {
        title: `${c.field} 변경`,
        before: c.from,
        after: c.to,
        n: checkedN,
        who: '김지현',
        at: '방금',
        chips: c.groups.map((g) => g.title),
      },
      ...st.history,
    ],
  };
};

/** In 미리보기 mode the cascade opens as a dialog; in 즉시 적용 mode it commits
 *  straight away — undo from the toast is the safety net either way. */
const openCascade = (st: MasterState, c: Cascade): MasterState =>
  st.settings.cascadeMode === 'instant' ? commit(st, c) : { ...st, cas: c };

const patchParts = (st: MasterState, p: Parts): MasterState =>
  st.edit ? { ...st, edit: { ...st.edit, p } } : st;

export const reducer = (st: MasterState, a: Action): MasterState => {
  switch (a.type) {
    case 'SET_TAB':
      return { ...st, tab: a.tab };
    case 'SET_QUERY':
      return { ...st, q: a.q };
    case 'SET_BFILTER':
      return { ...st, bfilter: a.f };
    case 'SET_SETTINGS':
      return { ...st, settings: { ...st.settings, ...a.patch } };

    case 'TOGGLE_ROOM':
      return {
        ...st,
        sel: st.sel.includes(a.code) ? st.sel.filter((c) => c !== a.code) : [...st.sel, a.code],
      };
    case 'TOGGLE_ALL':
      return { ...st, sel: st.sel.length === st.rooms.length ? [] : st.rooms.map((r) => r.code) };
    case 'CLEAR_SEL':
      return { ...st, sel: [] };

    case 'OPEN_BULK':
      return { ...st, bulk: { field: 'bbq', value: '개별BBQ · 전기그릴' } };
    case 'CLOSE_BULK':
      return { ...st, bulk: null };
    case 'PICK_BULK_FIELD': {
      const value = a.id === 'bbq' ? OPTIONS[0].label : FIELDS.find((f) => f.id === a.id)!.values[0][0];
      return { ...st, bulk: { field: a.id, value } };
    }
    case 'PICK_BULK_VALUE':
      return st.bulk ? { ...st, bulk: { ...st.bulk, value: a.value } } : st;

    /** Clicking a grid cell selects that room and opens the editor in one move. */
    case 'EDIT_ROOM_FIELD': {
      const room = st.rooms.find((r) => r.code === a.code);
      if (!room) return st;
      return { ...st, sel: [a.code], bulk: { field: a.field, value: curVal(room, a.field) } };
    }

    case 'OPEN_NEW_ROOM':
      return { ...st, nr: { name: 'A404', floor: '4', bbq: '공용BBQ · 가스그릴', pax: '2/4' } };
    case 'CLOSE_NEW_ROOM':
      return { ...st, nr: null };
    case 'SET_NR':
      return st.nr ? { ...st, nr: { ...st.nr, [a.k]: a.v } } : st;

    case 'PREVIEW_BULK':
      return st.bulk ? openCascade({ ...st, bulk: null }, previewBulk(st)) : st;
    case 'PREVIEW_DELETE':
      return st.sel.length ? openCascade(st, previewDelete(st)) : st;
    case 'PREVIEW_NEW_ROOM':
      return st.nr ? openCascade({ ...st, nr: null }, previewNewRoom(st, buildRoom(st, st.nr))) : st;

    case 'PREVIEW_BLOCK_STATE': {
      const bk = st.blocks.find((b) => b.key === a.blockKey);
      return bk ? openCascade(st, previewBlockState(st, bk, a.nextSt)) : st;
    }
    case 'PREVIEW_BLOCK_USE': {
      const bk = st.blocks.find((b) => b.key === a.blockKey);
      return bk ? openCascade(st, previewBlockUse(st, bk)) : st;
    }
    case 'PREVIEW_ADD_BLOCK_ITEM': {
      const bk = st.blocks.find((b) => b.key === a.blockKey);
      return bk ? openCascade(st, previewAddBlockItem(st, bk)) : st;
    }
    case 'PREVIEW_RULE_ADD': {
      const bk = st.blocks.find((b) => b.key === a.blockKey);
      return bk ? openCascade(st, previewRuleAdd(bk, a.ruleId)) : st;
    }
    case 'PREVIEW_RULE_DEL': {
      const bk = st.blocks.find((b) => b.key === a.blockKey);
      return bk?.rules?.[a.ri] ? openCascade(st, previewRuleDel(bk, a.ri)) : st;
    }

    case 'OPEN_BLOCK_EDIT': {
      const bk = st.blocks.find((b) => b.key === a.blockKey);
      if (!bk) return st;
      const type = typeOf(bk.key, a.k);
      return { ...st, edit: { kind: 'block', bk, k: a.k, type, p: parseVal(type, a.v) } };
    }
    case 'OPEN_OPT_FEE': {
      const o = optByCode(a.code);
      return { ...st, edit: { kind: 'optfee', o, k: '이용요금', type: 'tier', p: parseVal('tier', st.optFees[o.code]) } };
    }
    case 'OPEN_RULE_SLOT': {
      const bk = st.blocks.find((b) => b.key === a.blockKey);
      const s = bk?.rules?.[a.ri]?.slots[a.si];
      if (!bk || !s) return st;
      return {
        ...st,
        edit: { kind: 'rule', bk, ri: a.ri, si: a.si, k: `${bk.label} 규칙`, type: s.type, p: parseVal(s.type, slotText(s)) },
      };
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
      return patchParts(st, {
        ...st.edit.p,
        tiers: [...st.edit.p.tiers, { a: last.b + 1, b: last.b + 2, amt: last.amt + 10000 }],
      });
    }
    case 'DEL_TIER': {
      if (!st.edit?.p.tiers) return st;
      const tiers = st.edit.p.tiers.filter((_, i) => i !== a.i);
      /** Never leave the tier editor empty — a fee has to say something. */
      return patchParts(st, { ...st.edit.p, tiers: tiers.length ? tiers : st.edit.p.tiers });
    }

    case 'PREVIEW_EDIT': {
      const e = st.edit;
      if (!e) return st;
      const cleared = { ...st, edit: null };
      if (e.kind === 'optfee') {
        return openCascade(cleared, previewOptFee(st, e.o.code, e.o.label, composeVal('tier', e.p)));
      }
      if (e.kind === 'rule') {
        const slot = e.bk.rules![e.ri].slots[e.si];
        /** Money and 정수 slots store the bare number (the unit lives in the slot type);
         *  every other format stores its composed string. */
        const nv =
          slot.type === 'money'
            ? (e.p.amt ?? 0)
            : slot.type.startsWith('int:')
              ? (e.p.n ?? 0)
              : composeVal(slot.type, e.p);
        return openCascade(cleared, previewRule(e.bk, e.ri, e.si, nv));
      }
      return openCascade(cleared, previewBlockEdit(st, e.bk, e.k, composeVal(e.type, e.p)));
    }

    case 'SYNC_CHANNEL':
      return openCascade(st, previewChannelSync(st, a.rowId, a.ck, a.label, a.chName, a.to));

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

    case 'UNDO': {
      const sn = st.snapshot;
      if (!sn) return { ...st, toast: '' };
      return {
        ...st,
        rooms: sn.rooms,
        channels: sn.channels,
        blocks: sn.blocks,
        optFees: sn.optFees,
        faqs: sn.faqs,
        snapshot: null,
        toast: '',
        history: st.history.slice(1),
      };
    }
    case 'CLEAR_TOAST':
      return { ...st, toast: '' };

    default:
      return st;
  }
};

/** Bulk value list — BBQ reads from the option catalogue so the fee travels with the label. */
export const bulkValueList = (st: MasterState): [string, string][] => {
  if (!st.bulk) return [];
  const fd = FIELDS.find((f) => f.id === st.bulk!.field)!;
  return fd.id === 'bbq'
    ? OPTIONS.map((o) => [o.label, `${o.label} · ${st.optFees[o.code]}`])
    : fd.values;
};

export const bulkHint = (st: MasterState): string => {
  if (!st.bulk) return '';
  const base = { maxP: '4', extra: '30000', bbq: '공용BBQ · 가스그릴', spa: '제트스파 2인용', facil: '변형3' }[st.bulk.field];
  return st.bulk.value === base
    ? '숙소 기본값과 같습니다 — 오버라이드가 해제되고 상속으로 돌아갑니다.'
    : '숙소 기본값과 달라 객실 오버라이드로 기록됩니다.';
};

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
