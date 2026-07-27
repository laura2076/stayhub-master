import { ATTRS, attrDef, attrOption, attrsOf, feeOf, roomFee, showValue, valueOf } from './attrs';
import { CHANKEYS } from './catalog';
import { fmtNum } from './fieldTypes';
import type {
  Block,
  CascadeGroup,
  CascadeItem,
  ChannelKey,
  ChannelRowId,
  Property,
  Room,
  Rule,
  RuleSlot,
} from './types';

export const stName = (s: Block['st']): string =>
  s === 'used' ? '쓰는 중' : s === 'off' ? '있지만 안 씀' : '없음';

/** "3층" · "4~7층" · "3층,7층" — 이어진 층은 범위로 묶습니다. */
export const floorSpan = (list: Room[]): string => {
  const floors = [...new Set(list.map((r) => r.floor))].sort((a, b) => a - b);
  if (!floors.length) return '';
  const contiguous = floors.length > 1 && floors[floors.length - 1] - floors[0] === floors.length - 1;
  return contiguous ? `${floors[0]}~${floors[floors.length - 1]}층` : floors.map((f) => `${f}층`).join(',');
};

/** "4~7층 객실 · 22객실 (A401 제외)" — 아무도 타이핑하지 않는 문장. 객실 목록에서 계산됩니다. */
export const roomsLabel = (list: Room[], all: Room[]): string => {
  if (!list.length) return '이용 객실 없음';
  const floors = new Set(list.map((r) => r.floor));
  const codes = new Set(list.map((r) => r.code));
  const excluded = all.filter((r) => floors.has(r.floor) && !codes.has(r.code)).map((r) => r.name);
  return `${floorSpan(list)} 객실 · ${list.length}객실${excluded.length ? ` (${excluded.join(',')} 제외)` : ''}`;
};

/** 이 시설을 쓰는 객실. 시설이 선언한 규칙(어느 속성이 어떤 값일 때)으로 가려냅니다. */
export const membersOf = (p: Property, b: Block, rooms: Room[] = p.rooms): Room[] => {
  if (!b.memberOf) return [];
  const { attr, codes } = b.memberOf;
  return rooms.filter((r) => codes.includes(String(valueOf(p, r, attr))));
};

/** 자동 계산 필드를 지금 객실 목록으로 다시 만들어 냅니다.
 *  이 필드들은 저장된 문장이 아니라 규칙입니다 — 손으로 맞출 것이 없습니다. */
export const deriveBlocks = (p: Property, rooms: Room[] = p.rooms, blocks: Block[] = p.blocks): Block[] =>
  blocks.map((b) => {
    if (!b.computed || !b.memberOf) return b;
    const list = membersOf(p, b, rooms);
    const attr = b.memberOf.attr;

    const fields = b.fields.map(([k, v]): [string, string] => {
      const how = b.computed![k];
      if (!how) return [k, v];
      if (how === 'rooms') return [k, roomsLabel(list, rooms)];
      if (how === 'fee') {
        const fees = [...new Set(list.map((r) => roomFee(p, r, attr)))].filter((f) => f !== '—');
        return [k, fees.length ? fees.join(' / ') : '—'];
      }
      if (how === 'optionLabel') {
        const labels = [
          ...new Set(list.map((r) => attrOption(attr, valueOf(p, r, attr))?.label ?? '')),
        ].filter(Boolean);
        /** "공용BBQ · 가스그릴"에서 뒷부분만 — 시설 카드 안에서는 종류만 궁금합니다. */
        const kinds = [...new Set(labels.map((l) => l.split(' · ')[1] ?? l))];
        return [k, kinds.length ? kinds.join(', ') : '—'];
      }
      /* capacity — 같은 값을 쓰는 객실끼리 묶어 층으로 부릅니다. */
      const groups = new Map<string, Room[]>();
      list.forEach((r) => {
        const label = attrOption(attr, valueOf(p, r, attr))?.label ?? '';
        const size = label.match(/(\d+인용)/)?.[1] ?? label;
        groups.set(size, [...(groups.get(size) ?? []), r]);
      });
      const txt = [...groups]
        .sort((a, b2) => (parseInt(b2[0], 10) || 0) - (parseInt(a[0], 10) || 0))
        .map(([size, l]) => `${floorSpan(l)} ${size}`)
        .join(' / ');
      return [k, txt || '—'];
    });

    /** 마지막 객실이 빠지면 시설도 저절로 안 쓰는 상태가 됩니다. */
    const st = b.st === 'none' ? 'none' : list.length === 0 ? 'off' : 'used';
    return { ...b, fields, st };
  });

