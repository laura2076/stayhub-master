import { instantiateRule as R } from './catalog';
import { channelRows, deriveBlocks } from './derive';
import type { AttrValue, Block, ChannelRowId, ChannelValues, Faq, HistoryEntry, MasterState, Property, Room } from './types';

/** 세 숙소가 **서로 다른 모양**으로 들어 있습니다 — 구조가 한 곳에 맞춰져 있지 않다는 증거입니다.
 *  속초는 바베큐·스파·공용수영장, 가평은 개별풀·애견동반, 홍천은 캠핑장입니다.
 *  객실이 가지는 값은 타입이 아니라 `attrs`가 정하므로 열·편집·연쇄 갱신이 모두 따라옵니다. */

const room = (
  code: string,
  name: string,
  floor: number,
  area: string,
  form: string,
  bed: string,
  tag: string,
  values: Record<string, AttrValue> = {},
): Room => ({ code, name, floor, area, form, bed, tag, values });

/* ── 속초 더샵 스파 펜션 (2656) — 28객실 · 바베큐 · 스파 · 공용수영장 ───────── */

const SOKCHO_NO_TERRACE = ['A402', 'B402', 'A501', 'B501', 'A602', 'A603', 'B602', 'B603'];
const SOKCHO_SEQ: [string, string][] = [
  ['27758', 'A701'], ['27759', 'A702'], ['27760', 'B701'], ['27761', 'B702'],
  ['27734', 'A301'], ['27735', 'A302'], ['27736', 'A303'], ['27737', 'B301'], ['27738', 'B302'], ['27739', 'B303'],
  ['27740', 'A401'], ['27741', 'A402'], ['27742', 'A403'], ['27743', 'B401'], ['27744', 'B402'], ['27745', 'B403'],
  ['27746', 'A501'], ['27747', 'A502'], ['27748', 'A503'], ['27749', 'B501'], ['27750', 'B502'], ['27751', 'B503'],
  ['27752', 'A601'], ['27753', 'A602'], ['27754', 'A603'], ['27755', 'B601'], ['27756', 'B602'], ['27757', 'B603'],
];

const sokchoRooms = (): Room[] =>
  SOKCHO_SEQ.map(([code, name]) => {
    const floor = Number(name[1]);
    const seven = floor === 7;
    const three = floor === 3;
    const noTer = SOKCHO_NO_TERRACE.includes(name);
    /** 숙소 기본값과 다른 것만 적습니다 — 나머지는 기본값을 그대로 씁니다. */
    const values: Record<string, AttrValue> = {};
    if (three) values.bbq = 'private_electric';
    if (seven) {
      values.capacity_base = 4;
      values.capacity_max = 6;
      values.spa = 'jet4';
    }
    /** 기본값(set3)과 같은 객실은 아예 적지 않습니다 — 적어 두면 나중에 전체값을 바꿔도
     *  이 객실만 안 따라옵니다. */
    const set = seven ? 'set2' : name === 'A301' ? 'set4' : noTer ? 'set1' : 'set3';
    if (set !== 'set3') values.amenity_set = set;
    return room(
      code,
      name,
      floor,
      seven ? '92.56㎡ (28평)' : three ? '66.12㎡ (20평)' : '59.50㎡ (18평)',
      seven ? '분리형' : '원룸형',
      seven ? '킹침대 2' : '킹침대 1',
      three ? '개별BBQ,와이드테라스,오션뷰' : noTer ? '오션뷰' : '개별테라스,오션뷰',
      values,
    );
  });

