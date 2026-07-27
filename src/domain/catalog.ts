import type {
  BbqOption,
  BulkFieldId,
  ChannelKey,
  ChannelRowId,
  ChannelValues,
  FieldType,
  OptionCode,
  Rule,
  RuleDef,
} from './types';

/** Company-wide option codes. Room values are picked from this list — never typed —
 *  so a channel dictionary and link rules can hang off the code. */
export const OPTIONS: BbqOption[] = [
  { code: 'shared_gas', label: '공용BBQ · 가스그릴', scope: 'shared', ch: { a: '가스그릴', b: '가스BBQ', c: '가스그릴' } },
  { code: 'shared_charcoal', label: '공용BBQ · 숯불', scope: 'shared', ch: { a: '숯불그릴', b: '참숯BBQ', c: '숯불BBQ' } },
  { code: 'shared_lid', label: '공용BBQ · 솥뚜껑', scope: 'shared', ch: { a: '솥뚜껑', b: '솥뚜껑BBQ', c: '가마솥BBQ' } },
  { code: 'private_electric', label: '개별BBQ · 전기그릴', scope: 'private', ch: { a: '전기그릴', b: '전기BBQ', c: '전기그릴' } },
  { code: 'private_charcoal', label: '개별BBQ · 숯불', scope: 'private', ch: { a: '숯불그릴', b: '참숯BBQ', c: '숯불BBQ' } },
  { code: 'none', label: '이용 불가', scope: 'none', ch: { a: '미제공', b: '미제공', c: '미제공' } },
];

export const optByLabel = (label: string): BbqOption =>
  OPTIONS.find((o) => o.label === label) ?? OPTIONS[0];

export const optByCode = (code: OptionCode): BbqOption =>
  OPTIONS.find((o) => o.code === code) ?? OPTIONS[0];

export const FIELDS: { id: BulkFieldId; label: string; values: [string, string][] }[] = [
  {
    id: 'maxP',
    label: '최대 인원',
    values: [
      ['4', '최대 4명 (숙소 기본값)'],
      ['6', '최대 6명'],
      ['8', '최대 8명'],
    ],
  },
  {
    id: 'extra',
    label: '추가인원 요금',
    values: [
      ['30000', '30,000원 (숙소 기본값)'],
      ['35000', '35,000원'],
      ['40000', '40,000원'],
    ],
  },
  { id: 'bbq', label: '바베큐 유형', values: [] },
  {
    id: 'spa',
    label: '스파 유형',
    values: [
      ['제트스파 2인용', '제트스파 2인용 (숙소 기본값)'],
      ['제트스파 4인용', '제트스파 4인용'],
    ],
  },
  {
    id: 'facil',
    label: '객실내 시설 변형',
    values: [
      ['변형3', '변형3 · 19항목'],
      ['변형4', '변형4 · 테라스 없음'],
      ['변형1', '변형1 · 7층 구성'],
    ],
  },
];

/** 숙소 기본값. A room value equal to this inherits; anything else is an override. */
export const BASEVAL: Record<BulkFieldId, string> = {
  maxP: '4',
  extra: '30000',
  bbq: '공용BBQ · 가스그릴',
  spa: '제트스파 2인용',
  facil: '변형3',
};

export const CHANKEYS: [ChannelKey, string][] = [
  ['a', '네이버'],
  ['b', '여기어때'],
  ['c', '야놀자'],
];

/** The mapping dictionary: what each channel *should* read for a given master value. */
export const CHANNEL_RULES: Record<ChannelRowId, ChannelValues> = {
  theme: { a: '가족실, 2인실, 수영장', b: '가족추천, 커플, 실외수영장', c: '패밀리, 커플, 야외수영장(냉수)' },
  maxpax: { a: '7층 6인 / 그 외 4인', b: '7층 6인 / 그 외 4인', c: '7층 6인 / 그 외 4인' },
  bbq: { a: '개별 6실 / 공용 22실', b: '개별 6실 / 공용 22실', c: '개별 6실 / 공용 22실' },
  checkin: { a: '15:30 / 11:00', b: '15:30 / 11:00', c: '15:30 / 11:00' },
};

