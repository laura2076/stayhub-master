import type { ChannelKey, FieldType, Rule, RuleDef } from './types';

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
