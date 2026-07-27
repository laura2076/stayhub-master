import { attrDef, attrOption, feeOf, isOwn, showValue, valueOf } from './attrs';
import { CHANKEYS, instantiateRule, ruleById } from './catalog';
import {
  deriveBlocks,
  derivedDiff,
  derivedGroup,
  membersOf,
  ruleText,
  showRoomValue,
  simulate,
  stName,
} from './derive';
import type {
  AttrValue,
  Block,
  BlockStatus,
  Cascade,
  CascadeGroup,
  CascadeItem,
  ChannelKey,
  ChannelRowId,
  NewRoomDraft,
  Property,
  Room,
} from './types';

const channelItems = (label: (chName: string) => string, before: string, after: string, n = 3): CascadeItem[] =>
  CHANKEYS.slice(0, n).map(([ck, chName]) => ({
    key: `ch:${ck}`,
    label: label(chName),
    before,
    after,
    on: true,
    isOv: false,
  }));

/** 이 속성을 쓰는 시설들 — 값이 바뀌면 안내문이 다시 계산될 곳입니다. */
const faqItemsFor = (p: Property, blockKeys: string[], before: string, after: string, max = 6): CascadeItem[] =>
  p.faqs
    .filter((f) => blockKeys.some((k) => f.tpl.includes(`{${k}.`)))
    .slice(0, max)
    .map((f) => ({ key: `faq:${f.qid}`, label: `질문 ${f.qid}`, before, after, on: true, locked: true, isOv: false }));

/* ── 객실 값 바꾸기 ─────────────────────────────────────────────────────── */

export const previewBulk = (p: Property, sel: string[], attr: string, value: AttrValue): Cascade => {
  const def = attrDef(attr)!;
  const items: CascadeItem[] = p.rooms
    .filter((r) => sel.includes(r.code))
    .map((r) => ({
      key: `room:${r.code}`,
      label: `${r.name} · ${r.code}`,
      before: showRoomValue(p, r, attr),
      after: showValue(attr, value),
      on: valueOf(p, r, attr) !== value,
      isOv: isOwn(r, attr),
    }));

  const next: Property = { ...p, rooms: simulate(p.rooms, sel, attr, value) };
  const derived = derivedDiff(p, next);
  const touched = p.blocks.filter((b) => b.memberOf?.attr === attr).map((b) => b.key);
  const faq = faqItemsFor(p, touched, '지금 답변', '새 값으로 다시 만들어짐');

  return {
    kind: 'bulk',
    attr,
    value,
    field: def.label,
    from: '객실마다 지금 값',
    to: showValue(attr, value),
    warn: items.some((i) => i.isOv)
      ? '고른 객실 중 몇 개는 따로 정해둔 값이 있어요. 체크를 풀면 그 객실은 지금 값 그대로 둡니다.'
      : derived.length
        ? `시설 안내문 ${derived.length}곳은 객실 값에서 자동으로 다시 만들어집니다 — 따로 고칠 필요가 없어요.`
        : '',
    groups: [
      { title: `객실 ${items.length}`, desc: '고른 객실에 적용', items },
      ...derivedGroup(derived),
      {
        title: '판매 사이트 3',
        desc: '사이트마다 쓰는 말로 바꿔서 나감',
        items: channelItems((ch) => `${ch} · ${def.label}`, '이전 값', showValue(attr, value)),
      },
      ...(faq.length ? [{ title: `질문·답변 ${faq.length}`, desc: '이 시설을 옮겨 적는 답변', items: faq }] : []),
    ],
  };
};

export const buildRoom = (p: Property, nr: NewRoomDraft): Room => {
  const nextCode = String(Math.max(...p.rooms.map((r) => Number(r.code))) + 1);
  return {
    code: nextCode,
    name: nr.name || '새 객실',
    floor: Number(nr.floor),
    area: '—',
    form: '원룸형',
    bed: '킹침대 1',
    tag: '신규 등록',
    values: { ...nr.values },
  };
};