const sokchoBlocks = (): Block[] => [
  {
    key: 'shared_bbq',
    label: '공용 BBQ',
    st: 'used',
    chanN: 3,
    faqN: 3,
    memberOf: { attr: 'bbq', codes: ['shared_gas', 'shared_charcoal', 'shared_lid'] },
    computed: { '이용 객실': 'rooms', '이용 요금': 'fee', '바베큐 형태': 'optionLabel' },
    fields: [
      ['이용 객실', ''],
      ['이용 장소', '루프탑'],
      ['바베큐 형태', ''],
      ['제공 구성', '그릴+집게+가위'],
      ['이용 요금', ''],
      ['이용 시간', '17:00~21:00'],
    ],
    rules: [
      R('season_open', { season: '하절기' }),
      R('weather_off', { cond: '동계' }),
      R('weather_off', { cond: '강풍' }),
      R('prep_time', { n: 0 }),
      R('first_come'),
      R('advance', { n: 1 }),
      R('no_pan_cook'),
    ],
  },
  {
    key: 'private_bbq',
    label: '개별 BBQ',
    st: 'used',
    chanN: 3,
    faqN: 2,
    memberOf: { attr: 'bbq', codes: ['private_electric', 'private_charcoal'] },
    computed: { '이용 객실': 'rooms', '이용 요금': 'fee', '바베큐 형태': 'optionLabel' },
    fields: [
      ['이용 객실', ''],
      ['이용 장소', '개별 테라스'],
      ['바베큐 형태', ''],
      ['제공 구성', '그릴+집게+가위'],
      ['이용 요금', ''],
      ['이용 시간', '15:00~22:00'],
    ],
    rules: [
      R('season_open', { season: '하절기' }),
      R('winter_prep', { n: 2 }),
      R('advance', { n: 1 }),
      R('own_grill'),
      R('weather_off', { cond: '우천' }),
      R('weather_off', { cond: '강풍' }),
    ],
  },
  {
    key: 'shared_pool',
    label: '공용 수영장',
    st: 'used',
    chanN: 3,
    faqN: 8,
    fields: [
      ['이용 객실', '숙박객 전체'],
      ['운영 기간', '26년 7월 11일 ~ 8월 17일'],
      ['온도', '냉수'],
      ['이용 요금', '무료'],
      ['이용 시간', '15:30 ~ 21:00'],
      ['크기', '수심 1.2m 이상 · 7층 옥상'],
    ],
    rules: [
      R('wear', { wear: '수영복 필수' }),
      R('no_drink'),
      R('towel_rent', { amt: 2000 }),
      R('unmanned'),
      R('guardian', { n: 14 }),
      R('diaper', { n: 36 }),
    ],
  },
  {
    key: 'spa',
    label: '스파',
    st: 'used',
    chanN: 3,
    faqN: 2,
    memberOf: { attr: 'spa', codes: ['jet2', 'jet4', 'whirl'] },
    computed: { '이용 객실': 'rooms', 수용인원: 'capacity' },
    fields: [
      ['이용 객실', ''],
      ['스파 형태', '제트스파'],
      ['수용인원', ''],
      ['이용 요금', '무료'],
      ['이용 시간', '입실~23시 (오전 이용 불가)'],
    ],
    rules: [R('wear', { wear: '수영복 필수' }), R('no_bath_bomb'), R('temp_ctrl', { mode: '직접 조절 가능' }), R('repair_charge')],
  },
  {
    key: 'checkin_checkout',
    label: '체크인 / 체크아웃',
    st: 'used',
    chanN: 3,
    faqN: 2,
    fields: [
      ['체크인', '15:30'],
      ['체크인 마감', '22:00'],
      ['체크아웃', '11:00'],
    ],
    rules: [R('late_call', { time: '21:00' }), R('late_out', { n: 1, amt: 50000 })],
  },
  {
    key: 'extra_person',
    label: '추가 인원',
    st: 'used',
    chanN: 3,
    faqN: 3,
    computed: { '기준 인원': 'capacityBase', '최대 인원': 'capacityMax' },
    fields: [
      ['기준 인원', ''],
      ['최대 인원', ''],
      ['성인 연령', '8세 이상'],
      ['아동 연령', '8세'],
      ['유아 연령', '36개월'],
    ],
    rules: [
      R('infant_free', { n: 36, amt: 30000 }),
      R('bedding_skip', { amt: 20000 }),
      R('keycard_lost', { amt: 20000 }),
      R('over_capacity'),
    ],
  },
  {
    key: 'parking',
    label: '주차',
    st: 'used',
    chanN: 3,
    faqN: 2,
    fields: [
      ['주차장', '보유'],
      ['주차 대수', '객실당 1대'],
      ['전기차 충전', '불가'],
    ],
  },
  {
    key: 'special_notes',
    label: '특이사항 · 이용 정책',
    st: 'used',
    chanN: 3,
    faqN: 0,
    fields: [],
    rules: [
      R('checkout_clean'),
      R('power_off'),
      R('quiet', { time: '22:00' }),
      R('no_lean'),
      R('no_takeout'),
      R('no_fire'),
      R('no_visitor'),
      R('cctv'),
      R('nonsmoking'),
      R('sameday_refund'),
      R('late_checkin_ask', { time: '18:00' }),
      R('late_booking', { time: '21:00' }),
    ],
  },
  {
    key: 'item_facilities',
    label: '숙소 시설 안내',
    st: 'used',
    chanN: 3,
    faqN: 2,
    fields: [],
    rules: [
      R('wifi'),
      R('ott', { name: '넷플릭스' }),
      R('aircon_ctrl'),
      R('not_provided', { name: '프라이팬' }),
      R('elevator', { yn: '보유' }),
      R('shop_hours', { name: '코리아횟집(1~2층)', hours: '09:30~22:00' }),
      R('guest_discount', { name: '코리아횟집 회값', n: 10 }),
      R('nearby_walk', { name: 'GS25', n: 1 }),
      R('nearby_walk', { name: '세븐일레븐', n: 5 }),
    ],
  },
  {
    key: 'transportation',
    label: '교통 · 주변',
    st: 'used',
    chanN: 3,
    faqN: 0,
    fields: [
      ['지번 주소', '강원 속초시 장사동 577-33'],
      ['도로명 주소', '강원 속초시 장사항해안길 21'],
    ],
    rules: [
      R('bus_stop', { name: '장사항 정류장', n: 2 }),
      R('nearby_car', { name: '영랑호', n: 4 }),
      R('nearby_car', { name: '등대해수욕장', n: 9 }),
      R('nearby_car', { name: '속초중앙시장', n: 9 }),
      R('nearby_car', { name: '속초해수욕장', n: 10 }),
      R('nearby_car', { name: '아바이마을', n: 12 }),
      R('nearby_car', { name: '설악산', n: 23 }),
    ],
  },
  { key: 'private_pool', label: '개별 수영장', st: 'off', chanN: 3, faqN: 8, fields: [['사용 여부', '사용안함']] },
  { key: 'pet_friendly', label: '반려동물', st: 'off', chanN: 3, faqN: 3, fields: [['사용 여부', '입실불가']] },
  { key: 'pickup', label: '픽업', st: 'off', chanN: 3, faqN: 0, fields: [['사용 여부', '사용안함']] },
  { key: 'camping', label: '캠핑 · 오토캠핑', st: 'none', chanN: 3, faqN: 5, fields: [] },
  { key: 'rooftop_bar', label: '루프탑 바', st: 'none', chanN: 2, faqN: 0, fields: [] },
  { key: 'playground', label: '어린이 놀이터', st: 'none', chanN: 3, faqN: 2, fields: [] },
  { key: 'karaoke', label: '노래방', st: 'none', chanN: 2, faqN: 1, fields: [] },
  { key: 'seminar_room', label: '세미나실', st: 'none', chanN: 2, faqN: 0, fields: [] },
  { key: 'ev_charger', label: '전기차 충전', st: 'none', chanN: 3, faqN: 1, fields: [] },
];

