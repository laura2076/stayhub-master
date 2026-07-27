import type { BlockField, ChannelKey, ComputedKind, FieldType, Rule, RuleDef } from './types';

export const CHANKEYS: [ChannelKey, string][] = [
  ['a', '네이버'],
  ['b', '여기어때'],
  ['c', '야놀자'],
];

/* ── 시설 필드의 형식 ───────────────────────────────────────────────────────
   명시한 짝이 먼저, 다음은 이름 규칙, 다음은 낱말 규칙. 자유 입력은 이름으로
   지정해야만 도달합니다 — 나머지는 전부 선택지로 떨어집니다. */

export const FTYPE: Record<string, FieldType> = {
  'checkin_checkout|체크인': 'time',
  'checkin_checkout|체크인 마감': 'time',
  'checkin_checkout|체크아웃': 'time',
  'extra_person|추가요금': 'money',
  'extra_person|성인 연령': 'int:세',
  'extra_person|아동 연령': 'int:세',
  'extra_person|유아 연령': 'int:개월',
  'transportation|지번 주소': 'text',
  'transportation|도로명 주소': 'text',
  'parking|주차장': 'opt:parking',
  'parking|주차 대수': 'opt:parkcnt',
  'parking|전기차 충전': 'opt:yn',
};

export const OPTLIST: Record<string, string[]> = {
  place: ['루프탑', '개별 테라스', '1층 정원', '전용 데크', '실내 바베큐장', '캠핑장 내'],
  kit: ['그릴+집게+가위', '그릴+집게+가위+숯', '그릴만 제공', '숯·토치 별도 판매'],
  temp: ['냉수', '미온수', '온수'],
  spa: ['제트스파', '월풀', '반신욕조', '노천탕'],
  bbqform: ['숯불', '가스그릴', '전기그릴', '솥뚜껑'],
  form: ['원룸형', '분리형', '복층형'],
  onoff: ['사용', '사용안함', '입실불가'],
  wear: ['수영복 필수', '래시가드 허용', '자유 복장'],
  scope: ['전 객실', '숙박객 전체', '3층 객실', '4~7층 객실', '7층 객실', '캠핑장 이용객'],
  parking: ['보유', '없음', '인근 공영주차장'],
  parkcnt: ['객실당 1대', '객실당 2대', '선착순', '제한 없음'],
  yn: ['가능', '불가'],
  have: ['보유', '없음'],
  weather: ['우천', '강풍', '동계', '폭염', '태풍'],
  season: ['하절기', '동절기', '연중', '성수기'],
  tempctrl: ['직접 조절 가능', '프론트 요청', '고정'],
  petsize: ['소형견', '중형견', '대형견'],
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
  '동반 크기': 'opt:petsize',
};

export const FREETEXT = ['주의사항', '특이사항', '안내', '기타', '설명', '교통', '시설', '주소'];

