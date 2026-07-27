import { attrDef, attrOption, feeOf, isOwn, showValue, valueOf } from './attrs';
import { BLOCKCAT, CHANKEYS, instantiateRule, ruleById } from './catalog';
import {
  deriveBlocks,
  derivedDiff,
  derivedGroup,
  membersOf,
  ruleText,
  showRoomValue,
  stName,
} from './derive';
import { typeName, typeOf } from './fieldTypes';
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
  RoomInfo,
} from './types';

/** 판매 사이트로 나가는 것은 **고르는 것이 아니라 결과**입니다. 잠긴 줄로 두어야
 *  "고를 게 하나도 없는 확인 창"이 접힌 상태로 열립니다 — 안 그러면 늘 펼쳐집니다. */
const channelItems = (label: (chName: string) => string, before: string, after: string, n = 3): CascadeItem[] =>
  CHANKEYS.slice(0, n).map(([ck, chName]) => ({
    key: `ch:${ck}`,
    label: label(chName),
    before,
    after,
    on: true,
    locked: true,
    isOv: false,
  }));

/** 이 속성을 쓰는 시설들 — 값이 바뀌면 안내문이 다시 계산될 곳입니다. */
const faqItemsFor = (p: Property, blockKeys: string[], before: string, after: string, max = 6): CascadeItem[] =>
  p.faqs
    .filter((f) => blockKeys.some((k) => f.tpl.includes(`{${k}.`)))
    .slice(0, max)
    .map((f) => ({ key: `faq:${f.qid}`, label: `질문 ${f.qid}`, before, after, on: true, locked: true, isOv: false }));

/* ── 객실 값 바꾸기 ─────────────────────────────────────────────────────── */

/** 고른 객실에 값을 넣습니다.
 *
 *  `per`에 든 객실은 그 값을, 나머지는 일괄값을 씁니다. 28실을 훑으며 "여긴 6명,
 *  저긴 8명"을 한 번에 정할 수 있어야 실제 일이 한 번에 끝납니다. */
export const previewBulk = (
  p: Property,
  sel: string[],
  attr: string,
  value: AttrValue,
  per: Record<string, AttrValue> = {},
): Cascade => {
  const def = attrDef(attr)!;
  const valueFor = (code: string): AttrValue => (code in per ? per[code] : value);

  const items: CascadeItem[] = p.rooms
    .filter((r) => sel.includes(r.code))
    .map((r) => ({
      key: `room:${r.code}`,
      label: `${r.name} · ${r.code}`,
      before: showRoomValue(p, r, attr),
      after: showValue(attr, valueFor(r.code)),
      on: valueOf(p, r, attr) !== valueFor(r.code),
      isOv: isOwn(r, attr),
    }));

  /** 값이 섞여 있으면 한 값으로 말할 수 없습니다 — 몇 가지인지로 말합니다. */
  const distinct = [...new Set(sel.map(valueFor))];
  const toText = distinct.length <= 1 ? showValue(attr, value) : `${distinct.length}가지 값 (객실마다 다름)`;

  const next: Property = {
    ...p,
    rooms: p.rooms.map((r) => (sel.includes(r.code) ? { ...r, values: { ...r.values, [attr]: valueFor(r.code) } } : r)),
  };
  const derived = derivedDiff(p, next);
  const touched = p.blocks.filter((b) => b.memberOf?.attr === attr).map((b) => b.key);
  const faq = faqItemsFor(p, touched, '지금 답변', '새 값으로 다시 만들어짐');

  return {
    kind: 'bulk',
    attr,
    value,
    per,
    field: def.label,
    from: '객실마다 지금 값',
    to: toText,
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
        items: channelItems((ch) => `${ch} · ${def.label}`, '이전 값', toText),
      },
      ...(faq.length ? [{ title: `질문·답변 ${faq.length}`, desc: '이 시설을 옮겨 적는 답변', items: faq }] : []),
    ],
  };
};