const FAQ_TPL: Record<string, string> = {
  'Q-0015': '{shared_bbq.이용 시간}에 이용 가능합니다.',
  'Q-0019': '{private_bbq.이용 장소}에서 최대인원까지 가능합니다.',
  'Q-0020': '{shared_pool.온도}로만 운영합니다.',
  'Q-0026': '{shared_pool.이용 시간} 까지 가능합니다.',
  'Q-0039': '{spa.이용 시간}까지 가능합니다.',
  'Q-0018': '{extra_person.유아 연령} 이하는 무료입니다.',
  /* 초과입실 — 인원을 숫자로 넣게 한 이상, 답변도 그 숫자에서 만들어져야 합니다. */
  'Q-0011': '객실 최대 인원은 {extra_person.최대 인원}입니다. 초과 입실은 불가합니다.',
  'Q-0012': '초과 입실은 불가합니다. 기준 인원은 {extra_person.기준 인원}, 최대 인원은 {extra_person.최대 인원}입니다.',
  'Q-0013': '객실 최대 인원은 {extra_person.최대 인원}입니다. 그 이상은 받지 않습니다.',
  'Q-0046': '주차장 {parking.주차장} · {parking.주차 대수}입니다.',
};

const SOKCHO_FAQ: [string, string, string, string][] = [
  ['공통', 'Q-0001', '체크인 전, 체크아웃 후 짐 보관이 가능한가요?', '짐 보관 및 음식 보관(냉장 보관) 가능합니다.'],
  ['공통', 'Q-0002', '펜션으로 택배를 보낼 경우, 대리 수령이 가능한가요?', '가능합니다.'],
  ['공통', 'Q-0003', '카드 단말기가 있나요?', '구비되어 있습니다.'],
  ['공통', 'Q-0004', '현금 지불 또는 계좌 이체한 경우에 현금영수증 발급 가능한가요?', '가능합니다.'],
  ['공통', 'Q-0005', '객실 내 선풍기가 구비되어 있나요?', '구비되어 있지 않습니다.'],
  ['공통', 'Q-0006', '객실 내 전기장판이 구비되어 있나요?', '구비되어 있지 않습니다.'],
  ['공통', 'Q-0007', '휠체어 이용이 가능한가요?', '가능합니다.'],
  ['공통', 'Q-0008', '휠체어나 노약자 사용에 있어 참고 할만한 주의 사항이 있나요?', '객실 내 스파 이용 시 미끄럼 주의 필요합니다.'],
  ['오션뷰', 'Q-0009', '객실 안에서 일출 조망이 가능한가요?', '가능합니다.'],
  ['난방', 'Q-0010', '객실 난방 시설은 어떻게 되어 있나요?', '개별난방입니다.'],
  ['초과입실', 'Q-0011', '예외로 객실 최대 인원수보다 초과해서 입실할 수 있나요?', ''],
  ['초과입실', 'Q-0012', '객실 최대 인원 초과 입실은 어떤 경우에 가능한가요?', ''],
  ['초과입실', 'Q-0013', '객실 최대 인원 초과 입실은 몇 명까지 가능한가요?', ''],
  ['바베큐', 'Q-0014', '예외로 바비큐 신청 마감 시간 이후에도 이용이 가능한가요?', '입실일 1일전까지 사전 신청 해주셔야 합니다.'],
  ['바베큐', 'Q-0015', '예외로 바비큐 이용 마감 시간 이후에도 이용이 가능한가요?', ''],
  ['바베큐', 'Q-0016', '야외바베큐일 경우, 천막이 설치되어 있나요?', '우천 및 기상 악화 시 이용 불가합니다.'],
  ['바베큐', 'Q-0017', '바베큐 이용 시에 조개구이를 해도 되나요?', '불가합니다.'],
  ['바베큐', 'Q-0018', '바베큐를 사용하지 않는 영유아 바비큐 비용이 발생하나요?', ''],
  ['개별바베큐', 'Q-0019', '객실을 두 개 이상 예약하신 경우, 한 공간에서 바베큐를 함께 이용할 수 있나요?', ''],
  ['공용수영장', 'Q-0020', '공용수영장 미온수 운영 중인가요?', ''],
  ['공용수영장', 'Q-0021', '공용수영장 수질 관리는 어떻게 하나요?', '여과기 사용합니다.'],
  ['공용수영장', 'Q-0022', '공용수영장 청소 시 약품을 사용하나요?', '소독약 사용합니다.'],
  ['공용수영장', 'Q-0023', '펜션 내 에어펌프가 구비되어 있나요?', '구비되어 있습니다.'],
  ['공용수영장', 'Q-0024', '튜브를 대여할 수 있나요?', '구비되어 있습니다.'],
  ['공용수영장', 'Q-0025', '공용수영장 물은 얼마나 자주 교체하나요?', '3~4일 주기로 교체합니다.'],
  ['공용수영장', 'Q-0026', '공용수영장 이용 시간 마감 후에 이용할 수 있나요?', ''],
  ['공용수영장', 'Q-0027', '공용수영장 퇴실일 오전에도 이용할 수 있나요?', '퇴실 오전에는 불가하고, 연박의 경우 사전 문의가 필요합니다.'],
  ['개별수영장', 'Q-0028', '개별수영장 미온수 운영 중인가요?', ''],
  ['개별수영장', 'Q-0029', '개별수영장 수질 관리는 어떻게 하나요?', ''],
  ['개별수영장', 'Q-0030', '개별수영장 청소 시 약품을 사용하나요?', ''],
  ['개별수영장', 'Q-0031', '객실 내 에어펌프가 구비되어 있나요?', ''],
  ['개별수영장', 'Q-0032', '객실 내 튜브를 제공하나요?', ''],
  ['개별수영장', 'Q-0033', '개별수영장 물은 얼마나 자주 교체하나요?', ''],
  ['개별수영장', 'Q-0034', '개별수영장 이용 시간 마감 후에 이용할 수 있나요?', ''],
  ['개별수영장', 'Q-0035', '개별수영장 퇴실일 오전에도 이용할 수 있나요?', ''],
  ['애견동반', 'Q-0036', '예외로 애견 마릿수를 초과하여 동반할 수 있나요?', ''],
  ['애견동반', 'Q-0037', '예외로 애견이 무게 제한을 초과해도 동반할 수 있나요?', ''],
  ['애견동반', 'Q-0038', '애견 동반 가능 객실에 제한이 있거나 예외 사항이 있나요?', ''],
  ['스파', 'Q-0039', '예외로 스파 이용 시간 마감 후에 이용할 수 있나요?', ''],
  ['스파', 'Q-0040', '스파 퇴실일 오전에도 이용할 수 있나요?', '불가합니다.'],
  ['캠핑,오토캠핑', 'Q-0041', '캠핑장에서 릴선을 사용할 수 있나요?', ''],
  ['캠핑,오토캠핑', 'Q-0042', '캠핑장 이용 시 전기 와트(W) 제한이 있나요?', ''],
  ['캠핑,오토캠핑', 'Q-0043', '캠핑장에서 전기 난방기구를 사용할 수 있나요?', ''],
  ['캠핑,오토캠핑', 'Q-0044', '캠핑장 전기 난방 기구 사용 시 비용이 발생하나요?', ''],
  ['캠핑,오토캠핑', 'Q-0045', '텐트 외 숙박 시설 사용이 가능한가요?', ''],
  ['주차장', 'Q-0046', '부지 내 주차 가능 대수를 초과하면 어떻게 해야 하나요?', ''],
  ['주차장', 'Q-0047', '주차 위치는 어디인가요?', '인근 공영주차장 있습니다.'],
  ['공통', 'Q-0048', '숙소에서 현재 진행하고 있는 이벤트가 있나요?', ''],
  ['공통', 'Q-0049', '인원 추가 시 침구는 함께 제공되나요?', '네, 추가로 제공됩니다.'],
  ['공통', 'Q-0050', '추가 제공되는 침구는 어떤 종류인가요?', '토퍼(요) + 베개 + 이불'],
  ['공통', 'Q-0051', '체크인은 어떤 방식으로 진행되나요?', '프론트/대면 체크인'],
  ['공통', 'Q-0052', '당일 예약 시, 입실은 언제까지 가능한가요?', '24:00(자정)까지 가능합니다.'],
  ['공통', 'Q-0053', '현장에 관리자나 직원분이 계신가요?', '24시간 상주합니다.'],
  ['기타', 'Q-0076', '개별 FAQ (시설·비품·정책 16문항)', '[스파] 2021년 신축 · 직수 운영 / [비품] 호텔식 침구, 1일 1회 교체 / [객실] A301 장애인 겸용'],
];

