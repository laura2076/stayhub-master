import { optByLabel } from './catalog';
import { fmtNum } from './fieldTypes';
import type {
  Block,
  BlockStatus,
  BulkFieldId,
  CascadeGroup,
  CascadeItem,
  OptionCode,
  Room,
  Rule,
  RuleSlot,
} from './types';

export const stName = (s: BlockStatus): string =>
  s === 'used' ? '사용중' : s === 'off' ? '보유·사용안함' : '미보유';

/** "3층" · "4~7층" · "3층,7층" — contiguous floors collapse to a range. */
export const floorSpan = (list: Room[]): string => {
  const floors = [...new Set(list.map((r) => r.floor))].sort((a, b) => a - b);
  if (!floors.length) return '';
  const contiguous = floors.length > 1 && floors[floors.length - 1] - floors[0] === floors.length - 1;
  return contiguous ? `${floors[0]}~${floors[floors.length - 1]}층` : floors.map((f) => `${f}층`).join(',');
};

/** "4~7층 객실 · 22객실 (A401 제외)" — a sentence nobody types, computed from the room list.
 *  Rooms sitting on those floors that are *not* in the list are called out, so the phrase
 *  can never disagree with the grid. */
export const roomsLabel = (list: Room[], all: Room[]): string => {
  if (!list.length) return '이용 객실 없음';
  const floors = new Set(list.map((r) => r.floor));
  const codes = new Set(list.map((r) => r.code));
  const excluded = all.filter((r) => floors.has(r.floor) && !codes.has(r.code)).map((r) => r.short);
  return `${floorSpan(list)} 객실 · ${list.length}객실${excluded.length ? ` (${excluded.join(',')} 제외)` : ''}`;
};

/** Re-run every auto-derived block field against the room table.
 *  These fields hold a rule, not a stored sentence — so there is nothing to keep in sync by hand. */
export const deriveBlocks = (rooms: Room[], blocks: Block[]): Block[] =>
  blocks.map((b) => {
    if (b.key === 'shared_bbq' || b.key === 'private_bbq') {
      const want = b.key === 'shared_bbq' ? '공용BBQ' : '개별BBQ';
      const list = rooms.filter((r) => r.bbq.includes(want));
      const fees: string[] = [];
      const types: string[] = [];
      list.forEach((r) => {
        if (!fees.includes(r.bbqFee)) fees.push(r.bbqFee);
        const t = r.bbq.split(' · ')[1] || r.bbq;
        if (!types.includes(t)) types.push(t);
      });
      return {
        ...b,
        rooms: list.length,
        st: b.st === 'none' ? 'none' : list.length === 0 ? 'off' : 'used',
        fields: b.fields.map((f) => {
          if (f[0] === '이용 객실') return [f[0], roomsLabel(list, rooms)] as [string, string];
          if (f[0] === '이용 요금') return [f[0], fees.length ? fees.join(' / ') : '—'] as [string, string];
          if (f[0] === '바베큐 형태') return [f[0], types.length ? types.join(', ') : '—'] as [string, string];
          return f;
        }),
      };
    }

    if (b.key === 'spa') {
      /** Group rooms by the spa size they carry, and name each group by its floors —
       *  "7층 4인용 / 3~6층 2인용" is the same sentence an operator used to type by hand. */
      const groups = new Map<string, Room[]>();
      rooms.forEach((r) => {
        const cap = r.spa.match(/(\d+인용)/)?.[1];
        if (!cap) return;
        groups.set(cap, [...(groups.get(cap) ?? []), r]);
      });
      const covered = [...groups.values()].reduce((n, list) => n + list.length, 0);
      const txt = [...groups]
        .sort((a, b2) => parseInt(b2[0], 10) - parseInt(a[0], 10))
        .map(([cap, list]) => `${floorSpan(list)} ${cap}`)
        .join(' / ');
      return {
        ...b,
        rooms: covered,
        fields: b.fields.map((f) => (f[0] === '수용인원' ? ([f[0], txt] as [string, string]) : f)),
      };
    }

    return b;
  });

/** Is a block field computed from rooms rather than entered? Those rows get no edit button. */
export const isCalcField = (blockKey: string, fieldKey: string): boolean =>
  (blockKey.includes('bbq') && (fieldKey === '이용 객실' || fieldKey === '이용 요금' || fieldKey === '바베큐 형태')) ||
  (blockKey === 'spa' && fieldKey === '수용인원');