/** 숙소 전체값 바꾸기.
 *
 *  상속 모델의 나머지 절반입니다. 전체값을 바꾸면 **따로 정하지 않은 객실만** 따라오고,
 *  따로 정해둔 객실은 그대로 남습니다 — 그러라고 따로 정해둔 것이니까요. 미리보기에서
 *  두 무리를 갈라서 보여 주지 않으면 "왜 몇 개는 안 바뀌지"가 됩니다. */
export const previewDefault = (p: Property, attr: string, value: AttrValue): Cascade => {
  const def = attrDef(attr)!;
  const follows = p.rooms.filter((r) => !isOwn(r, attr));
  const stays = p.rooms.filter((r) => isOwn(r, attr));

  const next: Property = {
    ...p,
    defaults: { ...p.defaults, [attr]: value },
    /** 새 전체값과 같아진 객실은 따로 정한 표시를 뗍니다 — 표시와 실제가 어긋나지 않게. */
    rooms: p.rooms.map((r) => {
      if (r.values[attr] !== value) return r;
      const values = { ...r.values };
      delete values[attr];
      return { ...r, values };
    }),
  };
  const derived = derivedDiff(p, next);
  const touched = p.blocks.filter((b) => b.memberOf?.attr === attr).map((b) => b.key);
  const faq = faqItemsFor(p, touched, '지금 답변', '새 값으로 다시 만들어짐');

  return {
    kind: 'default',
    attr,
    value,
    field: `숙소 전체값 · ${def.label}`,
    from: showValue(attr, p.defaults[attr]),
    to: showValue(attr, value),
    warn: stays.length
      ? `따로 정해둔 객실 ${stays.length}개는 그대로 둡니다. 그 객실도 함께 바꾸려면 객실 표에서 골라 "한꺼번에 바꾸기"를 쓰세요.`
      : '이 숙소의 모든 객실이 전체값을 그대로 쓰고 있어 전부 따라옵니다.',
    groups: [
      /** 놀라운 쪽을 먼저 보여 줍니다 — "왜 몇 개는 안 바뀌지"가 스크롤 아래에 있으면 안 됩니다. */
      ...(stays.length
        ? [
            {
              title: `그대로 두는 객실 ${stays.length}`,
              desc: '이 객실만 따로 정해둔 값이 있음',
              items: stays.map((r) => ({
                key: `keep:${r.code}`,
                label: `${r.name} · ${r.code}`,
                before: showRoomValue(p, r, attr),
                after: showRoomValue(p, r, attr),
                on: true,
                locked: true,
                isOv: true,
              })),
            },
          ]
        : []),
      {
        title: `따라오는 객실 ${follows.length}`,
        desc: '전체값을 그대로 쓰던 객실',
        items: follows.map((r) => ({
          key: `room:${r.code}`,
          label: `${r.name} · ${r.code}`,
          before: showValue(attr, p.defaults[attr]),
          after: showValue(attr, value),
          on: true,
          locked: true,
          isOv: false,
        })),
      },
      ...derivedGroup(derived),
      {
        title: '판매 사이트 3',
        desc: '사이트마다 쓰는 말로 바꿔서 나감',
        items: channelItems((ch) => `${ch} · ${def.label}`, showValue(attr, p.defaults[attr]), showValue(attr, value)),
      },
      ...(faq.length ? [{ title: `질문·답변 ${faq.length}`, desc: '이 시설을 옮겨 적는 답변', items: faq }] : []),
    ],
  };
};