const faqs = (src: [string, string, string, string][]): Faq[] =>
  src.map(([cate, qid, q, a]) => ({ cate, qid, q, a, tpl: FAQ_TPL[qid] ?? '' }));

/* ── 가평 리버뷰 풀빌라 (1042) — 12객실 · 개별풀 · 애견동반 · 바베큐 없음 ──── */

const gapyeongRooms = (): Room[] =>
  Array.from({ length: 12 }, (_, i) => {
    const n = i + 1;
    const floor = n <= 6 ? 1 : 2;
    const warm = n % 3 === 0;
    const pet = n > 8;
    const values: Record<string, AttrValue> = {};
    if (warm) values.private_pool = 'warm';
    if (pet) values.pet = n === 12 ? 'medium' : 'small';
    if (n <= 2) {
      values.capacity_base = 4;
      values.capacity_max = 8;
    }
    return room(
      `4210${String(n).padStart(2, '0')}`,
      `RV${floor}0${n <= 6 ? n : n - 6}`,
      floor,
      n <= 2 ? '112.00㎡ (34평)' : '76.03㎡ (23평)',
      n <= 2 ? '복층형' : '분리형',
      n <= 2 ? '킹침대 2 + 소파베드' : '킹침대 1',
      warm ? '온수풀,리버뷰' : '개별풀,리버뷰',
      values,
    );
  });