export const MASTER_ROWS: [ChannelRowId, string, string][] = [
  ['theme', '테마', '오션뷰 · 가족 · 커플 · 스파 · 공용수영장(냉수)'],
  ['maxpax', '최대 인원', '7층 6명 / 그 외 4명'],
  ['bbq', '바베큐', '개별BBQ 6실(전기그릴) / 공용BBQ 22실(가스그릴)'],
  ['checkin', '체크인/아웃', '15:30 / 11:00 (마감 22:00)'],
];

/** The BBQ value a block writes onto rooms when it is switched back on. */
export const BBQVAL: Record<string, string> = {
  shared_bbq: '공용BBQ · 가스그릴',
  private_bbq: '개별BBQ · 전기그릴',
};

/* ── field format resolution ────────────────────────────────────────────────
   Explicit block|field pairs win; then a name rule; then a keyword rule.
   Free text is reached only by naming it — everything else lands on an option. */

export const FTYPE: Record<string, FieldType> = {
  'checkin_checkout|체크인': 'time',
  'checkin_checkout|체크인 마감': 'time',
  'checkin_checkout|체크아웃': 'time',
  'extra_person|추가요금': 'money',
  'extra_person|성인 연령': 'int:세',
  'extra_person|아동 연령': 'int:세',
  'extra_person|유아 연령': 'int:개월',
  'shared_bbq|이용 장소': 'opt:place',
  'shared_bbq|제공 구성': 'opt:kit',
  'shared_bbq|이용 시간': 'range',
  'private_bbq|이용 장소': 'opt:place',
  'private_bbq|제공 구성': 'opt:kit',
  'private_bbq|이용 시간': 'range',
  'shared_pool|온도': 'opt:temp',
  'shared_pool|이용 요금': 'money',
  'shared_pool|이용 시간': 'range',
  'shared_pool|이용 객실': 'opt:scope',
  'shared_pool|운영 기간': 'daterange',
  'shared_pool|크기': 'dec:m 이상',
  'spa|스파 형태': 'opt:spa',
  'spa|이용 요금': 'money',
  'spa|이용 시간': 'range',
  'spa|이용 객실': 'opt:scope',
  'transportation|지번 주소': 'text',
  'transportation|도로명 주소': 'text',
  'parking|주차장': 'opt:parking',
  'parking|주차 대수': 'opt:parkcnt',
  'parking|전기차 충전': 'opt:yn',
};

export const OPTLIST: Record<string, string[]> = {
  place: ['루프탑', '개별 테라스', '1층 정원', '전용 데크', '실내 바베큐장'],
  kit: ['그릴+집게+가위', '그릴+집게+가위+숯', '그릴만 제공', '숯·토치 별도 판매'],
  temp: ['냉수', '미온수', '온수'],
  spa: ['제트스파', '월풀', '반신욕조', '노천탕'],
  bbqform: ['숯불', '가스그릴', '전기그릴', '솥뚜껑'],
  form: ['원룸형', '분리형', '복층형'],
  onoff: ['사용', '사용안함', '입실불가'],
  wear: ['수영복 필수', '래시가드 허용', '자유 복장'],
  scope: ['전 객실', '숙박객 전체', '3층 객실', '4~7층 객실', '7층 객실'],
  parking: ['보유', '없음', '인근 공영주차장'],
  parkcnt: ['객실당 1대', '객실당 2대', '선착순', '제한 없음'],
  yn: ['가능', '불가'],
  have: ['보유', '없음'],
  weather: ['우천', '강풍', '동계', '폭염', '태풍'],
  season: ['하절기', '동절기', '연중', '성수기'],
  tempctrl: ['직접 조절 가능', '프론트 요청', '고정'],
};