/** 객실 정보(이름·층·면적·구조·침구·태그) 고치기. 층이 바뀌면 시설 문구가 다시 계산됩니다. */
export const previewRoomInfo = (p: Property, code: string, patch: RoomInfo): Cascade => {
  const r = p.rooms.find((x) => x.code === code)!;
  const next: Property = { ...p, rooms: p.rooms.map((x) => (x.code === code ? { ...x, ...patch } : x)) };
  const derived = derivedDiff(p, next);

  const changed: [string, string, string][] = (
    [
      ['객실명', r.name, patch.name],
      ['층', `${r.floor}층`, `${patch.floor}층`],
      ['면적', r.area, patch.area],
      ['구조', r.form, patch.form],
      ['침구', r.bed, patch.bed],
      ['특징', r.tag, patch.tag],
    ] as [string, string, string][]
  ).filter(([, a, b]) => a !== b);

  return {
    kind: 'roominfo',
    code,
    patch,
    field: `객실 정보 · ${r.name}`,
    from: changed.map(([, a]) => a).join(' · ') || '바뀐 것 없음',
    to: changed.map(([, , b]) => b).join(' · ') || '바뀐 것 없음',
    warn: r.floor !== patch.floor ? '층이 바뀌면 이 객실을 쓰는 시설의 "이용 객실" 문구가 다시 계산됩니다.' : '',
    groups: [
      {
        title: `고치는 항목 ${changed.length}`,
        desc: `${r.name} · ${r.code}`,
        items: changed.map(([k, a, b]) => ({
          key: `info:${k}`,
          label: k,
          before: a,
          after: b,
          on: true,
          isOv: false,
        })),
      },
      ...derivedGroup(derived),
      {
        title: '판매 사이트 3',
        desc: '사이트 상품명·설명',
        items: channelItems((ch) => `${ch} · ${r.name} 상품`, r.name, patch.name),
      },
    ],
  };
};

export const buildRoom = (p: Property, nr: NewRoomDraft): Room => ({
  code: String(Math.max(...p.rooms.map((r) => Number(r.code))) + 1),
  name: nr.name || '새 객실',
  floor: Number(nr.floorText),
  area: nr.area,
  form: nr.form,
  bed: nr.bed,
  tag: nr.tag,
  values: { ...nr.values },
});

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

/** 다시 켤 때, 그리고 쓰는 중에도 — 어느 객실에 붙일지 그 자리에서 고릅니다.
 *  체크를 풀면 그 객실에서 시설이 빠지고, 새로 체크하면 붙습니다. */
export const previewBlockUse = (p: Property, bk: Block, reviving = bk.st !== 'used'): Cascade => {
  const attr = bk.memberOf?.attr;
  const code = bk.memberOf?.codes[0];
  const def = attr ? attrDef(attr) : undefined;

  /** 켤 때는 원래 쓰던(지금 "없음"인) 객실을, 쓰는 중일 때는 지금 붙어 있는 객실을 체크해 둡니다. */
  const current = attr && !reviving ? membersOf(p, bk) : [];
  const candidates = attr ? p.rooms.filter((r) => String(valueOf(p, r, attr)) === 'none') : [];
  const suggest = reviving ? (candidates.length ? candidates : p.rooms) : current;

  const pick: CascadeItem[] =
    attr && code
      ? p.rooms.map((r) => {
          const on = suggest.some((s) => s.code === r.code);
          const now = showRoomValue(p, r, attr);
          return {
            key: `apply:${r.code}`,
            label: `${r.name} · ${r.code} (${r.floor}층)`,
            before: now,
            /** 이미 이 시설을 쓰는 객실은 지금 값을 유지합니다 — 체크만으로 종류가 바뀌면 곤란합니다. */
            after: on && current.some((c) => c.code === r.code) ? now : (attrOption(attr, code)?.label ?? String(code)),
            on,
            isOv: isOwn(r, attr),
          };
        })
      : [];

  const faq = faqItemsFor(p, [bk.key], reviving ? '빠져 있음' : '지금 답변', reviving ? '다시 보임' : '다시 만들어짐');

  return {
    kind: 'blockstate',
    blockKey: bk.key,
    nextSt: 'used',
    applyAttr: attr,
    applyCode: code,
    field: reviving ? `${bk.label} · 쓰기 시작` : `${bk.label} · 쓰는 객실 고치기`,
    from: reviving ? '있지만 안 씀' : `${current.length}객실`,
    to: reviving ? '쓰는 중' : '고른 객실',
    warn: pick.length
      ? `어느 객실에 붙일지 여기서 바로 고르세요. 체크한 객실에만 ${def?.label ?? ''} 값이 들어가고, 안내문과 객실 수는 그 결과대로 자동으로 만들어집니다.`
      : faq.length
        ? `딸린 질문·답변 ${faq.length}개가 같이 살아납니다. 답이 빈 것은 사이트에 보내기 전에 채워야 해요.`
        : '',
    groups: [
      ...(reviving
        ? [
            {
              title: '시설 1',
              desc: '쓸지 말지 바꿈',
              items: [
                { key: `blk:${bk.key}`, label: bk.label, before: '있지만 안 씀', after: '쓰는 중', on: true, locked: true, isOv: false },
                ...useFieldItem(bk, 'used'),
              ],
            },
          ]
        : []),
      ...(pick.length
        ? [
            {
              title: `어느 객실에 붙일까요 ${pick.length}`,
              desc: '체크를 풀면 그 객실에서 빠집니다',
              items: pick,
            },
          ]
        : []),
      {
        title: `판매 사이트 ${bk.chanN}`,
        desc: '사이트 시설 목록에 나감',
        items: channelItems((ch) => `${ch} · ${bk.label}`, '안 나감', '나감', bk.chanN),
      },
      ...(faq.length ? [{ title: `질문·답변 ${faq.length}`, desc: '빠져 있던 질문이 다시 살아남', items: faq }] : []),
    ],
  };
};