const gapyeongBlocks = (): Block[] => [
  {
    key: 'private_pool',
    label: '개별 수영장',
    st: 'used',
    chanN: 3,
    faqN: 8,
    memberOf: { attr: 'private_pool', codes: ['cold', 'warm'] },
    computed: { '이용 객실': 'rooms', '이용 요금': 'fee' },
    fields: [
      ['이용 객실', ''],
      ['이용 요금', ''],
      ['온도', '냉수'],
      ['크기', '수심 1.1m 이상'],
      ['이용 시간', '입실~22:00 (오전 이용 불가)'],
    ],
    rules: [R('wear', { wear: '수영복 필수' }), R('no_drink'), R('guardian', { n: 14 }), R('unmanned')],
  },
  {
    key: 'pet_friendly',
    label: '반려동물',
    st: 'used',
    chanN: 3,
    faqN: 3,
    memberOf: { attr: 'pet', codes: ['small', 'medium'] },
    computed: { '이용 객실': 'rooms', '이용 요금': 'fee' },
    fields: [
      ['이용 객실', ''],
      ['이용 요금', ''],
      ['동반 크기', '중형견'],
    ],
    rules: [R('pet_leash'), R('pet_bed'), R('pet_fee', { amt: 20000 })],
  },
  {
    key: 'checkin_checkout',
    label: '체크인 / 체크아웃',
    st: 'used',
    chanN: 3,
    faqN: 2,
    fields: [
      ['체크인', '15:00'],
      ['체크인 마감', '21:00'],
      ['체크아웃', '11:00'],
    ],
    rules: [R('late_call', { time: '20:00' })],
  },
  {
    key: 'extra_person',
    label: '추가 인원',
    st: 'used',
    chanN: 3,
    faqN: 3,
    computed: { '기준 인원': 'capacityBase', '최대 인원': 'capacityMax' },
    fields: [
      ['기준 인원', ''],
      ['최대 인원', ''],
      ['성인 연령', '13세 이상'],
      ['아동 연령', '13세'],
      ['유아 연령', '24개월'],
    ],
    rules: [R('infant_free', { n: 24, amt: 25000 }), R('over_capacity')],
  },
  { key: 'parking', label: '주차', st: 'used', chanN: 3, faqN: 2, fields: [['주차장', '보유'], ['주차 대수', '객실당 2대'], ['전기차 충전', '가능']] },
  {
    key: 'special_notes',
    label: '특이사항 · 이용 정책',
    st: 'used',
    chanN: 3,
    faqN: 0,
    fields: [],
    rules: [R('quiet', { time: '22:00' }), R('nonsmoking'), R('no_visitor'), R('sameday_refund')],
  },
  {
    key: 'transportation',
    label: '교통 · 주변',
    st: 'used',
    chanN: 3,
    faqN: 0,
    fields: [['도로명 주소', '경기 가평군 청평면 북한강로 1204']],
    rules: [R('nearby_car', { name: '자라섬', n: 12 }), R('nearby_car', { name: '아침고요수목원', n: 25 })],
  },
  { key: 'shared_bbq', label: '공용 BBQ', st: 'none', chanN: 3, faqN: 3, fields: [] },
  { key: 'private_bbq', label: '개별 BBQ', st: 'none', chanN: 3, faqN: 2, fields: [] },
  { key: 'spa', label: '스파', st: 'none', chanN: 3, faqN: 2, fields: [] },
  { key: 'shared_pool', label: '공용 수영장', st: 'none', chanN: 3, faqN: 8, fields: [] },
  { key: 'camping', label: '캠핑 · 오토캠핑', st: 'none', chanN: 3, faqN: 5, fields: [] },
  { key: 'pickup', label: '픽업', st: 'off', chanN: 3, faqN: 0, fields: [['사용 여부', '사용안함']] },
];