export const previewNewRoom = (p: Property, room: Room): Cascade => {
  const next: Property = { ...p, rooms: [...p.rooms, room] };
  const derived = derivedDiff(p, next);
  const summary = p.attrs
    .map((k) => showValue(k, valueOf(next, room, k)))
    .filter((s) => s !== '—')
    .slice(0, 3)
    .join(' · ');

  return {
    kind: 'roomadd',
    room,
    field: `객실 만들기 · ${room.name}`,
    from: '없음',
    to: `${room.name} (${room.floor}층)`,
    warn: '객실이 하나 늘면 이 객실을 쓰는 시설 안내문과 객실 수가 모두 다시 계산됩니다.',
    groups: [
      {
        title: '객실 1',
        desc: '새로 만드는 객실',
        items: [{ key: `room:${room.code}`, label: `${room.name} · ${room.code}`, before: '—', after: summary, on: true, isOv: false }],
      },
      ...derivedGroup(derived),
      {
        title: '판매 사이트 3',
        desc: '사이트에 새 상품이 생김',
        items: channelItems((ch) => `${ch} · ${room.name} 상품`, '없음', '생성 · 전송 대기'),
      },
    ],
  };
};

export const previewDelete = (p: Property, sel: string[]): Cascade => {
  const gone = p.rooms.filter((r) => sel.includes(r.code));
  const next: Property = { ...p, rooms: p.rooms.filter((r) => !sel.includes(r.code)) };
  const derived = derivedDiff(p, next);

  return {
    kind: 'roomdel',
    codes: sel,
    field: `객실 지우기 · ${gone.length}개`,
    from: gone.map((r) => r.name).join(','),
    to: '삭제',
    warn: '지운 객실을 쓰던 안내문과 객실 수가 자동으로 줄어듭니다. 마지막 객실이 빠진 시설은 저절로 안 쓰는 상태가 됩니다.',
    groups: [
      {
        title: `객실 ${gone.length}`,
        desc: '지울 객실',
        items: gone.map((r) => ({
          key: `room:${r.code}`,
          label: `${r.name} · ${r.code}`,
          before: `${r.floor}층 · ${r.area}`,
          after: '삭제',
          on: true,
          isOv: false,
        })),
      },
      ...derivedGroup(derived),
      {
        title: '판매 사이트 3',
        desc: '사이트에서 내림',
        items: channelItems((ch) => `${ch} · 상품 ${gone.length}건`, '판매중', '판매중지'),
      },
    ],
  };
};

/* ── 시설 켜고 끄기 ─────────────────────────────────────────────────────── */

const useFieldItem = (bk: Block, nextSt: BlockStatus): CascadeItem[] => {
  const f = bk.fields.find((x) => x[0] === '사용 여부');
  if (!f || nextSt === 'none') return [];
  const after = nextSt === 'used' ? '사용' : '사용안함';
  return f[1] === after
    ? []
    : [{ key: `fld:${bk.key}:사용 여부`, label: `${bk.label} · 사용 여부`, before: f[1], after, on: true, locked: true, isOv: false }];
};

/** 이 시설을 끄면 값이 비워질 객실들. 시설이 선언한 속성에서 찾습니다. */
const membersToClear = (p: Property, bk: Block): Room[] => (bk.memberOf ? membersOf(p, bk) : []);