/** 전사 목록에서 이 숙소로 시설을 가져옵니다.
 *
 *  정의(가려내기 규칙 · 자동 계산 필드 · 기본 항목)를 함께 가져오지 않으면, 추가한 시설은
 *  "미입력"이라 적힌 자유 텍스트로 남아 영영 계산되지 않습니다. 그 시설이 쓰는 속성이
 *  이 숙소에 없으면 속성도 함께 붙습니다 — 그래야 객실 표에 열이 생기고 값을 넣을 수 있습니다. */
export const previewAddBlockItem = (p: Property, bk: Block): Cascade => {
  const cat = BLOCKCAT[bk.key];
  const faq = faqItemsFor(p, [bk.key], '이 숙소에 없음', '답변 입력 필요');
  const needsAttr = cat?.attr && !p.attrs.includes(cat.attr) ? cat.attr : undefined;
  const attrLabel = needsAttr ? (attrDef(needsAttr)?.label ?? needsAttr) : '';
  const fields = cat?.fields ?? [['이용 시간', '미입력']];

  return {
    kind: 'blockstate',
    blockKey: bk.key,
    nextSt: 'off',
    addAttr: needsAttr,
    addDefault: needsAttr ? (cat?.base ?? 'none') : undefined,
    field: `${bk.label} · 이 숙소에 추가`,
    from: '이 숙소에 없음',
    to: '있지만 안 씀',
    warn: needsAttr
      ? `객실 표에 "${attrLabel}" 열이 함께 생깁니다. 객실마다 값을 정한 뒤 "쓰기 시작"을 누르면 판매 사이트에 나갑니다.`
      : '항목만 생깁니다. 값을 채운 뒤 "쓰기 시작"을 눌러야 판매 사이트에 나갑니다.',
    groups: [
      {
        title: '시설 1',
        desc: '전체 목록에서 이 숙소로 가져옴',
        items: [{ key: `blk:${bk.key}`, label: bk.label, before: '없음', after: '있지만 안 씀', on: true, isOv: false }],
      },
      ...(needsAttr
        ? [
            {
              title: '객실 표에 생기는 열 1',
              desc: '이 시설이 쓰는 값',
              items: [
                {
                  key: `attr:${needsAttr}`,
                  label: attrLabel,
                  before: '이 숙소에 없음',
                  after: `전체값 ${showValue(needsAttr, cat?.base ?? 'none')}`,
                  on: true,
                  locked: true,
                  isOv: false,
                },
              ],
            },
          ]
        : []),
      {
        title: `채워지는 항목 ${fields.length}`,
        desc: cat?.computed ? '빈 칸은 객실에서 자동으로 계산됩니다' : '이 시설에 필요한 항목',
        items: fields.map(([k, v]) => ({
          key: `fld:${k}`,
          label: `${bk.label} · ${k}`,
          before: '—',
          after: cat?.computed?.[k] ? '자동 계산' : v || '미입력',
          on: true,
          locked: true,
          isOv: false,
        })),
      },
      ...(faq.length ? [{ title: `질문·답변 ${faq.length}`, desc: '이 시설을 묻는 질문', items: faq }] : []),
    ],
  };
};