const GAPYEONG_FAQ: [string, string, string, string][] = [
  ['공통', 'G-0001', '체크인 전 짐 보관이 가능한가요?', '가능합니다.'],
  ['공통', 'G-0002', '바비큐 이용이 가능한가요?', ''],
  ['개별수영장', 'G-0003', '개별수영장 미온수 운영 중인가요?', ''],
  ['개별수영장', 'G-0004', '개별수영장 물은 얼마나 자주 교체하나요?', '매 퇴실 후 교체합니다.'],
  ['개별수영장', 'G-0005', '개별수영장 청소 시 약품을 사용하나요?', '소독약 사용합니다.'],
  ['애견동반', 'G-0006', '애견 마릿수 제한이 있나요?', ''],
  ['애견동반', 'G-0007', '애견 동반 가능 객실에 제한이 있나요?', ''],
  ['주차장', 'G-0008', '주차 위치는 어디인가요?', '객실 앞 전용 주차 공간입니다.'],
];

/* ── 홍천 카라반파크 (3471) — 24객실 · 캠핑 · 공용BBQ · 스파/수영장 없음 ───── */

const hongcheonRooms = (): Room[] =>
  Array.from({ length: 24 }, (_, i) => {
    const n = i + 1;
    const zone = n <= 8 ? 1 : n <= 16 ? 2 : 3;
    const kind = zone === 1 ? 'caravan' : zone === 2 ? 'auto' : 'tent';
    const values: Record<string, AttrValue> = {};
    if (kind !== 'auto') values.camp_site = kind;
    if (zone === 1) {
      values.capacity_base = 4;
      values.capacity_max = 6;
    }
    if (zone === 3) values.bbq = 'shared_charcoal';
    return room(
      `5510${String(n).padStart(2, '0')}`,
      `${zone === 1 ? 'C' : zone === 2 ? 'A' : 'T'}${String(n).padStart(2, '0')}`,
      zone,
      zone === 1 ? '카라반 8.5m' : zone === 2 ? '오토 100㎡' : '데크 5×5m',
      zone === 1 ? '카라반' : '야외',
      zone === 1 ? '더블 1 + 벙커' : '침구 미제공',
      zone === 1 ? '카라반,마운틴뷰' : zone === 2 ? '오토캠핑,마운틴뷰' : '텐트데크,마운틴뷰',
      values,
    );
  });

const hongcheonBlocks = (): Block[] => [
  {
    key: 'camping',
    label: '캠핑 · 오토캠핑',
    st: 'used',
    chanN: 3,
    faqN: 5,
    memberOf: { attr: 'camp_site', codes: ['auto', 'tent', 'caravan'] },
    computed: { '이용 객실': 'rooms', '이용 요금': 'fee' },
    fields: [
      ['이용 객실', ''],
      ['이용 요금', ''],
      ['이용 시간', '14:00~11:00'],
    ],
    rules: [R('power_limit', { n: 600 }), R('no_fire'), R('quiet', { time: '22:00' }), R('weather_off', { cond: '태풍' })],
  },
  {
    key: 'shared_bbq',
    label: '공용 BBQ',
    st: 'used',
    chanN: 3,
    faqN: 3,
    memberOf: { attr: 'bbq', codes: ['shared_gas', 'shared_charcoal', 'shared_lid'] },
    computed: { '이용 객실': 'rooms', '이용 요금': 'fee', '바베큐 형태': 'optionLabel' },
    fields: [
      ['이용 객실', ''],
      ['이용 장소', '캠핑장 내'],
      ['바베큐 형태', ''],
      ['제공 구성', '그릴+집게+가위+숯'],
      ['이용 요금', ''],
      ['이용 시간', '17:00~22:00'],
    ],
    rules: [R('season_open', { season: '연중' }), R('own_grill'), R('weather_off', { cond: '우천' })],
  },
  {
    key: 'checkin_checkout',
    label: '체크인 / 체크아웃',
    st: 'used',
    chanN: 3,
    faqN: 2,
    fields: [
      ['체크인', '14:00'],
      ['체크인 마감', '20:00'],
      ['체크아웃', '11:00'],
    ],
    rules: [R('late_call', { time: '19:00' })],
  },
  {
    key: 'extra_person',
    label: '추가 인원',
    st: 'used',
    chanN: 3,
    faqN: 3,
    computed: { '기준 인원': 'capacityBase', '최대 인원': 'capacityMax' },
    fields: [
      ['기준 인원', ''],
      ['최대 인원', ''],
      ['성인 연령', '13세 이상'],
      ['아동 연령', '13세'],
      ['유아 연령', '36개월'],
    ],
    rules: [R('over_capacity')],
  },
  { key: 'parking', label: '주차', st: 'used', chanN: 3, faqN: 2, fields: [['주차장', '보유'], ['주차 대수', '객실당 1대'], ['전기차 충전', '불가']] },
  {
    key: 'item_facilities',
    label: '숙소 시설 안내',
    st: 'used',
    chanN: 3,
    faqN: 2,
    fields: [],
    rules: [R('wifi'), R('not_provided', { name: '개인 텐트' }), R('nearby_car', { name: '홍천강', n: 6 })],
  },
  { key: 'playground', label: '어린이 놀이터', st: 'used', chanN: 3, faqN: 2, fields: [['이용 시간', '09:00~18:00']] },
  { key: 'spa', label: '스파', st: 'none', chanN: 3, faqN: 2, fields: [] },
  { key: 'shared_pool', label: '공용 수영장', st: 'none', chanN: 3, faqN: 8, fields: [] },
  { key: 'private_pool', label: '개별 수영장', st: 'none', chanN: 3, faqN: 8, fields: [] },
  { key: 'pet_friendly', label: '반려동물', st: 'off', chanN: 3, faqN: 3, fields: [['사용 여부', '입실불가']] },
];

