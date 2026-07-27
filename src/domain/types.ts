/** Field format. Every value in this console is one of these — free text is the
 *  exception, not the default, so channel conversion and link rules can be built on top. */
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

export type OptionCode =
  | 'shared_gas'
  | 'shared_charcoal'
  | 'shared_lid'
  | 'private_electric'
  | 'private_charcoal'
  | 'none';

export type BbqOption = {
  code: OptionCode;
  label: string;
  scope: 'shared' | 'private' | 'none';
  ch: ChannelValues;
};

export type ChannelKey = 'a' | 'b' | 'c';
export type ChannelValues = Record<ChannelKey, string>;
export type ChannelRowId = 'theme' | 'maxpax' | 'bbq' | 'checkin';

export type Room = {
  code: string;
  short: string;
  tag: string;
  floor: number;
  area: string;
  form: string;
  bed: string;
  facil: string;
  /** 기준 인원 */
  baseP: number;
  /** 최대 인원 */
  maxP: number;
  paxOv: boolean;
  extra: number;
  extraOv: boolean;
  bbq: string;
  bbqOv: boolean;
  bbqOpt: OptionCode;
  /** Derived from the option's fee — never typed by hand on the room. */
  bbqFee: string;
  spa: string;
  spaOv: boolean;
};

/** used = 사용중 · off = 보유하지만 판매 미노출 · none = 이 숙소 미보유 */
export type BlockStatus = 'used' | 'off' | 'none';

export type RuleSlot = { k: string; type: FieldType; v: string | number };

/** An advisory sentence assembled from typed fragments — never a free-text field.
 *  `id` points back at the company rule catalogue the sentence pattern came from. */
export type Rule = { id: string; tpl: string; slots: RuleSlot[] };

/** A catalogue entry: the sentence pattern plus where it may be used.
 *  `blocks` limits it to certain facilities; `repeatable` allows several copies
 *  on one block (e.g. one 주변 여행지 line per destination). */
export type RuleDef = Rule & {
  group: string;
  blocks?: string[];
  repeatable?: boolean;
};

export type BlockField = [key: string, value: string];

export type Block = {
  key: string;
  label: string;
  st: BlockStatus;
  rooms: number;
  chanN: number;
  faqN: number;
  fields: BlockField[];
  rules?: Rule[];
};

export type Faq = {
  cate: string;
  qid: string;
  q: string;
  a: string;
  /** When set, the answer is generated from facility values instead of typed. */
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

export type CascadeItem = {
  key: string;
  label: string;
  before: string;
  after: string;
  on: boolean;
  /** Auto-derived rows: shown as a result, not as a choice. */
  locked?: boolean;
  isOv: boolean;
};

export type CascadeGroup = { title: string; desc: string; items: CascadeItem[] };

type CascadeBase = {
  field: string;
  from: string;
  to: string;
  warn: string;
  groups: CascadeGroup[];
};

export type BulkFieldId = 'maxP' | 'extra' | 'bbq' | 'spa' | 'facil';

export type Cascade =
  | (CascadeBase & { kind: 'bulk'; target: BulkFieldId; value: string })
  | (CascadeBase & { kind: 'block'; blockKey: string; fieldKey: string; value: string })
  | (CascadeBase & { kind: 'roomadd'; room: Room })
  | (CascadeBase & { kind: 'roomdel'; codes: string[] })
  | (CascadeBase & {
      kind: 'blockstate';
      blockKey: string;
      nextSt: BlockStatus;
      killRooms?: string[];
      applyVal?: string;
    })
  | (CascadeBase & { kind: 'optfee'; code: OptionCode; value: string })
  | (CascadeBase & { kind: 'rule'; blockKey: string; ri: number; si: number; value: string | number })
  | (CascadeBase & { kind: 'ruleadd'; blockKey: string; ruleId: string })
  | (CascadeBase & { kind: 'ruledel'; blockKey: string; ri: number })
  | (CascadeBase & { kind: 'chan'; rowId: ChannelRowId; ck: ChannelKey; value: string });

/** Structured pieces a typed value is edited as. Which keys are present depends on FieldType. */
export type Parts = {
  /** range/time: start hour + minute */
  h?: string;
  m?: string;
  /** range: end hour + minute */
  h2?: string;
  m2?: string;
  /** range: start reference — 'checkin' means "입실 시각", not a clock time */
  sm?: 'checkin' | 'time';
  /** range: trailing qualifier, e.g. 오전 이용 불가 */
  tail?: string;
  /** daterange */
  from?: string;
  to?: string;
  /** dec: */
  d?: number;
  /** money / tier */
  amt?: number;
  /** int: */
  n?: number;
  cmp?: string;
  /** opt: / text */
  v?: string;
  /** tier */
  mode?: 'flat' | 'tier';
  tiers?: Tier[];
  unit?: string;
  pay?: string;
};

export type Tier = { a: number; b: number; amt: number };

export type BulkDraft = { field: BulkFieldId; value: string };

export type NewRoomDraft = { name: string; floor: string; bbq: string; pax: '2/4' | '4/6' };

export type Editor =
  | { kind: 'block'; bk: Block; k: string; type: FieldType; p: Parts }
  | { kind: 'optfee'; o: BbqOption; k: string; type: 'tier'; p: Parts }
  | { kind: 'rule'; bk: Block; ri: number; si: number; k: string; type: FieldType; p: Parts };

export type TabId = 'rooms' | 'blocks' | 'options' | 'channels' | 'faq' | 'history';
export type BlockFilter = 'all' | BlockStatus;

/** The three prototype tweaks, surfaced as a settings menu. */
export type Settings = {
  inheritanceViz: 'marker' | 'ghost';
  cascadeMode: 'preview' | 'instant';
  layout: '3panel' | '2panel';
};

/** One consistency finding. `error` = 두 값이 서로 어긋남 · `info` = 확인이 필요한 상태. */
export type Violation = { severity: 'error' | 'info'; where: string; what: string };

export type Snapshot = {
  rooms: Room[];
  channels: Record<ChannelRowId, ChannelValues>;
  blocks: Block[];
  optFees: Record<OptionCode, string>;
  faqs: Faq[];
};

export type MasterState = {
  tab: TabId;
  q: string;
  sel: string[];
  bfilter: BlockFilter;
  optFees: Record<OptionCode, string>;
  rooms: Room[];
  blocks: Block[];
  faqs: Faq[];
  catalogN: number;
  channels: Record<ChannelRowId, ChannelValues>;
  bulk: BulkDraft | null;
  nr: NewRoomDraft | null;
  cas: Cascade | null;
  edit: Editor | null;
  toast: string;
  snapshot: Snapshot | null;
  savedAt: string;
  history: HistoryEntry[];
  settings: Settings;
};
