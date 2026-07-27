import { fmtNum } from './fieldTypes';
import type { AttrDef, AttrOption, AttrValue, Property, Room } from './types';

/** 전사 속성 사전.
 *
 *  숙소마다 가진 것이 다릅니다 — 어떤 곳은 바베큐·스파, 어떤 곳은 개별수영장·애견동반,
 *  어떤 곳은 캠핑장입니다. 그래서 객실이 무엇을 가지는지를 타입에 박지 않고 여기서
 *  정의하고, 숙소는 `attrs`로 자기가 쓰는 것만 고릅니다. 새 시설이 생기면 이 사전에
 *  한 줄 넣으면 되고, 화면·연쇄 갱신·검사·판매 사이트 변환이 모두 따라옵니다. */

const ch = (a: string, b: string, c: string) => ({ a, b, c });

export const ATTRS: AttrDef[] = [
  {
    key: 'capacity_base',
    label: '기준 인원',
    kind: 'int',
    unit: '명',
    min: 1,
    max: 30,
    width: 92,
    hint: '요금에 포함된 인원',
  },
  {
    key: 'capacity_max',
    label: '최대 인원',
    kind: 'int',
    unit: '명',
    min: 1,
    max: 40,
    width: 92,
    hint: '이 인원을 넘으면 입실 불가',
  },
  {
    key: 'extra_fee',
    label: '추가인원 요금',
    kind: 'money',
    width: 110,
    hint: '기준 인원을 넘는 1명당',
  },
  {
    key: 'bbq',
    label: '바베큐',
    kind: 'option',
    feeBearing: true,
    width: 168,
    options: [
      { code: 'shared_gas', label: '공용BBQ · 가스그릴', ch: ch('가스그릴', '가스BBQ', '가스그릴') },
      { code: 'shared_charcoal', label: '공용BBQ · 숯불', ch: ch('숯불그릴', '참숯BBQ', '숯불BBQ') },
      { code: 'shared_lid', label: '공용BBQ · 솥뚜껑', ch: ch('솥뚜껑', '솥뚜껑BBQ', '가마솥BBQ') },
      { code: 'private_electric', label: '개별BBQ · 전기그릴', ch: ch('전기그릴', '전기BBQ', '전기그릴') },
      { code: 'private_charcoal', label: '개별BBQ · 숯불', ch: ch('숯불그릴', '참숯BBQ', '숯불BBQ') },
      { code: 'none', label: '이용 불가', ch: ch('미제공', '미제공', '미제공') },
    ],
  },
  {
    key: 'spa',
    label: '스파',
    kind: 'option',
    facility: 'spa',
    width: 122,
    options: [
      { code: 'jet2', label: '제트스파 2인용', ch: ch('스파', '스파', '스파(제트)') },
      { code: 'jet4', label: '제트스파 4인용', ch: ch('스파', '스파', '스파(제트)') },
      { code: 'whirl', label: '월풀 2인용', ch: ch('월풀', '스파', '월풀') },
      { code: 'none', label: '없음', ch: ch('미제공', '미제공', '미제공') },
    ],
  },
  {
    key: 'private_pool',
    label: '개별 수영장',
    kind: 'option',
    facility: 'private_pool',
    feeBearing: true,
    width: 150,
    options: [
      { code: 'cold', label: '개별풀 · 냉수', ch: ch('개별수영장', '프라이빗풀', '개별풀(냉수)') },
      { code: 'warm', label: '개별풀 · 온수', ch: ch('개별수영장', '온수풀', '개별풀(온수)') },
      { code: 'none', label: '없음', ch: ch('미제공', '미제공', '미제공') },
    ],
  },
  {
    key: 'pet',
    label: '반려동물',
    kind: 'option',
    facility: 'pet_friendly',
    feeBearing: true,
    width: 138,
    options: [
      { code: 'small', label: '소형견 1마리', ch: ch('반려동물 동반', '애견동반', '반려견(소형)') },
      { code: 'medium', label: '중형견까지 2마리', ch: ch('반려동물 동반', '애견동반', '반려견(중형)') },
      { code: 'none', label: '입실 불가', ch: ch('불가', '불가', '불가') },
    ],
  },
  {
    key: 'camp_site',
    label: '캠핑 자리',
    kind: 'option',
    facility: 'camping',
    feeBearing: true,
    width: 156,
    options: [
      { code: 'auto', label: '오토캠핑 (차량 진입)', ch: ch('오토캠핑', '오토캠핑장', '오토캠핑') },
      { code: 'tent', label: '텐트 데크', ch: ch('캠핑', '캠핑장', '텐트사이트') },
      { code: 'caravan', label: '카라반', ch: ch('카라반', '카라반', '카라반') },
      { code: 'none', label: '없음', ch: ch('미제공', '미제공', '미제공') },
    ],
  },
  {
    key: 'view',
    label: '전망',
    kind: 'option',
    width: 110,
    options: [
      { code: 'ocean', label: '바다', ch: ch('오션뷰', '오션뷰', '바다전망') },
      { code: 'river', label: '강·호수', ch: ch('리버뷰', '리버뷰', '강전망') },
      { code: 'mountain', label: '산', ch: ch('마운틴뷰', '마운틴뷰', '산전망') },
      { code: 'garden', label: '정원', ch: ch('가든뷰', '가든뷰', '정원전망') },
    ],
  },
  {
    key: 'amenity_set',
    label: '객실 비품',
    kind: 'option',
    width: 118,
    hint: '객실에 들어가는 비품 묶음',
    options: [
      { code: 'set1', label: '기본 세트', ch: ch('기본', '기본', '기본') },
      { code: 'set2', label: '기본 + 욕실용품', ch: ch('욕실용품', '어메니티', '어메니티') },
      { code: 'set3', label: '기본 + 테라스', ch: ch('테라스', '테라스', '테라스') },
      { code: 'set4', label: '기본 + 취사도구', ch: ch('취사가능', '취사도구', '취사도구') },
    ],
  },
];

