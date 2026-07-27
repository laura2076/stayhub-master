import type { Block, Room } from './types';

/** 시설 항목의 객실별 값.
 *
 *  상속 규칙은 객실 속성(기준 인원·바베큐…)과 **똑같습니다** — 시설에 적힌 값이 기본이고,
 *  객실이 따로 정한 것만 그 객실에 남습니다. 저장하는 곳도 같은 `Room.values`입니다.
 *  키만 `blk:시설키:항목이름`으로 이름을 나눠서, 읽는 규칙 하나로 둘 다 처리됩니다.
 *
 *  같은 시설이라도 층마다 조건이 다른 펜션이 많습니다 — 3층은 개별 테라스에서 15시부터,
 *  7층 루프탑은 17시부터 같은 식으로요. 전에는 이런 숙소를 시설 두 개로 쪼개 넣어야 했고,
 *  그러면 판매 사이트에 시설이 두 번 나갔습니다. */

export const BLK = 'blk:';

export const bfKey = (blockKey: string, fieldKey: string): string => `${BLK}${blockKey}:${fieldKey}`;

/** `blk:shared_bbq:이용 시간` → `{ blockKey, fieldKey }`. 항목 이름에 콜론이 없다는 보장이
 *  없으므로 첫 콜론에서만 자릅니다. */
export const parseBfKey = (key: string): { blockKey: string; fieldKey: string } | null => {
  if (!key.startsWith(BLK)) return null;
  const rest = key.slice(BLK.length);
  const i = rest.indexOf(':');
  return i < 0 ? null : { blockKey: rest.slice(0, i), fieldKey: rest.slice(i + 1) };
};

/** 시설에 적힌 값 — 따로 정하지 않은 객실이 쓰는 기본값. */
export const baseValue = (b: Block, fieldKey: string): string => b.fields.find((f) => f[0] === fieldKey)?.[1] ?? '—';

/** 이 객실이 이 항목을 따로 정했는지. */
export const isOwnField = (r: Room, blockKey: string, fieldKey: string): boolean => bfKey(blockKey, fieldKey) in r.values;

/** 이 객실에 적용되는 값 — 따로 정했으면 그것, 아니면 시설 기본값. */
export const fieldValueOf = (b: Block, r: Room, fieldKey: string): string => {
  const own = r.values[bfKey(b.key, fieldKey)];
  return own === undefined ? baseValue(b, fieldKey) : String(own);
};

/** 이 항목을 따로 정해 둔 객실만. */
export const ownRooms = (b: Block, rooms: Room[], fieldKey: string): Room[] =>
  rooms.filter((r) => isOwnField(r, b.key, fieldKey));

/** 객실에 남은 이 시설의 값을 전부 떼어 냅니다 — 시설이나 항목을 없앨 때 씁니다.
 *  안 떼면 화면에는 없는 값이 객실 안에 남아 다음에 켤 때 되살아납니다. */
export const stripBlockValues = (rooms: Room[], blockKey: string, fieldKey?: string): Room[] =>
  rooms.map((r) => {
    const kill = Object.keys(r.values).filter((k) => {
      const parsed = parseBfKey(k);
      return !!parsed && parsed.blockKey === blockKey && (fieldKey === undefined || parsed.fieldKey === fieldKey);
    });
    if (!kill.length) return r;
    const values = { ...r.values };
    kill.forEach((k) => delete values[k]);
    return { ...r, values };
  });
