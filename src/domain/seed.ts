import { FAQ_TPL, instantiateRule as R } from './catalog';
import { deriveBlocks } from './derive';
import type {
  Block,
  ChannelRowId,
  ChannelValues,
  Faq,
  HistoryEntry,
  MasterState,
  OptionCode,
  Room,
} from './types';

/** 속초 더샵 스파 펜션 (숙소코드 2656) — the one real snapshot this console is filled with. */

const NO_TERRACE = ['A402', 'B402', 'A501', 'B501', 'A602', 'A603', 'B602', 'B603'];

const SEQ: [code: string, name: string][] = [
  ['27758', 'A701'], ['27759', 'A702'], ['27760', 'B701'], ['27761', 'B702'],
  ['27734', 'A301'], ['27735', 'A302'], ['27736', 'A303'], ['27737', 'B301'], ['27738', 'B302'], ['27739', 'B303'],
  ['27740', 'A401'], ['27741', 'A402'], ['27742', 'A403'], ['27743', 'B401'], ['27744', 'B402'], ['27745', 'B403'],
  ['27746', 'A501'], ['27747', 'A502'], ['27748', 'A503'], ['27749', 'B501'], ['27750', 'B502'], ['27751', 'B503'],
  ['27752', 'A601'], ['27753', 'A602'], ['27754', 'A603'], ['27755', 'B601'], ['27756', 'B602'], ['27757', 'B603'],
];

export const seedOptFees: Record<OptionCode, string> = {
  shared_gas: '2~4인 30,000원 / 5~6인 40,000원 (1박기준/현장결제)',
  shared_charcoal: '1세트 35,000원 (1박기준/현장결제)',
  shared_lid: '1세트 40,000원 (1박기준/현장결제)',
  private_electric: '1세트 20,000원 (1박기준/현장결제)',
  private_charcoal: '1세트 30,000원 (1박기준/현장결제)',
  none: '—',
};

export const seedRooms = (): Room[] =>
  SEQ.map(([code, nm]) => {
    const floor = Number(nm[1]);
    const seven = floor === 7;
    const three = floor === 3;
    const noTer = NO_TERRACE.includes(nm);
    return {
      code,
      short: nm,
      tag: three ? '개별BBQ,와이드테라스,오션뷰' : noTer ? '오션뷰' : '개별테라스,오션뷰',
      floor,
      area: seven ? '92.56㎡ (28평)' : three ? '66.12㎡ (20평)' : '59.50㎡ (18평)',
      form: seven ? '분리형' : '원룸형',
      bed: seven ? '킹침대 2' : '킹침대 1',
      facil: seven ? '변형1' : nm === 'A301' ? '변형2' : noTer ? '변형4' : '변형3',
      baseP: seven ? 4 : 2,
      maxP: seven ? 6 : 4,
      paxOv: seven,
      extra: 30000,
      extraOv: false,
      bbq: three ? '개별BBQ · 전기그릴' : '공용BBQ · 가스그릴',
      bbqOv: three,
      bbqOpt: three ? 'private_electric' : 'shared_gas',
      bbqFee: three ? seedOptFees.private_electric : seedOptFees.shared_gas,
      spa: seven ? '제트스파 4인용' : '제트스파 2인용',
      spaOv: seven,
    };
  });

