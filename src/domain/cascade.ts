import { BASEVAL, BBQVAL, CHANKEYS, FIELDS, instantiateRule, optByLabel, ruleById } from './catalog';
import { curVal, deriveBlocks, derivedDiff, derivedGroup, dispVal, isOverridden, ruleText, simulate, stName } from './derive';
import type {
  Block,
  BlockStatus,
  BulkFieldId,
  Cascade,
  CascadeGroup,
  CascadeItem,
  ChannelKey,
  ChannelRowId,
  MasterState,
  NewRoomDraft,
  OptionCode,
  Room,
  Snapshot,
} from './types';

const feeOf = (st: MasterState, code: OptionCode) => st.optFees[code] ?? '—';

const channelItems = (label: (chName: string) => string, before: string, after: string, n = 3): CascadeItem[] =>
  CHANKEYS.slice(0, n).map(([ck, chName]) => ({
    key: `ch:${ck}`,
    label: label(chName),
    before,
    after,
    on: true,
    isOv: false,
  }));

/* ── room-level edits ───────────────────────────────────────────────────── */

export const previewBulk = (st: MasterState): Cascade => {
  const b = st.bulk!;
  const fd = FIELDS.find((f) => f.id === b.field)!;

  const items: CascadeItem[] = st.rooms
    .filter((r) => st.sel.includes(r.code))
    .map((r) => ({
      key: `room:${r.code}`,
      label: `${r.short} · ${r.code}`,
      before: dispVal(b.field, curVal(r, b.field)),
      after: dispVal(b.field, b.value),
      on: curVal(r, b.field) !== b.value,
      isOv: isOverridden(r, b.field),
    }));

  const side = channelItems((ch) => `${ch} · ${fd.label}`, '이전 값', dispVal(b.field, b.value));

  const faq: CascadeItem[] =
    b.field === 'bbq'
      ? [
          { key: 'faq:Q-0019', label: 'FAQ Q-0019 · 개별바베큐', before: '기존 답변', after: '바베큐 이용 객실 문구 자동 반영', on: true, isOv: false },
          { key: 'faq:Q-0014', label: 'FAQ Q-0014 · 바베큐 신청', before: '기존 답변', after: '이용 가능 객실 목록 자동 반영', on: true, isOv: false },
        ]
      : [];

  const derived = derivedDiff(st.rooms, st.blocks, simulate(st.rooms, st.sel, b.field, b.value, st.optFees));

  return {
    kind: 'bulk',
    field: fd.label,
    from: '객실별 현재값',
    to: dispVal(b.field, b.value),
    target: b.field,
    value: b.value,
    warn: items.some((i) => i.isOv)
      ? '선택 객실 중 일부는 이미 개별 오버라이드가 있습니다. 체크를 해제하면 그 객실의 기존 값은 유지됩니다.'
      : derived.length
        ? `숙소 블록의 자동 산출 필드 ${derived.length}건은 객실 값에서 다시 계산됩니다 — 따로 수정할 필요가 없습니다.`
        : '',
    groups: [
      { title: `객실 ${items.length}`, desc: '선택한 객실에 값 쓰기', items },
      ...derivedGroup(derived),
      { title: '판매 채널 3', desc: '매핑 사전을 통해 채널 표현으로 변환', items: side },
      ...(faq.length ? [{ title: `FAQ ${faq.length}`, desc: '시설 값을 인용하는 답변', items: faq }] : []),
    ],
  };
};