export const previewBlockState = (p: Property, bk: Block, nextSt: 'off' | 'none'): Cascade => {
  const hit = membersToClear(p, bk);
  const attr = bk.memberOf?.attr;
  const nextRooms = attr
    ? p.rooms.map((r) => (hit.some((h) => h.code === r.code) ? { ...r, values: { ...r.values, [attr]: 'none' } } : r))
    : p.rooms;
  const next: Property = {
    ...p,
    rooms: nextRooms,
    blocks: p.blocks.map((b) => (b.key === bk.key ? { ...b, st: nextSt } : b)),
  };
  const derived = derivedDiff(p, next).filter((d) => !d.key.includes(`drv:${bk.key}:st`));
  const faq = faqItemsFor(p, [bk.key], '보임', '자동으로 빠짐');

  return {
    kind: 'blockstate',
    blockKey: bk.key,
    nextSt,
    killRooms: hit.map((r) => r.code),
    applyAttr: attr,
    field: `${bk.label}${nextSt === 'none' ? ' · 이 숙소에서 없애기' : ' · 잠시 안 쓰기'}`,
    from: stName(bk.st),
    to: stName(nextSt),
    warn:
      nextSt === 'none'
        ? '이 숙소에서 시설을 아예 없앱니다. 그 시설을 쓰던 객실 값도 비워지고, 딸린 질문·답변도 빠집니다.'
        : '판매 사이트에만 안 나가게 합니다. 값은 그대로 남아 있어 언제든 다시 켤 수 있어요.',
    groups: [
      {
        title: '시설 1',
        desc: nextSt === 'none' ? '이 숙소에서 없앰' : '쓸지 말지 바꿈',
        items: [
          { key: `blk:${bk.key}`, label: bk.label, before: stName(bk.st), after: stName(nextSt), on: true, isOv: false },
          ...useFieldItem(bk, nextSt),
        ],
      },
      ...(hit.length
        ? [
            {
              title: `객실 ${hit.length}`,
              desc: '이 시설을 쓰던 객실',
              items: hit.map((r) => ({
                key: `room:${r.code}`,
                label: `${r.name} · ${r.code}`,
                before: showRoomValue(p, r, attr!),
                after: '없음',
                on: true,
                locked: true,
                isOv: false,
              })),
            },
          ]
        : []),
      ...derivedGroup(derived),
      {
        title: `판매 사이트 ${bk.chanN}`,
        desc: '사이트에 나가는 시설 목록',
        items: channelItems((ch) => `${ch} · ${bk.label}`, '나감', '안 나감', bk.chanN),
      },
      ...(faq.length ? [{ title: `질문·답변 ${faq.length}`, desc: '딸린 질문이 자동으로 빠짐', items: faq }] : []),
    ],
  };
};

/** 다시 켤 때는 어느 객실에 붙일지 그 자리에서 고릅니다. */
export const previewBlockUse = (p: Property, bk: Block): Cascade => {
  const attr = bk.memberOf?.attr;
  const code = bk.memberOf?.codes[0];
  const def = attr ? attrDef(attr) : undefined;

  /** 원래 그 시설을 쓰던(지금은 없음인) 객실을 미리 체크해 둡니다. */
  const candidates = attr ? p.rooms.filter((r) => String(valueOf(p, r, attr)) === 'none') : [];
  const suggest = candidates.length ? candidates : p.rooms;

  const pick: CascadeItem[] =
    attr && code
      ? p.rooms.map((r) => ({
          key: `apply:${r.code}`,
          label: `${r.name} · ${r.code} (${r.floor}층)`,
          before: showRoomValue(p, r, attr),
          after: attrOption(attr, code)?.label ?? String(code),
          on: suggest.some((s) => s.code === r.code),
          isOv: isOwn(r, attr),
        }))
      : [];

  const faq = faqItemsFor(p, [bk.key], '빠져 있음', '다시 보임');

  return {
    kind: 'blockstate',
    blockKey: bk.key,
    nextSt: 'used',
    applyAttr: attr,
    applyCode: code,
    field: `${bk.label} · 쓰기 시작`,
    from: '있지만 안 씀',
    to: '쓰는 중',
    warn: pick.length
      ? `어느 객실에 붙일지 여기서 바로 고르세요. 체크한 객실에만 ${def?.label ?? ''} 값이 들어가고, 안내문과 객실 수는 그 결과대로 자동으로 만들어집니다.`
      : faq.length
        ? `딸린 질문·답변 ${faq.length}개가 같이 살아납니다. 답이 빈 것은 사이트에 보내기 전에 채워야 해요.`
        : '',
    groups: [
      {
        title: '시설 1',
        desc: '쓸지 말지 바꿈',
        items: [
          { key: `blk:${bk.key}`, label: bk.label, before: '있지만 안 씀', after: '쓰는 중', on: true, locked: true, isOv: false },
          ...useFieldItem(bk, 'used'),
        ],
      },
      ...(pick.length ? [{ title: `어느 객실에 붙일까요 ${pick.length}`, desc: '체크한 객실에만 붙습니다', items: pick }] : []),
      {
        title: `판매 사이트 ${bk.chanN}`,
        desc: '사이트 시설 목록에 나감',
        items: channelItems((ch) => `${ch} · ${bk.label}`, '안 나감', '나감', bk.chanN),
      },
      ...(faq.length ? [{ title: `질문·답변 ${faq.length}`, desc: '빠져 있던 질문이 다시 살아남', items: faq }] : []),
    ],
  };
};