/** 전사 안내 문구 목록 — 자유 문장 대신 이 패턴에서 고르고 조각만 채웁니다. */
export const RULECAT: RuleDef[] = [
  { id: 'weather_off', group: '이용 조건', tpl: '{cond} 시 이용 불가', repeatable: true, slots: [{ k: 'cond', type: 'opt:weather', v: '우천' }] },
  { id: 'season_open', group: '이용 조건', tpl: '{season} 운영', slots: [{ k: 'season', type: 'opt:season', v: '하절기' }] },
  { id: 'winter_prep', group: '이용 조건', tpl: '{n} 이용 시 실외 방한 준비 필요', slots: [{ k: 'n', type: 'int:월', v: 2 }] },
  { id: 'prep_time', group: '이용 조건', tpl: '준비 소요시간 {n}', slots: [{ k: 'n', type: 'int:분', v: 0 }] },
  { id: 'advance', group: '이용 조건', tpl: '이용 {n} 전까지 사전 신청 필수', slots: [{ k: 'n', type: 'int:일', v: 1 }] },
  { id: 'first_come', group: '이용 조건', tpl: '선착순 예약제', slots: [] },
  { id: 'wear', group: '이용 조건', tpl: '이용 복장 {wear}', slots: [{ k: 'wear', type: 'opt:wear', v: '수영복 필수' }] },
  { id: 'temp_ctrl', group: '이용 조건', tpl: '온도 {mode}', slots: [{ k: 'mode', type: 'opt:tempctrl', v: '직접 조절 가능' }] },

  { id: 'guardian', group: '안전', tpl: '{n} 이하 보호자 동반 필수', slots: [{ k: 'n', type: 'int:세', v: 14 }] },
  { id: 'diaper', group: '안전', tpl: '{n} 이하 물놀이용 기저귀 착용 필수', slots: [{ k: 'n', type: 'int:개월', v: 36 }] },
  { id: 'no_drink', group: '안전', tpl: '음주 후 이용 금지', slots: [] },
  { id: 'unmanned', group: '안전', tpl: '무인 운영 · 안전사고는 이용자 본인 책임', slots: [] },
  { id: 'no_lean', group: '안전', tpl: '창문·테라스에 기대거나 올라가지 마세요', slots: [] },
  { id: 'no_fire', group: '안전', tpl: '캔들·폭죽·부탄가스 등 화기류 사용 금지', slots: [] },
  { id: 'cctv', group: '안전', tpl: '공용구역 CCTV 촬영 중', slots: [] },

  { id: 'towel_rent', group: '요금', tpl: '타월 대여 1장 {amt}', slots: [{ k: 'amt', type: 'money', v: 2000 }] },
  { id: 'late_out', group: '요금', tpl: '퇴실 지연 시 사전 요청 · {n} 초과 시 {amt} 추가', slots: [{ k: 'n', type: 'int:시간', v: 1 }, { k: 'amt', type: 'money', v: 50000 }] },
  { id: 'infant_free', group: '요금', tpl: '{n} 이상 {amt}', slots: [{ k: 'n', type: 'int:개월', v: 36 }, { k: 'amt', type: 'money', v: 30000 }] },
  { id: 'bedding_skip', group: '요금', tpl: '이불 미추가 시 {amt}', slots: [{ k: 'amt', type: 'money', v: 20000 }] },
  { id: 'keycard_lost', group: '요금', tpl: '카드키 분실 시 {amt} 부과', slots: [{ k: 'amt', type: 'money', v: 20000 }] },
  { id: 'guest_discount', group: '요금', tpl: '숙박객 {name} {n} 할인', repeatable: true, slots: [{ k: 'name', type: 'text', v: '부대시설' }, { k: 'n', type: 'int:%', v: 10 }] },
  { id: 'pet_fee', group: '요금', tpl: '반려동물 1마리당 {amt}', slots: [{ k: 'amt', type: 'money', v: 20000 }] },

  { id: 'late_call', group: '예약·입실', tpl: '{time} 이후 입실 시 사전 연락 필수', slots: [{ k: 'time', type: 'time', v: '21:00' }] },
  { id: 'late_checkin_ask', group: '예약·입실', tpl: '당일 {time} 이후 입실은 사전 문의 필수', slots: [{ k: 'time', type: 'time', v: '18:00' }] },
  { id: 'late_booking', group: '예약·입실', tpl: '{time} 이후 예약은 확정 불가', slots: [{ k: 'time', type: 'time', v: '21:00' }] },
  { id: 'over_capacity', group: '예약·입실', tpl: '최대 인원 초과 시 입실 불가', slots: [] },
  { id: 'sameday_refund', group: '예약·입실', tpl: '당일 예약·취소 환불 불가', slots: [] },
  { id: 'no_visitor', group: '예약·입실', tpl: '예약자 외 방문객 및 반려동물 출입 금지', slots: [] },

  { id: 'quiet', group: '객실 이용', tpl: '{time} 이후 고성방가 자제', slots: [{ k: 'time', type: 'time', v: '22:00' }] },
  { id: 'nonsmoking', group: '객실 이용', tpl: '전 구역 금연 · 지정 외부구역만 흡연 가능', slots: [] },
  { id: 'checkout_clean', group: '객실 이용', tpl: '퇴실 시 설거지·분리수거 필수', slots: [] },
  { id: 'power_off', group: '객실 이용', tpl: '퇴실 전 인덕션·에어컨·보일러 전원 OFF · 카드키 반납', slots: [] },
  { id: 'no_takeout', group: '객실 이용', tpl: '실내화·가운·타월 등 객실 물품 외부 반출 금지', slots: [] },
  { id: 'no_pan_cook', group: '객실 이용', tpl: '객실 내 프라이팬 고기 조리 금지', slots: [] },
  { id: 'own_grill', group: '객실 이용', tpl: '개인 그릴·숯 반입 불가', slots: [] },
  { id: 'no_bath_bomb', group: '객실 이용', tpl: '입욕제 사용 불가', slots: [] },
  { id: 'repair_charge', group: '객실 이용', tpl: '기계 고장 시 변상 및 청소비 청구', slots: [] },
  { id: 'pet_leash', group: '객실 이용', tpl: '실내외 이동 시 목줄·이동장 필수', slots: [] },
  { id: 'pet_bed', group: '객실 이용', tpl: '반려동물 침대·소파 올라감 금지', slots: [] },

  { id: 'wifi', group: '시설 안내', tpl: '전 객실 와이파이 제공', slots: [] },
  { id: 'ott', group: '시설 안내', tpl: '{name} 시청 가능 (개별 ID · 유료 콘텐츠 별도 결제)', repeatable: true, slots: [{ k: 'name', type: 'text', v: '넷플릭스' }] },
  { id: 'aircon_ctrl', group: '시설 안내', tpl: '냉난방 개별 조절 (카드키 제거 시 에어컨만 OFF)', slots: [] },
  { id: 'not_provided', group: '시설 안내', tpl: '{name} 미비치', repeatable: true, slots: [{ k: 'name', type: 'text', v: '프라이팬' }] },
  { id: 'elevator', group: '시설 안내', tpl: '엘리베이터 {yn}', slots: [{ k: 'yn', type: 'opt:have', v: '보유' }] },
  { id: 'shop_hours', group: '시설 안내', tpl: '{name} 운영 {hours}', repeatable: true, slots: [{ k: 'name', type: 'text', v: '부대 식당' }, { k: 'hours', type: 'range', v: '09:30~22:00' }] },
  { id: 'power_limit', group: '시설 안내', tpl: '자리당 전기 {n} 까지', slots: [{ k: 'n', type: 'int:W', v: 600 }] },

  { id: 'nearby_car', group: '주변·교통', tpl: '{name} 차량 약 {n}', repeatable: true, slots: [{ k: 'name', type: 'text', v: '주변 명소' }, { k: 'n', type: 'int:분', v: 10 }] },
  { id: 'nearby_walk', group: '주변·교통', tpl: '{name} 도보 약 {n}', repeatable: true, slots: [{ k: 'name', type: 'text', v: '편의점' }, { k: 'n', type: 'int:분', v: 1 }] },
  { id: 'bus_stop', group: '주변·교통', tpl: '{name} 하차 후 도보 {n}', repeatable: true, slots: [{ k: 'name', type: 'text', v: '정류장' }, { k: 'n', type: 'int:분', v: 2 }] },
];