export const buildRoom = (st: MasterState, nr: NewRoomDraft): Room => {
  const big = nr.pax === '4/6';
  const opt = optByLabel(nr.bbq);
  const nextCode = String(Math.max(...st.rooms.map((r) => Number(r.code))) + 1);
  return {
    code: nextCode,
    short: nr.name || '신규객실',
    tag: '오션뷰',
    floor: Number(nr.floor),
    area: big ? '92.56㎡ (28평)' : '59.50㎡ (18평)',
    form: big ? '분리형' : '원룸형',
    bed: big ? '킹침대 2' : '킹침대 1',
    facil: '변형3',
    baseP: big ? 4 : 2,
    maxP: big ? 6 : 4,
    paxOv: big,
    extra: 30000,
    extraOv: false,
    bbq: nr.bbq,
    bbqOv: nr.bbq !== BASEVAL.bbq,
    bbqOpt: opt.code,
    bbqFee: feeOf(st, opt.code),
    spa: big ? '제트스파 4인용' : '제트스파 2인용',
    spaOv: big,
  };
};

export const previewNewRoom = (st: MasterState, room: Room): Cascade => {
  const derived = derivedDiff(st.rooms, st.blocks, [...st.rooms, room]);
  return {
    kind: 'roomadd',
    room,
    field: `객실 신규 등록 · ${room.short}`,
    from: '없음',
    to: `${room.short} (${room.floor}층 · ${room.bbq})`,
    warn: '객실이 하나 늘면 이 객실을 참조하는 숙소 블록 문구와 객실 수가 모두 다시 계산됩니다.',
    groups: [
      {
        title: '객실 1',
        desc: '신규 등록',
        items: [
          {
            key: `room:${room.code}`,
            label: `${room.short} · ${room.code}`,
            before: '—',
            after: `기준 ${room.baseP}/최대 ${room.maxP} · ${room.bbq}`,
            on: true,
            isOv: false,
          },
        ],
      },
      ...derivedGroup(derived),
      {
        title: '판매 채널 3',
        desc: '신규 객실 상품 생성 + 부대시설 문구',
        items: channelItems((ch) => `${ch} · ${room.short} 상품`, '없음', '생성 · 전송 대기'),
      },
    ],
  };
};

export const previewDelete = (st: MasterState): Cascade => {
  const gone = st.rooms.filter((r) => st.sel.includes(r.code));
  const next = st.rooms.filter((r) => !st.sel.includes(r.code));
  const derived = derivedDiff(st.rooms, st.blocks, next);
  return {
    kind: 'roomdel',
    codes: st.sel,
    field: `객실 삭제 · ${gone.length}객실`,
    from: gone.map((r) => r.short).join(','),
    to: '삭제',
    warn: '삭제된 객실을 참조하던 블록 문구·객실 수는 자동으로 줄어듭니다. 마지막 객실이 빠진 시설은 사용안함으로 내려갑니다.',
    groups: [
      {
        title: `객실 ${gone.length}`,
        desc: '삭제 대상',
        items: gone.map((r) => ({
          key: `room:${r.code}`,
          label: `${r.short} · ${r.code}`,
          before: `${r.bbq} · ${r.spa}`,
          after: '삭제',
          on: true,
          isOv: false,
        })),
      },
      ...derivedGroup(derived),
      {
        title: '판매 채널 3',
        desc: '채널 상품 판매중지',
        items: channelItems((ch) => `${ch} · 상품 ${gone.length}건`, '판매중', '판매중지'),
      },
    ],
  };
};

/* ── facility (block) lifecycle ─────────────────────────────────────────── */

/** The 사용 여부 field restates the block's state, so it moves with it — shown as a
 *  locked row rather than left to be noticed later. */
const useFieldItem = (bk: Block, nextSt: BlockStatus): CascadeItem[] => {
  const f = bk.fields.find((x) => x[0] === '사용 여부');
  if (!f || nextSt === 'none') return [];
  const after = nextSt === 'used' ? '사용' : '사용안함';
  return f[1] === after
    ? []
    : [{ key: `fld:${bk.key}:사용 여부`, label: `${bk.label} · 사용 여부`, before: f[1], after, on: true, locked: true, isOv: false }];
};