const HONGCHEON_FAQ: [string, string, string, string][] = [
  ['캠핑,오토캠핑', 'H-0001', '캠핑장에서 릴선을 사용할 수 있나요?', '사용 가능합니다.'],
  ['캠핑,오토캠핑', 'H-0002', '캠핑장 이용 시 전기 와트(W) 제한이 있나요?', ''],
  ['캠핑,오토캠핑', 'H-0003', '캠핑장에서 전기 난방기구를 사용할 수 있나요?', ''],
  ['캠핑,오토캠핑', 'H-0004', '텐트 외 숙박 시설 사용이 가능한가요?', '카라반 24대 중 8대 운영합니다.'],
  ['바베큐', 'H-0005', '숯은 따로 사야 하나요?', '기본 제공됩니다.'],
  ['공통', 'H-0006', '매점이 있나요?', '있습니다. 09:00~21:00 운영.'],
  ['주차장', 'H-0007', '자리마다 주차가 되나요?', ''],
];

/* ── 조립 ───────────────────────────────────────────────────────────────── */

const history = (rows: [string, string, string, number, string, string, string[]][]): HistoryEntry[] =>
  rows.map(([title, before, after, n, who, at, chips]) => ({ title, before, after, n, who, at, chips }));

/** 판매 사이트 값은 기본적으로 기준과 같게 두고, 몇 곳만 일부러 낡은 값으로 남깁니다 —
 *  "사이트만 다른 값을 갖고 있는" 상황이 실제로 생기는 자리라서요. */
const syncChannels = (p: Property, stale: Partial<Record<ChannelRowId, Partial<ChannelValues>>> = {}): Property => {
  const rows = channelRows(p);
  const channels = {} as Record<ChannelRowId, ChannelValues>;
  rows.forEach((row) => {
    channels[row.id] = { a: '', b: '', c: '' };
    row.cells.forEach((c) => {
      channels[row.id][c.ck] = stale[row.id]?.[c.ck] ?? c.expected;
    });
  });
  return { ...p, channels };
};

const build = (p: Property, stale?: Partial<Record<ChannelRowId, Partial<ChannelValues>>>): Property => {
  const withChannels = syncChannels(p, stale);
  /** 저장된 블록을 처음부터 계산된 상태로 둡니다 — 시드 문장이 낡은 쪽이 되는 일이 없도록. */
  return { ...withChannels, blocks: deriveBlocks(withChannels) };
};