const OWNED_BLOCKS: Omit<Block, 'st'>[] = [
  {
    key: 'shared_bbq',
    label: '공용 BBQ',
    rooms: 22,
    chanN: 3,
    faqN: 3,
    fields: [
      ['이용 객실', '4~7층 객실 · 22객실'],
      ['이용 장소', '루프탑'],
      ['바베큐 형태', '가스그릴'],
      ['제공 구성', '그릴+집게+가위'],
      ['이용 요금', '2~4인 30,000원 / 5~6인 40,000원 (1박기준/현장결제)'],
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
    rooms: 6,
    chanN: 3,
    faqN: 2,
    fields: [
      ['이용 객실', '3층 객실 · 6객실'],
      ['이용 장소', '개별 테라스'],
      ['바베큐 형태', '전기그릴'],
      ['제공 구성', '그릴+집게+가위'],
      ['이용 요금', '1세트 20,000원 (1박기준/현장결제)'],
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
    rooms: 28,
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
    rooms: 28,
    chanN: 3,
    faqN: 2,
    fields: [
      ['이용 객실', '전 객실'],
      ['스파 형태', '제트스파'],
      ['수용인원', '7층 4인용 / 3~6층 2인용'],
      ['이용 요금', '무료'],
      ['이용 시간', '입실~23시 (오전 이용 불가)'],
    ],
    rules: [
      R('wear', { wear: '수영복 필수' }),
      R('no_bath_bomb'),
      R('temp_ctrl', { mode: '직접 조절 가능' }),
      R('repair_charge'),
    ],
  },
  {
    key: 'checkin_checkout',
    label: '체크인 / 체크아웃',
    rooms: 28,
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
    rooms: 28,
    chanN: 3,
    faqN: 3,
    fields: [
      ['추가요금', '30,000원'],
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
    rooms: 28,
    chanN: 3,
    faqN: 2,
    fields: [
      ['주차장', '보유'],
      ['주차 대수', '객실당 1대'],
      ['전기차 충전', '불가'],
    ],
  },
  /* 원본 스냅샷에서 통문장이던 세 항목 — 이제 조각으로만 관리합니다. */
  {
    key: 'special_notes',
    label: '특이사항 · 이용 정책',
    rooms: 28,
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
    rooms: 28,
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
    rooms: 28,
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
];

const OFF_BLOCKS: Omit<Block, 'st'>[] = [
  { key: 'private_pool', label: '개별 수영장', rooms: 0, chanN: 3, faqN: 8, fields: [['사용 여부', '사용안함']] },
  { key: 'pet_friendly', label: '반려동물', rooms: 0, chanN: 3, faqN: 3, fields: [['사용 여부', '입실불가']] },
  { key: 'pickup', label: '픽업', rooms: 0, chanN: 3, faqN: 0, fields: [['사용 여부', '사용안함']] },
];

/** Catalogue items this property does not have at all. */
const CATALOG_EXTRA: Block[] = [
  { key: 'camping', label: '캠핑 · 오토캠핑', st: 'none', rooms: 0, chanN: 3, faqN: 5, fields: [] },
  { key: 'rooftop_bar', label: '루프탑 바', st: 'none', rooms: 0, chanN: 2, faqN: 0, fields: [] },
  { key: 'playground', label: '어린이 놀이터', st: 'none', rooms: 0, chanN: 3, faqN: 2, fields: [] },
  { key: 'karaoke', label: '노래방', st: 'none', rooms: 0, chanN: 2, faqN: 1, fields: [] },
  { key: 'seminar_room', label: '세미나실', st: 'none', rooms: 0, chanN: 2, faqN: 0, fields: [] },
  { key: 'ev_charger', label: '전기차 충전', st: 'none', rooms: 0, chanN: 3, faqN: 1, fields: [] },
];

export const seedBlocks = (): Block[] => [
  ...OWNED_BLOCKS.map((b) => ({ ...b, st: 'used' as const })),
  ...OFF_BLOCKS.map((b) => ({ ...b, st: 'off' as const })),
  ...CATALOG_EXTRA.map((b) => ({ ...b })),
];

const FAQ_SRC: [cate: string, qid: string, q: string, a: string][] = [
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
  ['초과입실', 'Q-0011', '예외로 객실 최대 인원수보다 초과해서 입실할 수 있나요?', '최대 인원 초과입실 불가합니다.'],
  ['초과입실', 'Q-0012', '객실 최대 인원 초과 입실은 어떤 경우에 가능한가요?', '최대 인원 초과입실 불가합니다.'],
  ['초과입실', 'Q-0013', '객실 최대 인원 초과 입실은 몇 명까지 가능한가요?', '최대 인원 초과입실 불가합니다.'],
  ['바베큐', 'Q-0014', '예외로 바비큐 신청 마감 시간 이후에도 이용이 가능한가요?', '입실일 1일전까지 사전 신청 해주셔야 합니다.'],
  ['바베큐', 'Q-0015', '예외로 바비큐 이용 마감 시간 이후에도 이용이 가능한가요?', '오후 5시~9시에 이용 가능합니다.'],
  ['바베큐', 'Q-0016', '야외바베큐일 경우, 천막이 설치되어 있나요?', '우천 및 기상 악화 시 이용 불가합니다.'],
  ['바베큐', 'Q-0017', '바베큐 이용 시에 조개구이를 해도 되나요?', '불가합니다.'],
  ['바베큐', 'Q-0018', '바베큐를 사용하지 않는 영유아 바비큐 비용이 발생하나요?', '36개월 이하는 무료입니다.'],
  ['개별바베큐', 'Q-0019', '객실을 두 개 이상 예약하신 경우, 한 공간에서 바베큐를 함께 이용할 수 있나요?', '최대인원까지 가능합니다.'],
  ['공용수영장', 'Q-0020', '공용수영장 미온수 운영 중인가요?', '냉수로만 운영합니다.'],
  ['공용수영장', 'Q-0021', '공용수영장 수질 관리는 어떻게 하나요?', '여과기 사용합니다.'],
  ['공용수영장', 'Q-0022', '공용수영장 청소 시 약품을 사용하나요?', '소독약 사용합니다.'],
  ['공용수영장', 'Q-0023', '펜션 내 에어펌프가 구비되어 있나요?', '구비되어 있습니다.'],
  ['공용수영장', 'Q-0024', '튜브를 대여할 수 있나요?', '구비되어 있습니다.'],
  ['공용수영장', 'Q-0025', '공용수영장 물은 얼마나 자주 교체하나요?', '3~4일 주기로 교체합니다.'],
  ['공용수영장', 'Q-0026', '공용수영장 이용 시간 마감 후에 이용할 수 있나요?', '21시까지 가능합니다.'],
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
  ['스파', 'Q-0039', '예외로 스파 이용 시간 마감 후에 이용할 수 있나요?', '23시까지 가능합니다.'],
  ['스파', 'Q-0040', '스파 퇴실일 오전에도 이용할 수 있나요?', '불가합니다.'],
  ['캠핑,오토캠핑', 'Q-0041', '캠핑장에서 릴선을 사용할 수 있나요?', ''],
  ['캠핑,오토캠핑', 'Q-0042', '캠핑장 이용 시 전기 와트(W) 제한이 있나요?', ''],
  ['캠핑,오토캠핑', 'Q-0043', '캠핑장에서 전기 난방기구를 사용할 수 있나요?', ''],
  ['캠핑,오토캠핑', 'Q-0044', '캠핑장 전기 난방 기구 사용 시 비용이 발생하나요?', ''],
  ['캠핑,오토캠핑', 'Q-0045', '텐트 외 숙박 시설 사용이 가능한가요?', ''],
  ['주차장', 'Q-0046', '부지 내 주차 가능 대수를 초과하면 어떻게 해야 하나요?', '주차장 있습니다.'],
  ['주차장', 'Q-0047', '주차 위치는 어디인가요?', '인근 공영주차장 있습니다.'],
  ['공통', 'Q-0048', '숙소에서 현재 진행하고 있는 이벤트가 있나요?', ''],
  ['공통', 'Q-0049', '인원 추가 시 침구는 함께 제공되나요?', '네, 추가로 제공됩니다.'],
  ['공통', 'Q-0050', '추가 제공되는 침구는 어떤 종류인가요?', '토퍼(요) + 베개 + 이불'],
  ['공통', 'Q-0051', '체크인은 어떤 방식으로 진행되나요?', '프론트/대면 체크인'],
  ['공통', 'Q-0052', '당일 예약 시, 입실은 언제까지 가능한가요?', '24:00(자정)까지 가능합니다.'],
  ['공통', 'Q-0053', '현장에 관리자나 직원분이 계신가요?', '24시간 상주합니다.'],
  [
    '기타',
    'Q-0076',
    '개별 FAQ (시설·비품·정책 16문항)',
    '[스파] 2021년 신축 · 직수 운영 · 유색 의류 불가 / [비품] 호텔식 침구, 1일 1회 전체 교체 / [객실] 3층 테라스 불투명 벽, 4~7층 완전 차단, A301 장애인 겸용',
  ],
];

export const seedFaqs = (): Faq[] =>
  FAQ_SRC.map(([cate, qid, q, a]) => ({ cate, qid, q, a, tpl: FAQ_TPL[qid] ?? '' }));

export const seedChannels = (): Record<ChannelRowId, ChannelValues> => ({
  theme: { a: '가족실, 2인실, 수영장', b: '가족추천, 커플, 온수풀', c: '패밀리, 커플, 야외수영장(미온수)' },
  maxpax: { a: '7층 6인 / 그 외 4인', b: '7층 6인 / 그 외 4인', c: '전 객실 4인' },
  bbq: { a: '개별 6실 / 공용 22실', b: '개별 6실 / 공용 22실', c: '개별 6실 / 공용 22실' },
  checkin: { a: '15:30 / 11:00', b: '15:30 / 11:00', c: '15:30 / 11:00' },
});

const seedHistory = (): HistoryEntry[] => [
  { title: '공용 BBQ · 이용 시간 변경', before: '17:00~20:00', after: '17:00~21:00', n: 27, who: '김지현', at: '07-24 16:40', chips: ['객실 22', '채널 3', 'FAQ Q-0015'] },
  { title: '스파 수용인원 · 7층 오버라이드', before: '2인용 제트스파', after: '4인용 제트스파', n: 7, who: '박도현', at: '07-22 11:05', chips: ['객실 4', '채널 3'] },
  { title: '공용 수영장 · 운영 기간 등록', before: '미설정', after: '26.07.11 ~ 08.17', n: 34, who: '김지현', at: '07-18 14:22', chips: ['객실 28', '채널 3', 'FAQ 3'] },
  { title: '객실 A303 추가 등록', before: '—', after: '개별BBQ 상속 · 변형3', n: 12, who: '이수민', at: '07-11 10:03', chips: ['블록 2', '채널 3', 'FAQ 7'] },
];

export const initialState = (): MasterState => {
  const rooms = seedRooms();
  /** Store the blocks already derived, so stored state and computed state agree from
   *  the very first render — a seeded sentence is never allowed to be the stale one. */
  const blocks = deriveBlocks(rooms, seedBlocks());
  return {
    tab: 'rooms',
    q: '',
    sel: [],
    bfilter: 'all',
    optFees: { ...seedOptFees },
    rooms,
    blocks,
    faqs: seedFaqs(),
    /** 전사 카탈로그 규모 — 이 숙소가 보유·미보유로 나뉘는 모집단. */
    catalogN: blocks.length + 22,
    channels: seedChannels(),
    bulk: null,
    nr: null,
    cas: null,
    edit: null,
    toast: '',
    snapshot: null,
    savedAt: '2026-07-26 09:12',
    history: seedHistory(),
    settings: { inheritanceViz: 'marker', cascadeMode: 'preview', layout: '3panel' },
  };
};