export const NAMETYPE: Record<string, FieldType> = {
  '이용 객실': 'opt:scope',
  '이용 장소': 'opt:place',
  '제공 구성': 'opt:kit',
  '사용 여부': 'opt:onoff',
  '이용 복장': 'opt:wear',
  온도: 'opt:temp',
  '바베큐 형태': 'opt:bbqform',
  '스파 형태': 'opt:spa',
  형태: 'opt:form',
  주차장: 'opt:parking',
  '주차 대수': 'opt:parkcnt',
  '전기차 충전': 'opt:yn',
  '운영 기간': 'daterange',
  크기: 'dec:m 이상',
  대상: 'opt:scope',
  '조식 서비스': 'opt:onoff',
};

export const FREETEXT = ['주의사항', '특이사항', '안내', '기타', '설명', '교통', '시설'];

/** Company-wide catalogue of advisory rules — the replacement for free-text 주의사항.
 *  Operators pick a pattern and fill its typed slots; the sentence is generated, so a
 *  number, a time or a fee inside prose can never drift away from the field it repeats.
 *
 *  Slot formats are the same ones the value editor already knows: 시각 · 금액 · 정수 ·
 *  시간대 · 옵션, plus `text` for a proper noun (상호명·지명) that no option list can hold. */
export const RULECAT: RuleDef[] = [
  /* — 이용 조건 — */
  { id: 'weather_off', group: '이용 조건', tpl: '{cond} 시 이용 불가', repeatable: true, slots: [{ k: 'cond', type: 'opt:weather', v: '우천' }] },
  { id: 'season_open', group: '이용 조건', tpl: '{season} 운영', slots: [{ k: 'season', type: 'opt:season', v: '하절기' }] },
  { id: 'winter_prep', group: '이용 조건', tpl: '{n} 이용 시 실외 방한 준비 필요', slots: [{ k: 'n', type: 'int:월', v: 2 }] },
  { id: 'prep_time', group: '이용 조건', tpl: '준비 소요시간 {n}', slots: [{ k: 'n', type: 'int:분', v: 0 }] },
  { id: 'advance', group: '이용 조건', tpl: '이용 {n} 전까지 사전 신청 필수', slots: [{ k: 'n', type: 'int:일', v: 1 }] },
  { id: 'first_come', group: '이용 조건', tpl: '선착순 예약제', slots: [] },
  { id: 'wear', group: '이용 조건', tpl: '이용 복장 {wear}', slots: [{ k: 'wear', type: 'opt:wear', v: '수영복 필수' }] },
  { id: 'temp_ctrl', group: '이용 조건', tpl: '온도 {mode}', slots: [{ k: 'mode', type: 'opt:tempctrl', v: '직접 조절 가능' }] },

  /* — 안전 — */
  { id: 'guardian', group: '안전', tpl: '{n} 이하 보호자 동반 필수', slots: [{ k: 'n', type: 'int:세', v: 14 }] },
  { id: 'diaper', group: '안전', tpl: '{n} 이하 물놀이용 기저귀 착용 필수', slots: [{ k: 'n', type: 'int:개월', v: 36 }] },
  { id: 'no_drink', group: '안전', tpl: '음주 후 이용 금지', slots: [] },
  { id: 'unmanned', group: '안전', tpl: '무인 운영 · 안전사고는 이용자 본인 책임', slots: [] },
  { id: 'no_lean', group: '안전', tpl: '창문·테라스에 기대거나 올라가지 마세요', slots: [] },
  { id: 'no_fire', group: '안전', tpl: '캔들·폭죽·부탄가스 등 화기류 사용 금지', slots: [] },
  { id: 'cctv', group: '안전', tpl: '공용구역 CCTV 촬영 중', slots: [] },

  /* — 요금 — */
  { id: 'towel_rent', group: '요금', tpl: '타월 대여 1장 {amt}', slots: [{ k: 'amt', type: 'money', v: 2000 }] },
  { id: 'late_out', group: '요금', tpl: '퇴실 지연 시 사전 요청 · {n} 초과 시 {amt} 추가', slots: [{ k: 'n', type: 'int:시간', v: 1 }, { k: 'amt', type: 'money', v: 50000 }] },
  { id: 'infant_free', group: '요금', tpl: '{n} 이상 {amt}', slots: [{ k: 'n', type: 'int:개월', v: 36 }, { k: 'amt', type: 'money', v: 30000 }] },
  { id: 'bedding_skip', group: '요금', tpl: '이불 미추가 시 {amt}', slots: [{ k: 'amt', type: 'money', v: 20000 }] },
  { id: 'keycard_lost', group: '요금', tpl: '카드키 분실 시 {amt} 부과', slots: [{ k: 'amt', type: 'money', v: 20000 }] },
  { id: 'guest_discount', group: '요금', tpl: '숙박객 {name} {n} 할인', repeatable: true, slots: [{ k: 'name', type: 'text', v: '부대시설' }, { k: 'n', type: 'int:%', v: 10 }] },

  /* — 예약·입실 — */
  { id: 'late_call', group: '예약·입실', tpl: '{time} 이후 입실 시 사전 연락 필수', slots: [{ k: 'time', type: 'time', v: '21:00' }] },
  { id: 'late_checkin_ask', group: '예약·입실', tpl: '당일 {time} 이후 입실은 사전 문의 필수', slots: [{ k: 'time', type: 'time', v: '18:00' }] },
  { id: 'late_booking', group: '예약·입실', tpl: '{time} 이후 예약은 확정 불가', slots: [{ k: 'time', type: 'time', v: '21:00' }] },
  { id: 'over_capacity', group: '예약·입실', tpl: '최대 인원 초과 시 입실 불가', slots: [] },
  { id: 'sameday_refund', group: '예약·입실', tpl: '당일 예약·취소 환불 불가', slots: [] },
  { id: 'no_visitor', group: '예약·입실', tpl: '예약자 외 방문객 및 반려동물 출입 금지', slots: [] },

  /* — 객실 이용 — */
  { id: 'quiet', group: '객실 이용', tpl: '{time} 이후 고성방가 자제', slots: [{ k: 'time', type: 'time', v: '22:00' }] },
  { id: 'nonsmoking', group: '객실 이용', tpl: '전 구역 금연 · 지정 외부구역만 흡연 가능', slots: [] },
  { id: 'checkout_clean', group: '객실 이용', tpl: '퇴실 시 설거지·분리수거 필수', slots: [] },
  { id: 'power_off', group: '객실 이용', tpl: '퇴실 전 인덕션·에어컨·보일러 전원 OFF · 카드키 반납', slots: [] },
  { id: 'no_takeout', group: '객실 이용', tpl: '실내화·가운·타월 등 객실 물품 외부 반출 금지', slots: [] },
  { id: 'no_pan_cook', group: '객실 이용', tpl: '객실 내 프라이팬 고기 조리 금지', slots: [] },
  { id: 'own_grill', group: '객실 이용', tpl: '개인 그릴·숯 반입 불가', slots: [] },
  { id: 'no_bath_bomb', group: '객실 이용', tpl: '입욕제 사용 불가', slots: [] },
  { id: 'repair_charge', group: '객실 이용', tpl: '기계 고장 시 변상 및 청소비 청구', slots: [] },

  /* — 시설 안내 — */
  { id: 'wifi', group: '시설 안내', tpl: '전 객실 와이파이 제공', slots: [] },
  { id: 'ott', group: '시설 안내', tpl: '{name} 시청 가능 (개별 ID · 유료 콘텐츠 별도 결제)', repeatable: true, slots: [{ k: 'name', type: 'text', v: '넷플릭스' }] },
  { id: 'aircon_ctrl', group: '시설 안내', tpl: '냉난방 개별 조절 (카드키 제거 시 에어컨만 OFF)', slots: [] },
  { id: 'not_provided', group: '시설 안내', tpl: '{name} 미비치', repeatable: true, slots: [{ k: 'name', type: 'text', v: '프라이팬' }] },
  { id: 'elevator', group: '시설 안내', tpl: '엘리베이터 {yn}', slots: [{ k: 'yn', type: 'opt:have', v: '보유' }] },
  { id: 'shop_hours', group: '시설 안내', tpl: '{name} 운영 {hours}', repeatable: true, slots: [{ k: 'name', type: 'text', v: '부대 식당' }, { k: 'hours', type: 'range', v: '09:30~22:00' }] },

  /* — 주변·교통 — */
  { id: 'nearby_car', group: '주변·교통', tpl: '{name} 차량 약 {n}', repeatable: true, slots: [{ k: 'name', type: 'text', v: '주변 명소' }, { k: 'n', type: 'int:분', v: 10 }] },
  { id: 'nearby_walk', group: '주변·교통', tpl: '{name} 도보 약 {n}', repeatable: true, slots: [{ k: 'name', type: 'text', v: '편의점' }, { k: 'n', type: 'int:분', v: 1 }] },
  { id: 'bus_stop', group: '주변·교통', tpl: '{name} 하차 후 도보 {n}', repeatable: true, slots: [{ k: 'name', type: 'text', v: '정류장' }, { k: 'n', type: 'int:분', v: 2 }] },
];