export const previewAddBlockItem = (p: Property, bk: Block): Cascade => {
  const faq = faqItemsFor(p, [bk.key], '이 숙소에 없음', '답변 입력 필요');
  return {
    kind: 'blockstate',
    blockKey: bk.key,
    nextSt: 'off',
    field: `${bk.label} · 이 숙소에 추가`,
    from: '이 숙소에 없음',
    to: '있지만 안 씀',
    warn: '항목만 생깁니다. 값을 채운 뒤 "쓰기 시작"을 눌러야 판매 사이트에 나갑니다.',
    groups: [
      {
        title: '시설 1',
        desc: '전체 목록에서 이 숙소로 가져옴',
        items: [{ key: `blk:${bk.key}`, label: bk.label, before: '없음', after: '있지만 안 씀', on: true, isOv: false }],
      },
      {
        title: '채워야 할 항목',
        desc: '이 시설에 꼭 필요한 항목',
        items: (['이용 객실', '이용 요금', '이용 시간'] as const).map((k) => ({
          key: `fld:${k}`,
          label: `${bk.label} · ${k}`,
          before: '—',
          after: '미입력',
          on: true,
          isOv: false,
        })),
      },
      ...(faq.length ? [{ title: `질문·답변 ${faq.length}`, desc: '이 시설을 묻는 질문', items: faq }] : []),
    ],
  };
};

/* ── 시설 값 · 선택지 요금 ──────────────────────────────────────────────── */

export const previewBlockEdit = (p: Property, bk: Block, fieldKey: string, value: string): Cascade => {
  const scope = bk.memberOf ? membersOf(p, bk) : p.rooms;
  const items: CascadeItem[] = scope.map((r) => ({
    key: `room:${r.code}`,
    label: `${r.name} · ${r.code}`,
    before: '숙소 값 그대로',
    after: value,
    on: true,
    locked: true,
    isOv: false,
  }));
  const faq = faqItemsFor(p, [bk.key], '지금 답변', '새 값으로 다시 만들어짐', 4);

  return {
    kind: 'block',
    blockKey: bk.key,
    fieldKey,
    value,
    field: `${bk.label} · ${fieldKey}`,
    from: '지금 값',
    to: value,
    warn: '',
    groups: [
      { title: `이 값을 쓰는 객실 ${items.length}`, desc: '이 시설을 쓰는 객실', items },
      { title: '판매 사이트 3', desc: '사이트 설명 문구', items: channelItems((ch) => `${ch} · ${bk.label}`, '이전 값', value) },
      ...(faq.length ? [{ title: `질문·답변 ${faq.length}`, desc: '이 시설을 옮겨 적는 답변', items: faq }] : []),
    ],
  };
};

/** 요금은 객실이 아니라 선택지에 붙습니다 — 한 번 고치면 그 선택지를 쓰는 객실 전부에 갑니다. */
export const previewOptFee = (p: Property, attr: string, code: string, value: string): Cascade => {
  const def = attrDef(attr)!;
  const label = attrOption(attr, code)?.label ?? code;
  const hit = p.rooms.filter((r) => String(valueOf(p, r, attr)) === code);
  const next: Property = { ...p, fees: { ...p.fees, [`${attr}:${code}`]: value } };

  return {
    kind: 'optfee',
    attr,
    code,
    value,
    field: `${label} · 요금`,
    from: feeOf(p, attr, code),
    to: value,
    warn: `요금은 ${def.label} 선택지에 붙어 있어요. 이 선택지를 쓰는 객실 ${hit.length}개와 안내문, 사이트 요금이 한 번에 바뀝니다.`,
    groups: [
      {
        title: '선택지 1',
        desc: '이 숙소에서 받는 요금',
        items: [{ key: `opt:${attr}:${code}`, label, before: feeOf(p, attr, code), after: value, on: true, locked: true, isOv: false }],
      },
      ...(hit.length
        ? [
            {
              title: `객실 ${hit.length}`,
              desc: '이 선택지를 쓰는 객실',
              items: hit.map((r) => ({
                key: `room:${r.code}`,
                label: `${r.name} · ${r.code}`,
                before: feeOf(p, attr, code),
                after: value,
                on: true,
                locked: true,
                isOv: false,
              })),
            },
          ]
        : []),
      ...derivedGroup(derivedDiff(p, next)),
      { title: '판매 사이트 3', desc: '사이트에 적히는 요금', items: channelItems((ch) => `${ch} · ${label} 요금`, feeOf(p, attr, code), value) },
    ],
  };
};