/* ── 시설 항목 넣고 빼기 ────────────────────────────────────────────────── */

export const previewFieldAdd = (bk: Block, fieldKey: string): Cascade => {
  const type = typeOf(bk.key, fieldKey);
  return {
    kind: 'fieldadd',
    blockKey: bk.key,
    fieldKey,
    field: `${bk.label} · ${fieldKey} 넣기`,
    from: '없음',
    to: '미입력',
    warn: `${typeName(type)} 형식으로 들어갑니다. 넣은 뒤 "고치기"로 값을 채우세요.`,
    groups: [
      {
        title: '시설 1',
        desc: '항목 넣기',
        items: [{ key: `fld:${fieldKey}`, label: `${bk.label} · ${fieldKey}`, before: '없음', after: '미입력', on: true, isOv: false }],
      },
      { title: '판매 사이트 3', desc: '사이트 설명에 항목이 늘어남', items: channelItems((ch) => `${ch} · ${bk.label}`, '이전 설명', `${fieldKey} 추가`) },
    ],
  };
};

export const previewFieldDel = (p: Property, bk: Block, fieldKey: string): Cascade => {
  const cur = bk.fields.find((f) => f[0] === fieldKey);
  return {
    kind: 'fielddel',
    blockKey: bk.key,
    fieldKey,
    field: `${bk.label} · ${fieldKey} 빼기`,
    from: cur?.[1] ?? '—',
    to: '삭제',
    warn: '이 항목을 인용하는 질문·답변이 있으면 답이 비게 됩니다.',
    groups: [
      {
        title: '시설 1',
        desc: '항목 빼기',
        items: [{ key: `fld:${fieldKey}`, label: `${bk.label} · ${fieldKey}`, before: cur?.[1] ?? '—', after: '삭제', on: true, isOv: false }],
      },
      ...(faqItemsFor(p, [bk.key], '지금 답변', '값이 없어져 비게 됨').length
        ? [{ title: '질문·답변', desc: '이 시설을 옮겨 적는 답변', items: faqItemsFor(p, [bk.key], '지금 답변', '값이 없어져 비게 됨') }]
        : []),
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
  let attrs = p.attrs;
  let defaults = p.defaults;

  /** 숙소 전체값 바꾸기 — 따로 정한 객실은 손대지 않습니다. 새 전체값과 같아진 객실만
   *  "따로 정함"을 떼어, 표시와 실제가 어긋나지 않게 합니다. */
  if (c.kind === 'default') {
    defaults = { ...defaults, [c.attr]: c.value };
    rooms = rooms.map((r) => {
      if (r.values[c.attr] !== c.value) return r;
      const values = { ...r.values };
      delete values[c.attr];
      return { ...r, values };
    });
  }

  if (c.kind === 'roominfo') {
    rooms = rooms.map((r) => (r.code === c.code ? { ...r, ...c.patch } : r));
  }

  if (c.kind === 'fieldadd') {
    blocks = blocks.map((b) => (b.key !== c.blockKey || b.fields.some((f) => f[0] === c.fieldKey) ? b : { ...b, fields: [...b.fields, [c.fieldKey, '미입력']] }));
  }

  if (c.kind === 'fielddel') {
    blocks = blocks.map((b) => (b.key !== c.blockKey ? b : { ...b, fields: b.fields.filter((f) => f[0] !== c.fieldKey) }));
  }

  if (c.kind === 'bulk') {
    rooms = rooms.map((r) => {
      if (!roomKeys.includes(r.code)) return r;
      const v = r.code in c.per ? c.per[r.code] : c.value;
      const values = { ...r.values };
      /** 숙소 기본값과 같아지면 "따로 정함"을 지웁니다 — 표시와 실제가 어긋나지 않게. */
      if (p.defaults[c.attr] === v) delete values[c.attr];
      else values[c.attr] = v;
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
    /** 전사 목록에서 가져오는 시설이 쓰는 속성을 숙소에 붙입니다 — 이걸 안 하면
     *  가려내기 규칙이 가리키는 속성이 없어서 영영 계산되지 않습니다. */
    if (c.addAttr && !attrs.includes(c.addAttr)) {
      attrs = [...attrs, c.addAttr];
      defaults = { ...defaults, [c.addAttr]: c.addDefault ?? 'none' };
    }
    /** 시설을 켜든 끄든 소속 객실을 다시 고르든, **하는 일은 하나뿐입니다** —
     *  "이 시설에 속할 객실의 최종 목록"을 정하는 것. 그래서 쓰는 자리도 하나입니다.
     *
     *  전에는 켜기·끄기·다시 고르기가 각자 객실을 건드려 세 갈래였고, 조건이 조금씩
     *  달라 어긋나기 쉬웠습니다. 세 경우의 차이는 이제 아래 두 줄(범위와 목록)뿐입니다. */
    const attr = c.applyAttr;
    if (attr) {
      const memberCodes = blocks.find((b) => b.key === c.blockKey)?.memberOf?.codes ?? [];
      const offered = c.groups.flatMap((g) => g.items).filter((i) => i.key.startsWith('apply:')).map((i) => i.key.slice(6));

      /** 이 조작이 건드리는 객실 범위. 끄면 지금 쓰는 객실, 켜면 고르라고 내놓은 객실. */
      const scope = c.nextSt === 'used' ? offered : (c.killRooms ?? []);
      /** 그중 시설에 속할 객실. 끄면 아무도 없습니다. */
      const members = new Set(
        c.nextSt === 'used' ? checked.filter((i) => i.key.startsWith('apply:')).map((i) => i.key.slice(6)) : [],
      );

      rooms = rooms.map((r) => {
        if (!scope.includes(r.code)) return r;
        const isMemberNow = memberCodes.includes(String(valueOf(p, r, attr)));
        const shouldBeMember = members.has(r.code);
        /** 이미 원하는 상태면 손대지 않습니다 — 쓰던 객실의 종류(가스/숯불)가 덮이지 않습니다. */
        if (isMemberNow === shouldBeMember) return r;
        return { ...r, values: { ...r.values, [attr]: shouldBeMember ? (c.applyCode ?? 'none') : 'none' } };
      });
    }
    blocks = blocks.map((b) => {
      if (b.key !== c.blockKey) return b;
      const cat = BLOCKCAT[b.key];
      const nb: Block = { ...b, st: c.nextSt };
      nb.fields = nb.fields.map((f) =>
        f[0] === '사용 여부' ? [f[0], c.nextSt === 'used' ? '사용' : '사용안함'] : f,
      );
      /** 전사 목록에서 가져올 때 정의를 통째로 붙입니다 — 가려내기 규칙과 자동 계산까지. */
      if (c.nextSt === 'off' && !nb.fields.length && cat) {
        nb.fields = cat.fields.map(([k, v]): [string, string] => [k, v]);
        if (cat.attr && cat.codes) nb.memberOf = { attr: cat.attr, codes: cat.codes };
        if (cat.computed) nb.computed = cat.computed;
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

  const written: Property = { ...p, rooms, blocks, fees, channels, attrs, defaults };
  /** 마지막에 자동 계산 필드를 한 번 더 돌립니다 — 저장된 값과 계산 결과가 늘 같도록.
   *  단, 시설을 켜고 끈 직후에는 사용자가 고른 상태가 자동 계산보다 우선합니다. */
  const recomputed = deriveBlocks(written).map((b) =>
    c.kind === 'blockstate' && b.key === c.blockKey ? { ...b, st: c.nextSt } : b,
  );

  return { next: { ...written, blocks: recomputed, savedAt: '2026-07-26 09:41' }, checkedN: checked.length };
};


