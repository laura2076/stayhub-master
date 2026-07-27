import type { Cascade, CascadeItem } from './types';

/** 무엇이 바뀌는지 한 문장으로. 표는 읽지 않지만 문장은 읽습니다. */

/** 받침 유무에 맞는 조사. "바베큐 유형를"처럼 어긋나면 읽는 사람이 먼저 걸립니다. */
const hasFinal = (word: string): boolean => {
  const ch = word.trim().slice(-1).charCodeAt(0);
  if (ch < 0xac00 || ch > 0xd7a3) return false;
  return (ch - 0xac00) % 28 !== 0;
};

/** 을/를 · 이/가 · 은/는 · 와/과 */
const josa = (word: string, withFinal: string, withoutFinal: string): string =>
  `${word}${hasFinal(word) ? withFinal : withoutFinal}`;

/** 으로/로 — ㄹ 받침은 "로"를 씁니다 (예: 개별그릴로). */
const ro = (word: string): string => {
  const ch = word.trim().slice(-1).charCodeAt(0);
  const inHangul = ch >= 0xac00 && ch <= 0xd7a3;
  const jong = inHangul ? (ch - 0xac00) % 28 : 0;
  return `${word}${!inHangul || jong === 0 || jong === 8 ? '로' : '으로'}`;
};

const on = (c: Cascade, prefix: string): CascadeItem[] =>
  c.groups.flatMap((g) => g.items).filter((i) => i.on && i.key.startsWith(prefix));

const derivedCount = (c: Cascade) => on(c, 'drv:').length;

/** 값 변경은 되돌릴 수 있으니 그냥 적용합니다. 만들고 지우는 것과, 남이 따로
 *  정해둔 값을 덮어쓰는 것만 한 번 묻습니다 — 되돌리기로 못 되살리는 판단이라서요. */
export const needsConfirm = (c: Cascade): boolean => {
  /** 전체값은 손대지 않은 객실 전부가 따라오므로, 몇 개가 따라오고 몇 개가 남는지
   *  보여 주지 않으면 "왜 몇 개는 안 바뀌지"가 됩니다. 항상 한 번 묻습니다. */
  if (c.kind === 'roomadd' || c.kind === 'roomdel' || c.kind === 'blockstate' || c.kind === 'default') return true;
  if (c.kind === 'fielddel') return true;
  const rooms = on(c, 'room:');
  return c.kind === 'bulk' && rooms.length > 1 && rooms.some((i) => i.isOv);
};

/** 적용된 뒤 화면 아래에 뜨는 말. "~했어요"로 끝나 이미 벌어진 일임을 알립니다. */
export const doneSentence = (c: Cascade): string => {
  const alsoChanged = derivedCount(c);
  const also = alsoChanged ? ` 시설 안내문 ${alsoChanged}곳도 같이 바뀌었어요.` : '';

  switch (c.kind) {
    case 'bulk': {
      const n = on(c, 'room:').length;
      /** 값이 섞이면 "…다름)로 바꿨어요"가 되어 읽히지 않습니다. 문장 모양을 바꿉니다. */
      const perN = Object.keys(c.per).length;
      if (perN) {
        return `객실 ${n}개의 ${josa(c.field, '을', '를')} 객실마다 다르게 바꿨어요 — ${perN}개는 따로 정한 값.${also}`;
      }
      return `객실 ${n}개의 ${josa(c.field, '을', '를')} ${ro(c.to)} 바꿨어요.${also}`;
    }
    case 'optfee': {
      const n = on(c, 'room:').length;
      return `${c.field.replace(' · 이용요금', '')} 요금을 ${ro(c.to)} 바꿨어요. 이 요금을 쓰는 객실 ${n}개에 같이 적용됐어요.`;
    }
    case 'block':
      return `${josa(c.field, '을', '를')} ${ro(c.to)} 바꿨어요.${also}`;
    case 'rule':
      return `안내 문구를 "${c.to}"로 바꿨어요.`;
    case 'ruleadd':
      return `안내 문구 "${c.to}"를 넣었어요.`;
    case 'ruledel':
      return `안내 문구 "${c.from}"를 지웠어요.`;
    case 'default': {
      const n = on(c, 'room:').length;
      const kept = c.groups.flatMap((g) => g.items).filter((i) => i.key.startsWith('keep:')).length;
      return (
        `숙소 전체 ${josa(c.field.replace('숙소 전체값 · ', ''), '을', '를')} ${ro(c.to)} 바꿨어요. 객실 ${n}개가 따라왔어요.` +
        (kept ? ` 따로 정해둔 ${kept}개는 그대로 뒀어요.` : '') +
        also
      );
    }
    case 'roomadd':
      return `객실 ${josa(c.room.name, '을', '를')} 새로 만들었어요.${also}`;
    case 'roominfo':
      return `${c.field.replace('객실 정보 · ', '')} 객실 정보를 고쳤어요.${also}`;
    case 'roomdel':
      return `객실 ${c.codes.length}개를 지웠어요.${also}`;
    case 'fieldadd':
      return `${josa(c.field.replace(' 넣기', ''), '을', '를')} 넣었어요. 이제 값을 채우면 됩니다.`;
    case 'fielddel':
      return `${josa(c.field.replace(' 제외', ''), '을', '를')} 제외했어요.`;
    case 'blockstate':
      return `${josa(c.field, '을', '를')} ${ro(c.to)} 바꿨어요.${also}`;
    case 'chan':
      return `${josa(c.field, '을', '를')} 기준값으로 맞췄어요.`;
    default:
      return '바꿨어요.';
  }
};

/** 확인 창 맨 위에 뜨는 말. 아직 벌어지지 않았으므로 "~합니다"로 끝냅니다. */
export const willSentence = (c: Cascade): string => {
  const alsoChanged = derivedCount(c);
  const also = alsoChanged ? ` 그러면 시설 안내문 ${alsoChanged}곳이 자동으로 같이 바뀝니다.` : '';

  switch (c.kind) {
    case 'default': {
      const n = on(c, 'room:').length;
      const kept = c.groups.flatMap((g) => g.items).filter((i) => i.key.startsWith('keep:')).length;
      return (
        `숙소 전체값을 ${ro(c.to)} 바꿉니다. 전체값을 그대로 쓰던 객실 ${n}개가 따라옵니다.` +
        (kept ? ` 따로 정해둔 ${kept}개는 그대로 둡니다.` : '') +
        also
      );
    }
    case 'roomadd':
      return `객실 ${josa(c.room.name, '을', '를')} 새로 만듭니다.${also}`;
    case 'roomdel':
      return `객실 ${c.codes.length}개를 지웁니다. 지운 객실은 판매 사이트에서도 내려갑니다.${also}`;
    case 'fielddel':
      return `${josa(c.field.replace(' 제외', ''), '을', '를')} 제외합니다. 넣어둔 값도 함께 사라집니다.`;
    case 'blockstate':
      return `${josa(c.field, '을', '를')} ${ro(c.to)} 바꿉니다.${also}`;
    case 'bulk': {
      const rooms = on(c, 'room:');
      const own = rooms.filter((i) => i.isOv);
      return (
        `객실 ${rooms.length}개의 ${josa(c.field, '을', '를')} ${ro(c.to)} 바꿉니다.` +
        (own.length ? ` 그중 ${own.length}개는 따로 정해둔 값이 있어요 — 그대로 두려면 체크를 푸세요.` : '') +
        also
      );
    }
    default:
      return `${josa(c.field, '을', '를')} ${ro(c.to)} 바꿉니다.${also}`;
  }
};