/* ── 전사 시설 목록 ─────────────────────────────────────────────────────────
   숙소에 시설을 새로 들일 때 쓰는 정의입니다. 시설이 **어느 속성으로 객실을
   가려내는지**와 **어떤 필드가 자동 계산인지**를 여기서 함께 가져오지 않으면,
   추가한 시설은 "미입력"이라고 적힌 자유 텍스트로 남아 영영 계산되지 않습니다.
   attr이 이 숙소에 없으면 속성도 함께 붙습니다 — 그래야 객실 표에 열이 생깁니다. */

export type BlockDef = {
  label: string;
  attr?: string;
  codes?: string[];
  /** 속성을 새로 붙일 때 쓸 숙소 전체값. */
  base?: string;
  computed?: Record<string, ComputedKind>;
  fields: BlockField[];
};

const FEE_ROOMS: Record<string, ComputedKind> = { '이용 객실': 'rooms', '이용 요금': 'fee' };

export const BLOCKCAT: Record<string, BlockDef> = {
  shared_bbq: {
    label: '공용 BBQ',
    attr: 'bbq',
    codes: ['shared_gas', 'shared_charcoal', 'shared_lid'],
    base: 'shared_gas',
    computed: { ...FEE_ROOMS, '바베큐 형태': 'optionLabel' },
    fields: [['이용 객실', ''], ['이용 장소', '루프탑'], ['바베큐 형태', ''], ['제공 구성', '그릴+집게+가위'], ['이용 요금', ''], ['이용 시간', '17:00~21:00']],
  },
  private_bbq: {
    label: '개별 BBQ',
    attr: 'bbq',
    codes: ['private_electric', 'private_charcoal'],
    base: 'shared_gas',
    computed: { ...FEE_ROOMS, '바베큐 형태': 'optionLabel' },
    fields: [['이용 객실', ''], ['이용 장소', '개별 테라스'], ['바베큐 형태', ''], ['제공 구성', '그릴+집게+가위'], ['이용 요금', ''], ['이용 시간', '15:00~22:00']],
  },
  spa: {
    label: '스파',
    attr: 'spa',
    codes: ['jet2', 'jet4', 'whirl'],
    base: 'none',
    computed: { '이용 객실': 'rooms', 수용인원: 'capacity' },
    fields: [['이용 객실', ''], ['스파 형태', '제트스파'], ['수용인원', ''], ['이용 요금', '무료'], ['이용 시간', '입실~23시 (오전 이용 불가)']],
  },
  private_pool: {
    label: '개별 수영장',
    attr: 'private_pool',
    codes: ['cold', 'warm'],
    base: 'none',
    computed: FEE_ROOMS,
    fields: [['이용 객실', ''], ['이용 요금', ''], ['온도', '냉수'], ['크기', '수심 1.1m 이상'], ['이용 시간', '입실~22:00 (오전 이용 불가)']],
  },
  pet_friendly: {
    label: '반려동물',
    attr: 'pet',
    codes: ['small', 'medium'],
    base: 'none',
    computed: FEE_ROOMS,
    fields: [['이용 객실', ''], ['이용 요금', ''], ['동반 크기', '중형견']],
  },
  camping: {
    label: '캠핑 · 오토캠핑',
    attr: 'camp_site',
    codes: ['auto', 'tent', 'caravan'],
    base: 'none',
    computed: FEE_ROOMS,
    fields: [['이용 객실', ''], ['이용 요금', ''], ['이용 시간', '14:00~11:00']],
  },
  /* 객실을 가려내지 않고 숙소 전체를 덮는 시설 — 속성이 붙지 않습니다. */
  shared_pool: { label: '공용 수영장', fields: [['이용 객실', '숙박객 전체'], ['온도', '냉수'], ['이용 요금', '무료'], ['이용 시간', '15:00 ~ 21:00']] },
  playground: { label: '어린이 놀이터', fields: [['이용 시간', '09:00~18:00']] },
  rooftop_bar: { label: '루프탑 바', fields: [['이용 장소', '루프탑'], ['이용 시간', '18:00~23:00']] },
  karaoke: { label: '노래방', fields: [['이용 요금', '무료'], ['이용 시간', '18:00~23:00']] },
  seminar_room: { label: '세미나실', fields: [['이용 요금', '무료'], ['이용 시간', '09:00~18:00']] },
  ev_charger: { label: '전기차 충전', fields: [['전기차 충전', '가능'], ['이용 요금', '무료']] },
  pickup: { label: '픽업', fields: [['이용 시간', '15:00~18:00'], ['이용 요금', '무료']] },
  parking: { label: '주차', fields: [['주차장', '보유'], ['주차 대수', '객실당 1대'], ['전기차 충전', '불가']] },
};