export const attrDef = (key: string): AttrDef | undefined => ATTRS.find((a) => a.key === key);

export const attrOption = (key: string, code: AttrValue): AttrOption | undefined => {
  const d = attrDef(key);
  return d?.kind === 'option' ? d.options.find((o) => o.code === code) : undefined;
};

/** 이 숙소가 쓰는 속성만, 사전에 정의된 순서대로. */
export const attrsOf = (p: Property): AttrDef[] =>
  ATTRS.filter((a) => p.attrs.includes(a.key));

/** 객실이 따로 정한 값이 있으면 그것, 없으면 숙소 기본값. */
export const valueOf = (p: Property, r: Room, key: string): AttrValue =>
  key in r.values ? r.values[key] : p.defaults[key];

/** 이 객실이 이 값을 따로 정해 두었는지. */
export const isOwn = (r: Room, key: string): boolean => key in r.values;

/** 사람이 읽는 형태로. 선택지는 이름, 숫자는 단위, 금액은 원. */
export const showValue = (key: string, v: AttrValue | undefined): string => {
  const d = attrDef(key);
  if (v === undefined || d === undefined) return '—';
  if (d.kind === 'option') return attrOption(key, v)?.label ?? String(v);
  if (d.kind === 'int') return `${v}${d.unit}`;
  return Number(v) === 0 ? '무료' : `${fmtNum(v)}원`;
};

/** 이 숙소에서 이 선택지에 붙은 요금. 요금은 객실이 아니라 선택지에 붙습니다. */
export const feeOf = (p: Property, attr: string, code: AttrValue): string =>
  p.fees[`${attr}:${code}`] ?? '—';

/** 객실이 지금 쓰는 선택지의 요금. */
export const roomFee = (p: Property, r: Room, attr: string): string =>
  feeOf(p, attr, valueOf(p, r, attr));

/** 요금이 붙는 속성들 — 요금표 탭이 이 목록을 그립니다. */
export const feeAttrsOf = (p: Property): AttrDef[] =>
  attrsOf(p).filter((a) => a.kind === 'option' && a.feeBearing);

export const cur = (properties: Property[], id: string): Property =>
  properties.find((p) => p.id === id) ?? properties[0];