/** 사용 중지 (off) · 항목 제거 (none) */
export const previewBlockState = (st: MasterState, bk: Block, nextSt: 'off' | 'none'): Cascade => {
  const isBbq = bk.key.includes('bbq');
  const want = bk.key === 'shared_bbq' ? '공용BBQ' : '개별BBQ';
  const hit = isBbq ? st.rooms.filter((r) => r.bbq.includes(want)) : [];
  const hitCodes = hit.map((r) => r.code);
  const nextRooms = isBbq
    ? st.rooms.map((r) =>
        hitCodes.includes(r.code) ? { ...r, bbq: '이용 불가', bbqOpt: 'none' as const, bbqFee: '—', bbqOv: true } : r,
      )
    : st.rooms;
  const nextBlocks = st.blocks.map((b) => (b.key === bk.key ? { ...b, st: nextSt } : b));
  const derived = derivedDiff(st.rooms, st.blocks, nextRooms, nextBlocks).filter(
    (d) => !d.key.includes(`drv:${bk.key}:st`),
  );

  const faq: CascadeItem[] = st.faqs
    .filter(
      (f) =>
        (isBbq && f.cate.includes('바베큐')) ||
        (bk.key === 'shared_pool' && f.cate === '공용수영장') ||
        (bk.key === 'spa' && f.cate === '스파'),
    )
    .slice(0, 6)
    .map((f) => ({ key: `faq:${f.qid}`, label: `FAQ ${f.qid}`, before: '활성', after: '자동 비활성', on: true, locked: true, isOv: false }));

  return {
    kind: 'blockstate',
    blockKey: bk.key,
    nextSt,
    killRooms: hitCodes,
    field: `${bk.label}${nextSt === 'none' ? ' · 항목 제거' : ' · 사용 중지'}`,
    from: stName(bk.st),
    to: stName(nextSt),
    warn:
      nextSt === 'none'
        ? '항목 자체를 이 숙소에서 제거합니다. 이 시설을 쓰던 객실 값도 함께 비워지고, 관련 FAQ는 비활성됩니다.'
        : '판매 노출만 끕니다. 값과 필드는 남아 있어 언제든 다시 켤 수 있습니다.',
    groups: [
      {
        title: '숙소 블록 1',
        desc: nextSt === 'none' ? '카탈로그 항목 제거' : '사용 여부 전환',
        items: [
          { key: `blk:${bk.key}`, label: bk.label, before: stName(bk.st), after: stName(nextSt), on: true, isOv: false },
          ...useFieldItem(bk, nextSt),
        ],
      },
      ...(hit.length
        ? [
            {
              title: `객실 ${hit.length}`,
              desc: '이 시설을 참조하던 객실 값',
              items: hit.map((r) => ({
                key: `room:${r.code}`,
                label: `${r.short} · ${r.code}`,
                before: r.bbq,
                after: '이용 불가',
                on: true,
                locked: true,
                isOv: false,
              })),
            },
          ]
        : []),
      ...derivedGroup(derived),
      {
        title: `판매 채널 ${bk.chanN}`,
        desc: '채널 부대시설 항목',
        items: channelItems((ch) => `${ch} · ${bk.label}`, '노출', '미노출', bk.chanN),
      },
      ...(faq.length ? [{ title: `FAQ ${faq.length}`, desc: '연결 문항 자동 비활성', items: faq }] : []),
    ],
  };
};