/* ── 안내 문구 ──────────────────────────────────────────────────────────── */

export const previewRule = (bk: Block, ri: number, si: number, value: string | number): Cascade => {
  const r = bk.rules![ri];
  const nextSlots = r.slots.map((x, i) => (i === si ? { ...x, v: value } : x));
  const after = ruleText({ ...r, slots: nextSlots });
  return {
    kind: 'rule',
    blockKey: bk.key,
    ri,
    si,
    value,
    field: `${bk.label} · 안내 문구`,
    from: ruleText(r),
    to: after,
    warn: '안내 문장은 값(시각·금액·숫자)에서 자동으로 만들어집니다. 문장을 직접 쓰는 곳이 없어서 숫자와 문장이 어긋날 수 없어요.',
    groups: [
      {
        title: '시설 1',
        desc: '값이 바뀌어 문장을 다시 만듦',
        items: [{ key: `rule:${bk.key}:${ri}`, label: `${bk.label} 문구 ${ri + 1}`, before: ruleText(r), after, on: true, locked: true, isOv: false }],
      },
      { title: '판매 사이트 3', desc: '사이트 안내 문구 다시 만듦', items: channelItems((ch) => `${ch} · ${bk.label} 안내`, '이전 문장', after) },
    ],
  };
};

export const previewRuleAdd = (bk: Block, ruleId: string): Cascade => {
  const cat = instantiateRule(ruleId);
  return {
    kind: 'ruleadd',
    blockKey: bk.key,
    ruleId,
    field: `${bk.label} · 안내 문구 넣기`,
    from: '없음',
    to: ruleText(cat),
    warn: '미리 만들어 둔 문구 중에서 고릅니다 — 직접 쓰는 곳은 없어요.',
    groups: [
      {
        title: '시설 1',
        desc: '안내 문구 넣기',
        items: [{ key: `ruleadd:${ruleId}`, label: bk.label, before: '—', after: ruleText(cat), on: true, locked: true, isOv: false }],
      },
      { title: '판매 사이트 3', desc: '사이트 안내 문구에 들어감', items: channelItems((ch) => `${ch} · ${bk.label} 안내`, '이전 문장', '문구 1개 추가') },
    ],
  };
};

export const previewRuleDel = (bk: Block, ri: number): Cascade => ({
  kind: 'ruledel',
  blockKey: bk.key,
  ri,
  field: `${bk.label} · 안내 문구 빼기`,
  from: ruleText(bk.rules![ri]),
  to: '삭제',
  warn: '',
  groups: [
    {
      title: '시설 1',
      desc: '안내 문구 빼기',
      items: [{ key: `ruledel:${ri}`, label: bk.label, before: ruleText(bk.rules![ri]), after: '삭제', on: true, locked: true, isOv: false }],
    },
  ],
});

export const previewChannelSync = (
  p: Property,
  rowId: ChannelRowId,
  ck: ChannelKey,
  label: string,
  chName: string,
  to: string,
): Cascade => ({
  kind: 'chan',
  rowId,
  ck,
  value: to,
  field: `${label} · ${chName}`,
  from: p.channels[rowId][ck],
  to,
  warn: '이 사이트만 다른 값을 갖고 있어요. 맞추면 사이트에서 따로 고쳤던 내용은 사라집니다.',
  groups: [
    {
      title: '사이트 값 1',
      desc: '기준값으로 맞춤',
      items: [{ key: `ch:${ck}`, label: `${chName} · ${label}`, before: p.channels[rowId][ck], after: to, on: true, isOv: false }],
    },
    {
      title: '사이트에 다시 보내기',
      desc: '맞춘 뒤 자동으로 다시 보냄',
      items: [{ key: `q:${ck}`, label: `${chName} 상품 다시 보내기`, before: '대기', after: '즉시 전송', on: true, isOv: false }],
    },
  ],
});

/* ── 적용 ───────────────────────────────────────────────────────────────── */

const checkedItems = (groups: CascadeGroup[]): CascadeItem[] =>
  groups.reduce<CascadeItem[]>((a, g) => a.concat(g.items.filter((i) => i.on)), []);

/** 미리보기에서 체크된 것만 실제로 씁니다. 어느 경로든 값 → 선택지 → 요금 순서를
 *  그대로 지나므로, 분기마다 요금을 따로 계산하는 일이 없습니다. */
