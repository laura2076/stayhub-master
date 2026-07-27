/** 값의 형식. 자유 입력은 예외이고, 나머지는 전부 형식이 정해져 있습니다.
 *  형식이 있어야 판매 사이트 변환과 연결 규칙을 그 위에 걸 수 있습니다. */
export type FieldType =
  | 'time'
  | 'range'
  | 'daterange'
  | 'money'
  | 'tier'
  | 'text'
  | `int:${string}`
  | `dec:${string}`
  | `opt:${string}`;

export type ChannelKey = 'a' | 'b' | 'c';
export type ChannelValues = Record<ChannelKey, string>;
export type ChannelRowId = 'theme' | 'maxpax' | 'facility' | 'checkin';

/* ── 속성 사전 ──────────────────────────────────────────────────────────────
   숙소마다 가진 것이 다릅니다. 어떤 곳은 바베큐·스파, 어떤 곳은 개별수영장·
   애견동반, 어떤 곳은 캠핑장입니다. 그래서 객실이 가지는 값은 타입에 박아 두지
   않고 전사 속성 사전에서 정의하고, 숙소는 그중 자기가 쓰는 것만 고릅니다. */

export type AttrValue = string | number;

/** 고를 수 있는 값 하나. 판매 사이트마다 부르는 말이 다르므로 사전을 함께 답니다. */
export type AttrOption = { code: string; label: string; ch: ChannelValues };

export type AttrDef = {
  key: string;
  label: string;
  /** 객실 표에서 이 속성이 차지할 열 너비. 없으면 표에 열로 나오지 않습니다. */
  width?: number;
  /** 이 속성이 어느 시설에 딸린 값인지 (시설 안내문 자동 계산에 씁니다). */
  facility?: string;
  /** 짧은 도움말 — 처음 보는 사람이 무슨 값인지 알 수 있게. */
  hint?: string;
} & (
  | {
      kind: 'option';
      options: AttrOption[];
      /** 이 속성의 선택지마다 요금이 붙습니다 (요금은 객실이 아니라 선택지에 붙습니다). */
      feeBearing?: boolean;
    }
  | { kind: 'int'; unit: string; min?: number; max?: number }
  | { kind: 'money' }
);

/** 시설 필드가 사람이 쓴 값인지, 객실에서 계산되는 값인지.
 *  `capacityBase`·`capacityMax`는 시설에 딸린 객실이 아니라 숙소 전 객실에서 계산됩니다. */
export type ComputedKind = 'rooms' | 'fee' | 'optionLabel' | 'capacity' | 'capacityBase' | 'capacityMax';

/** used = 쓰는 중 · off = 있지만 안 씀 · none = 이 숙소에 없음 */
export type BlockStatus = 'used' | 'off' | 'none';

export type RuleSlot = { k: string; type: FieldType; v: string | number };

/** 조각에서 만들어지는 안내 문장. 문장을 직접 쓰는 곳은 없습니다. */
export type Rule = { id: string; tpl: string; slots: RuleSlot[] };

export type RuleDef = Rule & { group: string; blocks?: string[]; repeatable?: boolean };

export type BlockField = [key: string, value: string];

export type Block = {
  key: string;
  label: string;
  st: BlockStatus;
  chanN: number;
  faqN: number;
  fields: BlockField[];
  rules?: Rule[];
  /** 이 시설을 쓰는 객실을 가려내는 규칙 — 어느 속성이 어떤 값일 때. */
  memberOf?: { attr: string; codes: string[] };
  /** 객실에서 자동 계산되는 필드. 사람이 고칠 수 없습니다. */
  computed?: Record<string, ComputedKind>;
};

export type Faq = {
  cate: string;
  qid: string;
  q: string;
  a: string;
  /** 값이 있으면 답변을 시설 값에서 만들어 냅니다. */
  tpl: string;
};

export type HistoryEntry = {
  title: string;
  before: string;
  after: string;
  n: number;
  who: string;
  at: string;
  chips: string[];
};

export type Room = {
  code: string;
  name: string;
  floor: number;
  area: string;
  form: string;
  bed: string;
  tag: string;
  /** 숙소 기본값과 다르게 정한 값만 들어 있습니다. 없으면 기본값을 씁니다. */
  values: Record<string, AttrValue>;
};

/** 숙소 하나. 1000개가 이 모양으로 들어옵니다 — 서로 다른 속성·시설을 가집니다. */
export type Property = {
  id: string;
  code: string;
  name: string;
  region: string;
  address: string;
  status: string;
  /** 이 숙소가 쓰는 속성 키 (전사 사전의 부분집합). */
  attrs: string[];
  /** 숙소 기본값 — 객실이 따로 정하지 않으면 이 값을 씁니다. */
  defaults: Record<string, AttrValue>;
  /** `${속성키}:${선택지코드}` → 이 숙소에서 받는 요금. */
  fees: Record<string, string>;
  rooms: Room[];
  blocks: Block[];
  faqs: Faq[];
  channels: Record<ChannelRowId, ChannelValues>;
  savedAt: string;
  history: HistoryEntry[];
  /** 목록에 뜨는 점 — 확인이 필요한 숙소 표시. */
  warn?: boolean;
};

export type CascadeItem = {
  key: string;
  label: string;
  before: string;
  after: string;
  on: boolean;
  /** 자동으로 계산되는 줄 — 고를 수 없습니다. */
  locked?: boolean;
  /** 이미 따로 정해둔 값을 덮어쓰는 줄. */
  isOv: boolean;
};