/** 사용으로 전환 — the operator picks the rooms right here, so reviving a facility is one step. */
export const previewBlockUse = (st: MasterState, bk: Block): Cascade => {
  const val = BBQVAL[bk.key];
  const isBbq = !!val;
  const freed = st.rooms.filter((r) => r.bbq === '이용 불가');
  const suggest = freed.length ? freed : st.rooms;
  const suggestCodes = suggest.map((r) => r.code);

  const pick: CascadeItem[] = isBbq
    ? st.rooms.map((r) => ({
        key: `apply:${r.code}`,
        label: `${r.short} · ${r.code} (${r.floor}층)`,
        before: r.bbq,
        after: val,
        on: suggestCodes.includes(r.code),
        isOv: r.bbqOv,
      }))
    : [];

  const faq: CascadeItem[] = st.faqs
    .filter(
      (f) =>
        (isBbq && f.cate.includes('바베큐')) ||
        (bk.key === 'private_pool' && f.cate === '개별수영장') ||
        (bk.key === 'pet_friendly' && f.cate === '애견동반'),
    )
    .slice(0, 8)
    .map((f) => ({ key: `faq:${f.qid}`, label: `FAQ ${f.qid}`, before: '자동 비활성', after: '활성 · 답변 입력 필요', on: true, locked: true, isOv: false }));

  return {
    kind: 'blockstate',
    blockKey: bk.key,
    nextSt: 'used',
    applyVal: val,
    field: `${bk.label} · 사용 여부`,
    from: '보유 · 사용안함',
    to: '사용중',
    warn: isBbq
      ? '적용 객실을 여기서 바로 고르세요 — 체크한 객실에 오버라이드로 기록되고, 블록의 이용 객실 문구·객실 수는 그 결과에서 자동 산출됩니다. (기본 선택: 이용 불가 상태였던 객실)'
      : faq.length
        ? `연결된 FAQ ${faq.length}건이 함께 활성화됩니다. 답변이 빈 문항은 채널 전송 전에 채워야 합니다.`
        : '',
    groups: [
      {
        title: '숙소 블록 1',
        desc: '사용 여부 전환',
        items: [
          { key: `blk:${bk.key}`, label: bk.label, before: '보유·사용안함', after: '사용중', on: true, locked: true, isOv: false },
          ...useFieldItem(bk, 'used'),
        ],
      },
      ...(pick.length ? [{ title: `적용 객실 선택 ${pick.length}`, desc: '체크한 객실에만 이 시설을 붙입니다', items: pick }] : []),
      {
        title: `판매 채널 ${bk.chanN}`,
        desc: '채널 부대시설 항목에 노출',
        items: channelItems((ch) => `${ch} · ${bk.label}`, '미노출', '노출', bk.chanN),
      },
      ...(faq.length ? [{ title: `FAQ ${faq.length}`, desc: '자동 비활성 해제', items: faq }] : []),
    ],
  };
};

/** + 항목 추가 — pull a catalogue item into this property (values still to be filled in). */
export const previewAddBlockItem = (st: MasterState, bk: Block): Cascade => {
  const faq: CascadeItem[] = st.faqs
    .filter((f) => f.cate.includes('캠핑') && bk.key === 'camping')
    .slice(0, 5)
    .map((f) => ({ key: `faq:${f.qid}`, label: `FAQ ${f.qid}`, before: '항목 없음 · 비활성', after: '활성 · 답변 입력 필요', on: true, isOv: false }));

  return {
    kind: 'blockstate',
    blockKey: bk.key,
    nextSt: 'off',
    field: `${bk.label} · 항목 보유`,
    from: '이 숙소에 없음',
    to: '보유 (사용 여부 별도 설정)',
    warn: '항목만 추가됩니다. 실제 판매 노출은 값 입력 후 "사용으로 전환"에서 켜세요.',
    groups: [
      {
        title: '숙소 블록 1',
        desc: '전사 카탈로그에서 이 숙소로 항목 추가',
        items: [{ key: `blk:${bk.key}`, label: bk.label, before: '미보유', after: '보유 · 사용안함', on: true, isOv: false }],
      },
      {
        title: '입력 필요 필드',
        desc: '카탈로그가 정의한 필수 필드',
        items: (['이용 객실', '이용 요금', '이용 시간'] as const).map((k) => ({
          key: `fld:${k}`,
          label: `${bk.label} · ${k}`,
          before: '—',
          after: '미입력',
          on: true,
          isOv: false,
        })),
      },
      ...(faq.length ? [{ title: `FAQ ${faq.length}`, desc: '이 시설을 묻는 문항', items: faq }] : []),
    ],
  };
};

/* ── typed value edits ──────────────────────────────────────────────────── */