export const applyCascade = (p: Property, c: Cascade): { next: Property; checkedN: number } => {
  const checked = checkedItems(c.groups);
  const roomKeys = checked.filter((i) => i.key.startsWith('room:')).map((i) => i.key.slice(5));
  let rooms = p.rooms;
  let blocks = p.blocks;
  let fees = p.fees;
  let channels = p.channels;

  if (c.kind === 'bulk') {
    rooms = rooms.map((r) => {
      if (!roomKeys.includes(r.code)) return r;
      const values = { ...r.values };
      /** 숙소 기본값과 같아지면 "따로 정함"을 지웁니다 — 표시와 실제가 어긋나지 않게. */
      if (p.defaults[c.attr] === c.value) delete values[c.attr];
      else values[c.attr] = c.value;
      return { ...r, values };
    });
  }

  if (c.kind === 'block') {
    blocks = blocks.map((b) =>
      b.key !== c.blockKey ? b : { ...b, fields: b.fields.map((f) => (f[0] === c.fieldKey ? [f[0], c.value] : f)) },
    );
  }

  if (c.kind === 'roomadd') rooms = [...rooms, c.room];
  if (c.kind === 'roomdel') rooms = rooms.filter((r) => !c.codes.includes(r.code));

  if (c.kind === 'blockstate') {
    if (c.applyAttr && c.applyCode) {
      const applyCodes = checked.filter((i) => i.key.startsWith('apply:')).map((i) => i.key.slice(6));
      rooms = rooms.map((r) =>
        !applyCodes.includes(r.code) ? r : { ...r, values: { ...r.values, [c.applyAttr!]: c.applyCode! } },
      );
    }
    if (c.nextSt !== 'used' && c.killRooms?.length && c.applyAttr) {
      rooms = rooms.map((r) =>
        !c.killRooms!.includes(r.code) ? r : { ...r, values: { ...r.values, [c.applyAttr!]: 'none' } },
      );
    }
    blocks = blocks.map((b) => {
      if (b.key !== c.blockKey) return b;
      const nb: Block = { ...b, st: c.nextSt };
      nb.fields = nb.fields.map((f) =>
        f[0] === '사용 여부' ? [f[0], c.nextSt === 'used' ? '사용' : '사용안함'] : f,
      );
      if (c.nextSt === 'off' && !nb.fields.length) {
        nb.fields = [
          ['이용 객실', '미입력'],
          ['이용 요금', '미입력'],
          ['이용 시간', '미입력'],
        ];
      }
      if (c.nextSt === 'none') {
        nb.fields = [];
        nb.rules = [];
      }
      return nb;
    });
  }

  if (c.kind === 'rule' || c.kind === 'ruleadd' || c.kind === 'ruledel') {
    blocks = blocks.map((b) => {
      if (b.key !== c.blockKey) return b;
      let rules = [...(b.rules ?? [])];
      if (c.kind === 'rule') {
        rules = rules.map((r, i) =>
          i !== c.ri ? r : { ...r, slots: r.slots.map((s, j) => (j !== c.si ? s : { ...s, v: c.value })) },
        );
      }
      if (c.kind === 'ruleadd' && ruleById(c.ruleId)) rules = [...rules, instantiateRule(c.ruleId)];
      if (c.kind === 'ruledel') rules = rules.filter((_, i) => i !== c.ri);
      return { ...b, rules };
    });
  }

  if (c.kind === 'optfee') fees = { ...fees, [`${c.attr}:${c.code}`]: c.value };

  if (c.kind === 'chan') {
    channels = { ...channels, [c.rowId]: { ...channels[c.rowId], [c.ck]: c.value } };
  }

  const written: Property = { ...p, rooms, blocks, fees, channels };
  /** 마지막에 자동 계산 필드를 한 번 더 돌립니다 — 저장된 값과 계산 결과가 늘 같도록.
   *  단, 시설을 켜고 끈 직후에는 사용자가 고른 상태가 자동 계산보다 우선합니다. */
  const recomputed = deriveBlocks(written).map((b) =>
    c.kind === 'blockstate' && b.key === c.blockKey ? { ...b, st: c.nextSt } : b,
  );

  return { next: { ...written, blocks: recomputed, savedAt: '2026-07-26 09:41' }, checkedN: checked.length };
};