export const ruleById = (id: string): RuleDef | undefined => RULECAT.find((r) => r.id === id);

/** Build a fresh instance of a catalogue rule (slots copied so edits stay local). */
export const instantiateRule = (id: string, values: Record<string, string | number> = {}): Rule => {
  const def = ruleById(id);
  if (!def) throw new Error(`unknown rule: ${id}`);
  return {
    id: def.id,
    tpl: def.tpl,
    slots: def.slots.map((s) => ({ ...s, v: values[s.k] ?? s.v })),
  };
};

/** FAQ answers that quote a facility value are templates, not typed text. */
export const FAQ_TPL: Record<string, string> = {
  'Q-0015': '{shared_bbq.이용 시간}에 이용 가능합니다.',
  'Q-0019': '{private_bbq.이용 장소}에서 최대인원까지 가능합니다.',
  'Q-0020': '{shared_pool.온도}로만 운영합니다.',
  'Q-0026': '{shared_pool.이용 시간} 까지 가능합니다.',
  'Q-0039': '{spa.이용 시간}까지 가능합니다.',
  'Q-0018': '{extra_person.유아 연령} 이하는 무료입니다.',
  'Q-0046': '주차장 {parking.주차장} · {parking.주차 대수}입니다.',
};

/** FAQ 분류 → 그 답을 좌우하는 시설. 답이 비어 있을 때 "시설이 꺼져서 비활성"인지
 *  "시설은 켜져 있는데 답변이 아직 없음"인지 구분하는 데 씁니다. */