export const previewBlockEdit = (st: MasterState, bk: Block, fieldKey: string, value: string): Cascade => {
  const scope =
    bk.key === 'private_bbq'
      ? st.rooms.filter((r) => r.floor === 3)
      : bk.key === 'shared_bbq'
        ? st.rooms.filter((r) => r.floor !== 3)
        : st.rooms;

  const items: CascadeItem[] = scope.map((r) => ({
    key: `room:${r.code}`,
    label: `${r.short} · ${r.code}`,
    before: '숙소값 상속',
    after: value,
    on: true,
    locked: true,
    isOv: false,
  }));

  const faq: CascadeItem[] = st.faqs
    .filter(
      (f) =>
        (bk.key.includes('bbq') && f.cate.includes('바베큐')) ||
        (bk.key === 'shared_pool' && f.cate === '공용수영장') ||
        (bk.key === 'spa' && f.cate === '스파'),
    )
    .slice(0, 4)
    .map((f) => ({
      key: `faq:${f.qid}`,
      label: `FAQ ${f.qid}`,
      before: f.tpl ? '시설 값에서 생성' : f.a || '(공백)',
      after: '새 값으로 재생성',
      on: true,
      locked: true,
      isOv: false,
    }));

  return {
    kind: 'block',
    blockKey: bk.key,
    fieldKey,
    value,
    field: `${bk.label} · ${fieldKey}`,
    from: '기존 값',
    to: value,
    warn: '',
    groups: [
      { title: `상속 객실 ${items.length}`, desc: '이 블록을 이용하는 객실', items },
      {
        title: '판매 채널 3',
        desc: '채널 상세 설명 문구',
        items: channelItems((ch) => `${ch} · ${bk.label}`, '이전 값', value),
      },
      ...(faq.length ? [{ title: `FAQ ${faq.length}`, desc: '이 시설을 인용하는 답변', items: faq }] : []),
    ],
  };
};

/** Fees hang off the option, not the room — one edit reaches every room using it. */
export const previewOptFee = (st: MasterState, code: OptionCode, label: string, value: string): Cascade => {
  const hit = st.rooms.filter((r) => r.bbqOpt === code);
  const nextRooms = st.rooms.map((r) => (r.bbqOpt === code ? { ...r, bbqFee: value } : r));
  return {
    kind: 'optfee',
    code,
    value,
    field: `${label} · 이용요금`,
    from: feeOf(st, code),
    to: value,
    warn: `요금은 옵션에 붙습니다. 이 옵션을 쓰는 객실 ${hit.length}개와 숙소 블록 요금 문구, 채널 요금이 한 번에 갱신됩니다.`,
    groups: [
      {
        title: '옵션 1',
        desc: '전사 옵션의 이 숙소 요금',
        items: [{ key: `opt:${code}`, label, before: feeOf(st, code), after: value, on: true, locked: true, isOv: false }],
      },
      ...(hit.length
        ? [
            {
              title: `객실 ${hit.length}`,
              desc: '이 옵션을 쓰는 객실',
              items: hit.map((r) => ({
                key: `room:${r.code}`,
                label: `${r.short} · ${r.code}`,
                before: r.bbqFee,
                after: value,
                on: true,
                locked: true,
                isOv: false,
              })),
            },
          ]
        : []),
      ...derivedGroup(derivedDiff(st.rooms, st.blocks, nextRooms)),
      {
        title: '판매 채널 3',
        desc: '채널 요금 표기',
        items: channelItems((ch) => `${ch} · ${label} 요금`, feeOf(st, code), value),
      },
    ],
  };
};

/* ── advisory rules ─────────────────────────────────────────────────────── */

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
    field: `${bk.label} · 안내 규칙`,
    from: ruleText(r),
    to: after,
    warn: '안내 문장은 규칙 조각(시각·금액·수치)에서 생성됩니다. 문장을 직접 쓰는 곳이 없으므로 숫자와 문장이 어긋날 수 없습니다.',
    groups: [
      {
        title: '숙소 블록 1',
        desc: '규칙 값 변경 · 문장 재생성',
        items: [{ key: `rule:${bk.key}:${ri}`, label: `${bk.label} 규칙 ${ri + 1}`, before: ruleText(r), after, on: true, locked: true, isOv: false }],
      },
      {
        title: '판매 채널 3',
        desc: '채널 안내 문구 재생성',
        items: channelItems((ch) => `${ch} · ${bk.label} 안내`, '이전 문장', after),
      },
    ],
  };
};