/** 이 시설을 쓰는 객실 수 — 카드의 "객실 N"에 쓰입니다. */
export const roomCount = (p: Property, b: Block, rooms: Room[] = p.rooms): number =>
  b.memberOf ? membersOf(p, b, rooms).length : b.st === 'none' ? 0 : rooms.length;

/** 사람이 고칠 수 없는 필드인지. */
export const isCalcField = (b: Block, fieldKey: string): boolean => !!b.computed?.[fieldKey];

/** 아직 적용하지 않은 변경을 미리 반영해 본 객실 목록 — 미리보기의 "바뀐 뒤" 쪽. */
export const simulate = (rooms: Room[], codes: string[], attr: string, value: Room['values'][string]): Room[] =>
  rooms.map((r) => (codes.includes(r.code) ? { ...r, values: { ...r.values, [attr]: value } } : r));

/** 바뀌기 전과 후의 자동 계산 필드를 비교합니다. 여기 나오는 줄은 전부 잠겨 있습니다 —
 *  고를 수 있는 선택이 아니라 결과이기 때문입니다. */
export const derivedDiff = (before: Property, after: Property): CascadeItem[] => {
  const now = deriveBlocks(before);
  const nx = deriveBlocks(after, after.rooms, after.blocks);
  const out: CascadeItem[] = [];

  now.forEach((nb) => {
    const n2 = nx.find((x) => x.key === nb.key);
    if (!n2) return;
    nb.fields.forEach(([k, v], fi) => {
      const after2 = n2.fields[fi];
      if (after2 && after2[0] === k && v !== after2[1]) {
        out.push({
          key: `drv:${nb.key}:${k}`,
          label: `${nb.label} · ${k}`,
          before: v,
          after: after2[1],
          on: true,
          locked: true,
          isOv: false,
        });
      }
    });
    const c1 = roomCount(before, nb);
    const c2 = roomCount(after, n2, after.rooms);
    if (c1 !== c2) {
      out.push({
        key: `drv:${nb.key}:rooms`,
        label: `${nb.label} · 쓰는 객실 수`,
        before: `${c1}객실`,
        after: `${c2}객실`,
        on: true,
        locked: true,
        isOv: false,
      });
    }
    if (nb.st !== n2.st) {
      out.push({
        key: `drv:${nb.key}:st`,
        label: `${nb.label} · 쓰는지 여부`,
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

export const derivedGroup = (derived: CascadeItem[]): CascadeGroup[] =>
  derived.length
    ? [{ title: `자동으로 같이 바뀌는 것 ${derived.length}`, desc: '객실 값에서 다시 계산돼요', items: derived }]
    : [];

/* ── 판매 사이트에 나가는 값 ────────────────────────────────────────────────
   우리 값 하나를 사이트마다 쓰는 말로 바꿔서 내보냅니다. 사전은 속성 사전 안에
   들어 있으므로, 숙소가 어떤 시설을 갖든 같은 방식으로 계산됩니다. */

export type ChannelRow = {
  id: ChannelRowId;
  label: string;
  master: string;
  cells: { ck: ChannelKey; chName: string; v: string; expected: string; bad: boolean }[];
};

const usedCodes = (p: Property, attr: string): string[] => {
  const seen = new Set<string>();
  p.rooms.forEach((r) => seen.add(String(valueOf(p, r, attr))));
  return [...seen].filter((c) => c !== 'none');
};

const channelWords = (p: Property, attr: string, ck: ChannelKey): string[] =>
  usedCodes(p, attr)
    .map((c) => attrOption(attr, c)?.ch[ck])
    .filter((x): x is string => !!x);

export const channelRows = (p: Property): ChannelRow[] => {
  const optionAttrs = attrsOf(p).filter((a) => a.kind === 'option');
  const facilityAttrs = optionAttrs.filter((a) => a.facility || a.key === 'bbq');
  const viewAttr = optionAttrs.find((a) => a.key === 'view');

  const maxes = [...new Set(p.rooms.map((r) => Number(valueOf(p, r, 'capacity_max'))))].sort((a, b) => b - a);
  const maxText = maxes.map((m) => `${m}명`).join(' / ');

  const checkin = p.blocks.find((b) => b.key === 'checkin_checkout');
  const checkinText = checkin
    ? `${checkin.fields.find((f) => f[0] === '체크인')?.[1] ?? '—'} / ${
        checkin.fields.find((f) => f[0] === '체크아웃')?.[1] ?? '—'
      }`
    : '—';

  const rows: [ChannelRowId, string, string, (ck: ChannelKey) => string][] = [
    [
      'theme',
      '테마',
      [
        viewAttr ? channelWords(p, 'view', 'a').join(', ') : '',
        ...facilityAttrs.map((a) => a.label),
      ]
        .filter(Boolean)
        .join(' · '),
      (ck) =>
        [
          ...(viewAttr ? channelWords(p, 'view', ck) : []),
          ...facilityAttrs.flatMap((a) => channelWords(p, a.key, ck)),
        ]
          .filter((v, i, arr) => arr.indexOf(v) === i)
          .join(', '),
    ],
    ['maxpax', '최대 인원', maxText, () => maxText],
    [
      'facility',
      '부대시설',
      facilityAttrs
        .map((a) => `${a.label} ${membersCount(p, a.key)}실`)
        .join(' / ') || '없음',
      (ck) =>
        facilityAttrs
          .flatMap((a) => channelWords(p, a.key, ck))
          .filter((v, i, arr) => arr.indexOf(v) === i)
          .join(', ') || '없음',
    ],
    ['checkin', '체크인/아웃', checkinText, () => checkinText],
  ];

  return rows.map(([id, label, master, expect]) => ({
    id,
    label,
    master,
    cells: CHANKEYS.map(([ck, chName]) => {
      const v = p.channels[id]?.[ck] ?? '';
      const expected = expect(ck);
      return { ck, chName, v, expected, bad: v !== expected };
    }),
  }));
};

const membersCount = (p: Property, attr: string): number =>
  p.rooms.filter((r) => String(valueOf(p, r, attr)) !== 'none').length;

/* ── 안내 문구 ──────────────────────────────────────────────────────────── */

export const slotText = (s: RuleSlot): string =>
  s.type === 'money'
    ? `${fmtNum(s.v)}원`
    : s.type.startsWith('int:')
      ? `${s.v}${s.type.split(':')[1]}`
      : String(s.v);

/** 문장은 조각에서 만들어집니다 — 안에 든 숫자가 낡을 수 없습니다. */
export const ruleText = (r: Rule): string =>
  r.tpl.replace(/\{(\w+)\}/g, (m, k: string) => {
    const s = r.slots.find((x) => x.k === k);
    return s ? slotText(s) : m;
  });

/* ── 객실 값 읽기 ───────────────────────────────────────────────────────── */

export const showRoomValue = (p: Property, r: Room, key: string): string =>
  showValue(key, valueOf(p, r, key));

/** 숙소 기본값과 다른지 = 이 객실만 따로 정했는지. 표시와 실제가 항상 같습니다. */
export const differsFromDefault = (p: Property, r: Room, key: string): boolean =>
  key in r.values && r.values[key] !== p.defaults[key];

export { attrDef, attrsOf, feeOf, roomFee, showValue, valueOf, ATTRS };