export const FAQ_BLOCK: Record<string, string> = {
  바베큐: 'shared_bbq',
  개별바베큐: 'private_bbq',
  공용수영장: 'shared_pool',
  개별수영장: 'private_pool',
  스파: 'spa',
  애견동반: 'pet_friendly',
  '캠핑,오토캠핑': 'camping',
  주차장: 'parking',
};

export const PENSIONS: [name: string, meta: string, active: boolean, warn: boolean][] = [
  ['속초 더샵 스파 펜션', '2656 · 28객실 · 강원 속초', true, false],
  ['가평 리버뷰 풀빌라', '1042 · 12객실 · 경기 가평', false, true],
  ['제주 애월 스테이', '3318 · 8객실 · 제주 애월', false, false],
  ['양평 숲속의아침', '0774 · 16객실 · 경기 양평', false, false],
  ['태안 오션가든', '2190 · 21객실 · 충남 태안', false, true],
  ['평창 알펜하우스', '1855 · 9객실 · 강원 평창', false, false],
  ['거제 블루비치', '2903 · 14객실 · 경남 거제', false, false],
  ['홍천 카라반파크', '3471 · 24객실 · 강원 홍천', false, false],
];

export const THEME_DICT = [
  {
    master: '공용수영장(냉수)',
    rows: [
      { k: 'N', v: '수영장' },
      { k: '여', v: '실외수영장' },
      { k: '야', v: '야외수영장(냉수)' },
    ],
  },
  {
    master: '가족',
    rows: [
      { k: 'N', v: '가족실' },
      { k: '여', v: '가족추천' },
      { k: '야', v: '패밀리' },
    ],
  },
  {
    master: '스파',
    rows: [
      { k: 'N', v: '스파/월풀' },
      { k: '여', v: '스파' },
      { k: '야', v: '스파(제트)' },
    ],
  },
];