export const previewRuleAdd = (bk: Block, ruleId: string): Cascade => {
  const cat = instantiateRule(ruleId);
  return {
    kind: 'ruleadd',
    blockKey: bk.key,
    ruleId,
    field: `${bk.label} · 안내 규칙 추가`,
    from: '없음',
    to: ruleText(cat),
    warn: '전사 규칙 카탈로그에서 고릅니다 — 자유 문장 입력은 없습니다.',
    groups: [
      {
        title: '숙소 블록 1',
        desc: '규칙 추가',
        items: [{ key: `ruleadd:${ruleId}`, label: bk.label, before: '—', after: ruleText(cat), on: true, locked: true, isOv: false }],
      },
      {
        title: '판매 채널 3',
        desc: '채널 안내 문구에 추가',
        items: channelItems((ch) => `${ch} · ${bk.label} 안내`, '이전 문장', '규칙 1건 추가'),
      },
    ],
  };
};

export const previewRuleDel = (bk: Block, ri: number): Cascade => ({
  kind: 'ruledel',
  blockKey: bk.key,
  ri,
  field: `${bk.label} · 안내 규칙 삭제`,
  from: ruleText(bk.rules![ri]),
  to: '삭제',
  warn: '',
  groups: [
    {
      title: '숙소 블록 1',
      desc: '규칙 삭제',
      items: [{ key: `ruledel:${ri}`, label: bk.label, before: ruleText(bk.rules![ri]), after: '삭제', on: true, locked: true, isOv: false }],
    },
  ],
});

/* ── channel correction ─────────────────────────────────────────────────── */

export const previewChannelSync = (
  st: MasterState,
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
  from: st.channels[rowId][ck],
  to,
  warn: '채널이 마스터와 다른 값을 갖고 있습니다. 교정하면 채널 쪽 수동 편집분은 사라집니다.',
  groups: [
    {
      title: '채널 값 1',
      desc: '매핑 사전 규칙으로 교정',
      items: [{ key: `ch:${ck}`, label: `${chName} · ${label}`, before: st.channels[rowId][ck], after: to, on: true, isOv: false }],
    },
    {
      title: '연동 재전송',
      desc: '교정 후 자동 재전송 큐에 등록',
      items: [{ key: `q:${ck}`, label: `${chName} 상품 재전송`, before: '대기', after: '즉시 전송', on: true, isOv: false }],
    },
  ],
});

/* ── commit ─────────────────────────────────────────────────────────────── */

export type ApplyResult = {
  rooms: Room[];
  blocks: Block[];
  channels: MasterState['channels'];
  optFees: MasterState['optFees'];
  snapshot: Snapshot;
  checkedN: number;
};

const checkedItems = (groups: CascadeGroup[]): CascadeItem[] =>
  groups.reduce<CascadeItem[]>((a, g) => a.concat(g.items.filter((i) => i.on)), []);

/** Write the previewed change. Every room write goes through
 *  option label → option code → option fee, so no branch can invent its own price. */