/** Apply a pending room edit without committing it — the "after" side of the preview.
 *  Fees come from the option table, exactly as the commit path reads them, so the
 *  preview cannot promise a number the save then writes differently. */
export const simulate = (
  rooms: Room[],
  codes: string[],
  field: BulkFieldId,
  value: string,
  optFees: Record<OptionCode, string>,
): Room[] =>
  rooms.map((r) => {
    if (!codes.includes(r.code)) return r;
    if (field === 'bbq') {
      const opt = optByLabel(value);
      return { ...r, bbq: value, bbqOpt: opt.code, bbqFee: optFees[opt.code] ?? '—' };
    }
    if (field === 'spa') return { ...r, spa: value };
    return r;
  });

/** Diff the derived fields between current and proposed state. Everything here is
 *  locked in the preview: it is a result, not a choice the operator can untick. */
export const derivedDiff = (
  curRooms: Room[],
  curBlocks: Block[],
  nextRooms: Room[],
  nextBlocks?: Block[],
): CascadeItem[] => {
  const now = deriveBlocks(curRooms, curBlocks);
  const nx = deriveBlocks(nextRooms, nextBlocks ?? curBlocks);
  const out: CascadeItem[] = [];
  now.forEach((nb, idx) => {
    const n2 = nx[idx];
    if (!n2) return;
    nb.fields.forEach((f, fi) => {
      if (n2.fields[fi] && f[1] !== n2.fields[fi][1]) {
        out.push({
          key: `drv:${nb.key}:${f[0]}`,
          label: `${nb.label} · ${f[0]}`,
          before: f[1],
          after: n2.fields[fi][1],
          on: true,
          locked: true,
          isOv: false,
        });
      }
    });
    if (nb.rooms !== n2.rooms) {
      out.push({
        key: `drv:${nb.key}:rooms`,
        label: `${nb.label} · 적용 객실 수`,
        before: `${nb.rooms}객실`,
        after: `${n2.rooms}객실`,
        on: true,
        locked: true,
        isOv: false,
      });
    }
    if (nb.st !== n2.st) {
      out.push({
        key: `drv:${nb.key}:st`,
        label: `${nb.label} · 사용 여부`,
        before: stName(nb.st),
        after: stName(n2.st),
        on: true,
        locked: true,
        isOv: false,
      });
    }
  });
  return out;
};

/** Wrap derived rows in their group — and omit the group entirely when nothing changed. */
export const derivedGroup = (derived: CascadeItem[]): CascadeGroup[] =>
  derived.length
    ? [
        {
          title: `숙소 블록 · 자동 재생성 ${derived.length}`,
          desc: '객실 값에서 다시 계산됩니다 — 선택 불가',
          items: derived,
        },
      ]
    : [];

/* ── advisory rules ─────────────────────────────────────────────────────── */

export const slotText = (s: RuleSlot): string =>
  s.type === 'money'
    ? `${fmtNum(s.v)}원`
    : s.type.startsWith('int:')
      ? `${s.v}${s.type.split(':')[1]}`
      : String(s.v);

/** The sentence is generated from its slots, so the numbers in it cannot go stale. */
export const ruleText = (r: Rule): string =>
  r.tpl.replace(/\{(\w+)\}/g, (m, k: string) => {
    const s = r.slots.find((x) => x.k === k);
    return s ? slotText(s) : m;
  });

/* ── room field access ──────────────────────────────────────────────────── */

export const curVal = (r: Room, f: BulkFieldId): string =>
  f === 'maxP' ? String(r.maxP) : f === 'extra' ? String(r.extra) : f === 'bbq' ? r.bbq : f === 'spa' ? r.spa : r.facil;

export const dispVal = (f: BulkFieldId, v: string): string =>
  f === 'extra' ? `${fmtNum(v)}원` : f === 'maxP' ? `최대 ${v}명` : v;

export const isOverridden = (r: Room, f: BulkFieldId): boolean =>
  f === 'bbq' ? r.bbqOv : f === 'spa' ? r.spaOv : f === 'maxP' ? r.paxOv : f === 'extra' ? r.extraOv : false;