/** 시설 카드에 넣을 수 있는 항목들. 자동 계산 필드는 여기 없습니다 — 사람이 넣는 게 아니라
 *  시설 정의가 정하는 것이라서요. */
export const FIELDCAT: string[] = [
  '이용 장소',
  '제공 구성',
  '이용 시간',
  '이용 요금',
  '운영 기간',
  '온도',
  '크기',
  '형태',
  '대상',
  '이용 복장',
  '동반 크기',
  '조식 서비스',
  '사용 여부',
  '주차장',
  '주차 대수',
  '전기차 충전',
  '지번 주소',
  '도로명 주소',
];

/** 객실마다 다를 수 있는 항목.
 *
 *  숙소마다 따로 켜 두는 설정이 아니라 **전사 한 곳**에서 정합니다. 1000개 숙소가
 *  제각각이라 항목 이름은 같은데 어떤 곳은 층마다 다르고 어떤 곳은 아닙니다. 여기서
 *  "이 항목은 원래 갈릴 수 있는 종류"만 정해 두면, 실제로 갈렸는지는 객실 값이 답합니다.
 *
 *  체크인 시각이나 주소처럼 숙소 하나에 하나뿐인 항목은 여기 없습니다 — 열어 두면
 *  객실마다 체크인이 다른 숙소가 생기고, 그건 판매 사이트가 받지 못합니다. */
export const PERROOM_FIELDS: string[] = ['이용 장소', '이용 시간', '이용 요금', '제공 구성', '온도', '크기', '형태', '이용 복장'];

export const ruleById = (id: string): RuleDef | undefined => RULECAT.find((r) => r.id === id);

export const instantiateRule = (id: string, values: Record<string, string | number> = {}): Rule => {
  const def = ruleById(id);
  if (!def) throw new Error(`unknown rule: ${id}`);
  return { id: def.id, tpl: def.tpl, slots: def.slots.map((s) => ({ ...s, v: values[s.k] ?? s.v })) };
};

/** FAQ 분류 → 그 답을 좌우하는 시설. 답이 비었을 때 "시설이 꺼져서"인지
 *  "아직 안 썼는지"를 가릅니다. */
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
