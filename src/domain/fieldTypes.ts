import { FREETEXT, FTYPE, NAMETYPE } from './catalog';
import type { FieldType, Parts, Tier } from './types';

export const fmtNum = (v: number | string): string => Number(v).toLocaleString('ko-KR');
export const digits = (s: string | number): number => Number(String(s).replace(/[^0-9]/g, '')) || 0;

/** Resolve a block field's format. Explicit pair → name rule → keyword rule → option.
 *  Free text is only reached by naming it, so nothing falls into free text by accident. */
export const typeOf = (bkey: string, k: string): FieldType => {
  const exact = FTYPE[`${bkey}|${k}`];
  if (exact) return exact;
  if (NAMETYPE[k]) return NAMETYPE[k];
  if (k.includes('시간')) return 'range';
  if (k.includes('요금') || k.includes('비용') || k.includes('가격')) return 'money';
  if (k.includes('연령')) return k.includes('유아') ? 'int:개월' : 'int:세';
  if (k.includes('인원') || k.includes('대수') || k.includes('개수')) return 'int:개';
  if (k.includes('기간') || k.includes('일자')) return 'daterange';
  if (FREETEXT.some((t) => k.includes(t))) return 'text';
  return 'opt:onoff';
};

export const typeName = (t: FieldType): string =>
  t === 'time'
    ? '시간'
    : t === 'range'
      ? '시간대'
      : t === 'money'
        ? '금액'
        : t === 'tier'
          ? '금액 구간'
          : t === 'daterange'
            ? '날짜'
            : t.startsWith('int:')
              ? '정수'
              : t.startsWith('dec:')
                ? '수치'
                : t.startsWith('opt:')
                  ? '옵션'
                  : '자유 텍스트';

const pad2 = (n: string | number) => `0${n}`.slice(-2);

/** String → structured parts. Qualifiers ("입실", "이상", "(1박기준/현장결제)")
 *  get their own slot so a round trip cannot silently drop them. */
export const parseVal = (type: FieldType, v: string | number | undefined): Parts => {
  const s = String(v ?? '');

  if (type === 'time') {
    const m = s.match(/(\d{1,2}):(\d{2})/);
    return { h: m ? pad2(m[1]) : '15', m: m ? m[2] : '00' };
  }

  if (type === 'range') {
    const checkin = /입실/.test(s);
    const q = s.match(/\(([^)]+)\)\s*$/);
    const tail = q ? q[1] : '';
    const m = s.match(/(\d{1,2}):(\d{2})\s*~\s*(\d{1,2}):(\d{2})/);
    if (m) return { sm: 'time', h: pad2(m[1]), m: m[2], h2: pad2(m[3]), m2: m[4], tail };
    const e = s.match(/~\s*(\d{1,2})\s*(?::(\d{2}))?\s*시?/);
    return {
      sm: checkin ? 'checkin' : 'time',
      h: '17',
      m: '00',
      h2: e ? pad2(e[1]) : '21',
      m2: e && e[2] ? e[2] : '00',
      tail,
    };
  }

  if (type === 'daterange') {
    const d = s.match(/(\d{2,4})년\s*(\d{1,2})월\s*(\d{1,2})일\s*~\s*(?:(\d{2,4})년\s*)?(\d{1,2})월\s*(\d{1,2})일/);
    if (d) {
      const y1 = d[1].length === 2 ? `20${d[1]}` : d[1];
      const y2 = d[4] ? (d[4].length === 2 ? `20${d[4]}` : d[4]) : y1;
      return { from: `${y1}-${pad2(d[2])}-${pad2(d[3])}`, to: `${y2}-${pad2(d[5])}-${pad2(d[6])}` };
    }
    return { from: '2026-07-11', to: '2026-08-17' };
  }

  if (type.startsWith('dec:')) {
    const m = s.match(/(\d+(?:\.\d+)?)/);
    return { d: m ? Number(m[1]) : 0 };
  }

  if (type === 'money') return { amt: /무료/.test(s) ? 0 : digits(s) };

  if (type === 'tier') {
    const q = s.match(/\(([^)]+)\)\s*$/);
    const parts = q ? q[1].split('/') : [];
    const unit = parts[0] ? parts[0].trim() : '1박기준';
    const pay = parts[1] ? parts[1].trim() : '현장결제';
    const body = s.replace(/\([^)]*\)\s*$/, '');
    const tiers: Tier[] = [];
    const re = /(\d+)\s*[인명]?\s*[-~]\s*(\d+)\s*[인명]\s*([0-9,]+)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(body))) tiers.push({ a: Number(m[1]), b: Number(m[2]), amt: digits(m[3]) });
    if (tiers.length) return { mode: 'tier', amt: 0, tiers, unit, pay };
    /** Anchor on the 원 amount: stripping every non-digit from "1세트 20,000원"
     *  would glue the set count onto the price and read 120,000. */
    const flat = body.match(/([0-9][0-9,]*)\s*원/);
    return {
      mode: 'flat',
      amt: flat ? digits(flat[1]) : digits(body.replace(/^\s*\d+\s*세트\s*/, '')),
      tiers: [
        { a: 2, b: 4, amt: 30000 },
        { a: 5, b: 6, amt: 40000 },
      ],
      unit,
      pay,
    };
  }

  if (type.startsWith('int:')) {
    const c = s.match(/(이상|이하|미만|초과)/);
    return { n: digits(s), cmp: c ? c[1] : '' };
  }

  return { v: s };
};

/** Structured parts → the single stored string. Every displayed sentence is
 *  assembled here and nowhere else. */
export const composeVal = (type: FieldType, p: Parts): string => {
  if (type === 'time') return `${p.h}:${p.m}`;

  if (type === 'range') {
    const start = p.sm === 'checkin' ? '입실' : `${p.h}:${p.m}`;
    return `${start}~${p.h2}:${p.m2}${p.tail ? ` (${p.tail})` : ''}`;
  }

  if (type === 'daterange') {
    const f = (iso: string) => {
      const a = iso.split('-');
      return `${Number(a[1])}월 ${Number(a[2])}일`;
    };
    return `${(p.from ?? '').slice(2, 4)}년 ${f(p.from ?? '')} ~ ${f(p.to ?? '')}`;
  }

  if (type.startsWith('dec:')) return `수심 ${p.d}${type.split(':')[1]}`;

  if (type === 'money') return p.amt === 0 ? '무료' : `${fmtNum(p.amt ?? 0)}원`;

  if (type === 'tier') {
    const body =
      p.mode === 'flat'
        ? `1세트 ${fmtNum(p.amt ?? 0)}원`
        : (p.tiers ?? []).map((t) => `${t.a}~${t.b}인 ${fmtNum(t.amt)}원`).join(' / ');
    const q = [p.unit, p.pay].filter((x): x is string => !!x && x !== '없음');
    return body + (q.length ? ` (${q.join('/')})` : '');
  }

  if (type.startsWith('int:')) return `${p.n}${type.split(':')[1]}${p.cmp ? ` ${p.cmp}` : ''}`;

  return p.v ?? '';
};