export type CascadeGroup = { title: string; desc: string; items: CascadeItem[] };

type CascadeBase = { field: string; from: string; to: string; warn: string; groups: CascadeGroup[] };

export type Cascade =
  | (CascadeBase & { kind: 'bulk'; attr: string; value: AttrValue })
  /** 숙소 전체값 바꾸기 — 따로 정한 객실은 그대로 두고 나머지만 따라옵니다. */
  | (CascadeBase & { kind: 'default'; attr: string; value: AttrValue })
  | (CascadeBase & { kind: 'block'; blockKey: string; fieldKey: string; value: string })
  | (CascadeBase & { kind: 'roomadd'; room: Room })
  | (CascadeBase & { kind: 'roominfo'; code: string; patch: RoomInfo })
  | (CascadeBase & { kind: 'roomdel'; codes: string[] })
  | (CascadeBase & { kind: 'fieldadd'; blockKey: string; fieldKey: string })
  | (CascadeBase & { kind: 'fielddel'; blockKey: string; fieldKey: string })
  | (CascadeBase & {
      kind: 'blockstate';
      blockKey: string;
      nextSt: BlockStatus;
      killRooms?: string[];
      applyAttr?: string;
      applyCode?: string;
      /** 이 시설이 쓰는 속성을 숙소에 함께 붙입니다 (전사 목록에서 새로 가져올 때). */
      addAttr?: string;
      addDefault?: AttrValue;
    })
  | (CascadeBase & { kind: 'optfee'; attr: string; code: string; value: string })
  | (CascadeBase & { kind: 'rule'; blockKey: string; ri: number; si: number; value: string | number })
  | (CascadeBase & { kind: 'ruleadd'; blockKey: string; ruleId: string })
  | (CascadeBase & { kind: 'ruledel'; blockKey: string; ri: number })
  | (CascadeBase & { kind: 'chan'; rowId: ChannelRowId; ck: ChannelKey; value: string });

/** 형식 있는 값을 편집할 때 쓰는 조각들. 어떤 키가 있는지는 FieldType에 따라 다릅니다. */
export type Parts = {
  h?: string;
  m?: string;
  h2?: string;
  m2?: string;
  sm?: 'checkin' | 'time';
  tail?: string;
  from?: string;
  to?: string;
  d?: number;
  amt?: number;
  n?: number;
  cmp?: string;
  v?: string;
  mode?: 'flat' | 'tier';
  tiers?: Tier[];
  unit?: string;
  pay?: string;
};

export type Tier = { a: number; b: number; amt: number };

export type BulkDraft = { attr: string; value: AttrValue };

/** 객실을 설명하는 값들 — 속성 사전이 아니라 객실 자체에 붙어 있는 것. */
export type RoomInfo = { name: string; floor: number; area: string; form: string; bed: string; tag: string };

export type NewRoomDraft = RoomInfo & { floorText: string; values: Record<string, AttrValue>; from?: string };

/** 이미 있는 객실의 정보를 고치는 중 — `code`가 대상입니다. */
export type RoomEdit = RoomInfo & { code: string; floorText: string };

export type Editor =
  | { kind: 'block'; bk: Block; k: string; type: FieldType; p: Parts }
  | { kind: 'optfee'; attr: string; code: string; label: string; k: string; type: 'tier'; p: Parts }
  | { kind: 'rule'; bk: Block; ri: number; si: number; k: string; type: FieldType; p: Parts };

export type TabId = 'rooms' | 'blocks' | 'options' | 'channels' | 'faq' | 'history';
export type BlockFilter = 'all' | BlockStatus;

/** 객실 표를 어떤 순서로 볼지. 28실이 넘어가면 순서가 곧 찾는 속도입니다. */
export type RoomSort = 'floor' | 'name' | 'own';

export type Settings = {
  inheritanceViz: 'marker' | 'ghost';
  cascadeMode: 'smart' | 'always';
  layout: '3panel' | '2panel';
};

/** 검사 결과 하나. error = 두 값이 서로 어긋남 · info = 확인이 필요한 상태. */
export type Violation = { severity: 'error' | 'info'; where: string; what: string };

export type MasterState = {
  /** 1000개가 여기에 들어옵니다. 지금은 서로 다른 모양의 3곳이 채워져 있습니다. */
  properties: Property[];
  /** 지금 보고 있는 숙소 id. */
  current: string;
  tab: TabId;
  /** 왼쪽 숙소 목록과 객실 표를 좁히는 검색어. */
  q: string;
  /** 시설 카드를 좁히는 검색어 — 위 검색과 섞이면 두 칸이 서로를 따라 하게 됩니다. */
  bq: string;
  sel: string[];
  bfilter: BlockFilter;
  bulk: BulkDraft | null;
  nr: NewRoomDraft | null;
  /** 객실 정보를 고치는 중. */
  re: RoomEdit | null;
  /** 이 시설에 어느 객실을 붙일지 다시 고르는 중. */
  pickRooms: string | null;
  sort: RoomSort;
  /** 따로 정한 객실만 보기. */
  onlyOwn: boolean;
  cas: Cascade | null;
  edit: Editor | null;
  toast: string;
  /** 되돌리기용 — 바꾸기 직전의 숙소 전체. */
  snapshot: Property | null;
  settings: Settings;
};