const sokcho = (): Property =>
  build(
    {
      id: 'sokcho',
      code: '2656',
      name: '속초 더샵 스파 펜션',
      region: '강원 속초',
      address: '강원 속초시 장사항해안길 21',
      status: '판매중',
      attrs: ['capacity_base', 'capacity_max', 'extra_fee', 'bbq', 'spa', 'view', 'amenity_set'],
      defaults: {
        capacity_base: 2,
        capacity_max: 4,
        extra_fee: 30000,
        bbq: 'shared_gas',
        spa: 'jet2',
        view: 'ocean',
        amenity_set: 'set3',
      },
      fees: {
        'bbq:shared_gas': '2~4인 30,000원 / 5~6인 40,000원 (1박기준/현장결제)',
        'bbq:shared_charcoal': '1세트 35,000원 (1박기준/현장결제)',
        'bbq:shared_lid': '1세트 40,000원 (1박기준/현장결제)',
        'bbq:private_electric': '1세트 20,000원 (1박기준/현장결제)',
        'bbq:private_charcoal': '1세트 30,000원 (1박기준/현장결제)',
        'bbq:none': '—',
      },
      rooms: sokchoRooms(),
      blocks: sokchoBlocks(),
      faqs: faqs(SOKCHO_FAQ),
      channels: {} as Record<ChannelRowId, ChannelValues>,
      savedAt: '2026-07-26 09:12',
      history: history([
        ['공용 BBQ · 이용 시간 변경', '17:00~20:00', '17:00~21:00', 27, '김지현', '07-24 16:40', ['객실 22', '판매 사이트 3', '질문·답변 1']],
        ['스파 · 7층만 따로 정함', '제트스파 2인용', '제트스파 4인용', 7, '박도현', '07-22 11:05', ['객실 4', '판매 사이트 3']],
        ['공용 수영장 · 운영 기간 등록', '미설정', '26.07.11 ~ 08.17', 34, '김지현', '07-18 14:22', ['객실 28', '판매 사이트 3', '질문·답변 3']],
      ]),
    },
    /* 여기어때·야놀자가 옛 표기를 그대로 갖고 있는 상태 */
    { theme: { b: '가족추천, 커플, 온수풀', c: '패밀리, 커플, 야외수영장(미온수)' }, maxpax: { c: '전 객실 4명' } },
  );

const gapyeong = (): Property =>
  build({
    id: 'gapyeong',
    code: '1042',
    name: '가평 리버뷰 풀빌라',
    region: '경기 가평',
    address: '경기 가평군 청평면 북한강로 1204',
    status: '판매중',
    attrs: ['capacity_base', 'capacity_max', 'extra_fee', 'private_pool', 'pet', 'view'],
    defaults: {
      capacity_base: 2,
      capacity_max: 4,
      extra_fee: 25000,
      private_pool: 'cold',
      pet: 'none',
      view: 'river',
    },
    fees: {
      'private_pool:cold': '무료',
      'private_pool:warm': '1박 50,000원 (1박기준/사전결제)',
      'private_pool:none': '—',
      'pet:small': '1마리 20,000원 (1박기준/현장결제)',
      'pet:medium': '1마리 30,000원 (1박기준/현장결제)',
      'pet:none': '—',
    },
    rooms: gapyeongRooms(),
    blocks: gapyeongBlocks(),
    faqs: faqs(GAPYEONG_FAQ),
    channels: {} as Record<ChannelRowId, ChannelValues>,
    savedAt: '2026-07-25 17:30',
    warn: true,
    history: history([['개별 수영장 · 온수 4객실 지정', '전 객실 냉수', '4객실 온수', 9, '이수민', '07-25 17:30', ['객실 4', '판매 사이트 3']]]),
  });

const hongcheon = (): Property =>
  build({
    id: 'hongcheon',
    code: '3471',
    name: '홍천 카라반파크',
    region: '강원 홍천',
    address: '강원 홍천군 서면 한치골길 55',
    status: '판매중',
    attrs: ['capacity_base', 'capacity_max', 'extra_fee', 'camp_site', 'bbq', 'view'],
    defaults: {
      capacity_base: 2,
      capacity_max: 4,
      extra_fee: 10000,
      camp_site: 'auto',
      bbq: 'shared_gas',
      view: 'mountain',
    },
    fees: {
      'camp_site:auto': '1박 45,000원 (1박기준/사전결제)',
      'camp_site:tent': '1박 35,000원 (1박기준/사전결제)',
      'camp_site:caravan': '1박 90,000원 (1박기준/사전결제)',
      'camp_site:none': '—',
      'bbq:shared_gas': '1세트 25,000원 (1박기준/현장결제)',
      'bbq:shared_charcoal': '1세트 30,000원 (1박기준/현장결제)',
      'bbq:shared_lid': '1세트 35,000원 (1박기준/현장결제)',
      'bbq:private_electric': '—',
      'bbq:private_charcoal': '—',
      'bbq:none': '—',
    },
    rooms: hongcheonRooms(),
    blocks: hongcheonBlocks(),
    faqs: faqs(HONGCHEON_FAQ),
    channels: {} as Record<ChannelRowId, ChannelValues>,
    savedAt: '2026-07-20 10:05',
    history: history([['캠핑 자리 · 텐트존 8자리 등록', '없음', '텐트 데크 8', 14, '박도현', '07-20 10:05', ['객실 8', '판매 사이트 3']]]),
  });

export const initialState = (): MasterState => ({
  properties: [sokcho(), gapyeong(), hongcheon()],
  current: 'sokcho',
  tab: 'rooms',
  q: '',
  sel: [],
  bfilter: 'all',
  bulk: null,
  nr: null,
  re: null,
  pickRooms: null,
  sort: 'floor',
  onlyOwn: false,
  cas: null,
  edit: null,
  toast: '',
  snapshot: null,
  settings: { inheritanceViz: 'marker', cascadeMode: 'smart', layout: '3panel' },
});