export const applyCascade = (st: MasterState, c: Cascade): ApplyResult => {
  const checked = checkedItems(c.groups);
  const roomKeys = checked.filter((i) => i.key.startsWith('room:')).map((i) => i.key.slice(5));
  const snapshot: Snapshot = {
    rooms: st.rooms,
    channels: st.channels,
    blocks: st.blocks,
    optFees: st.optFees,
    faqs: st.faqs,
  };

  let rooms = st.rooms;
  let blocks = st.blocks;
  let channels = st.channels;
  let optFees = st.optFees;

  if (c.kind === 'bulk') {
    const target: BulkFieldId = c.target;
    const isOv = c.value !== BASEVAL[target];
    rooms = rooms.map((r) => {
      if (!roomKeys.includes(r.code)) return r;
      const nr = { ...r };
      if (target === 'maxP') {
        nr.maxP = Number(c.value);
        nr.paxOv = isOv;
      }
      if (target === 'extra') {
        nr.extra = Number(c.value);
        nr.extraOv = isOv;
      }
      if (target === 'bbq') {
        const o = optByLabel(c.value);
        nr.bbq = c.value;
        nr.bbqOv = isOv;
        nr.bbqOpt = o.code;
        nr.bbqFee = feeOf(st, o.code);
      }
      if (target === 'spa') {
        nr.spa = c.value;
        nr.spaOv = isOv;
      }
      if (target === 'facil') nr.facil = c.value;
      return nr;
    });
    blocks = deriveBlocks(rooms, blocks);
  }

  if (c.kind === 'block') {
    blocks = blocks.map((b) =>
      b.key !== c.blockKey
        ? b
        : { ...b, fields: b.fields.map((f) => (f[0] === c.fieldKey ? ([f[0], c.value] as [string, string]) : f)) },
    );
  }

  if (c.kind === 'roomadd') {
    rooms = [...rooms, c.room];
    blocks = deriveBlocks(rooms, blocks);
  }

  if (c.kind === 'roomdel') {
    rooms = rooms.filter((r) => !c.codes.includes(r.code));
    blocks = deriveBlocks(rooms, blocks);
  }

  if (c.kind === 'blockstate') {
    if (c.applyVal) {
      const applyCodes = checked.filter((i) => i.key.startsWith('apply:')).map((i) => i.key.slice(6));
      const opt = optByLabel(c.applyVal);
      rooms = rooms.map((r) =>
        !applyCodes.includes(r.code)
          ? r
          : { ...r, bbq: c.applyVal!, bbqOpt: opt.code, bbqFee: feeOf(st, opt.code), bbqOv: c.applyVal !== BASEVAL.bbq },
      );
    }
    if (c.killRooms?.length) {
      rooms = rooms.map((r) =>
        !c.killRooms!.includes(r.code) ? r : { ...r, bbq: '이용 불가', bbqOpt: 'none', bbqFee: '—', bbqOv: true },
      );
    }
    blocks = blocks.map((b) => {
      if (b.key !== c.blockKey) return b;
      const nb: Block = { ...b, st: c.nextSt };
      /** A 사용 여부 field is the same fact as the block's state — it follows, never lags. */
      nb.fields = nb.fields.map((f) =>
        f[0] === '사용 여부' ? ([f[0], c.nextSt === 'used' ? '사용' : '사용안함'] as [string, string]) : f,
      );
      if (c.nextSt === 'off' && !nb.fields.length) {
        nb.fields = [
          ['이용 객실', '미입력'],
          ['이용 요금', '미입력'],
          ['이용 시간', '미입력'],
        ];
      }
      if (c.nextSt === 'used' && nb.rooms === 0) nb.rooms = st.rooms.length;
      if (c.nextSt === 'none') {
        nb.fields = [];
        nb.rooms = 0;
        nb.rules = [];
      }
      return nb;
    });
    blocks = deriveBlocks(rooms, blocks).map((b) => (b.key === c.blockKey ? { ...b, st: c.nextSt } : b));
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

  if (c.kind === 'optfee') {
    optFees = { ...optFees, [c.code]: c.value };
    rooms = rooms.map((r) => (r.bbqOpt === c.code ? { ...r, bbqFee: c.value } : r));
    blocks = deriveBlocks(rooms, blocks);
  }

  if (c.kind === 'chan') {
    channels = { ...channels, [c.rowId]: { ...channels[c.rowId], [c.ck]: c.value } };
  }

  return { rooms, blocks, channels, optFees, snapshot, checkedN: checked.length };
};
