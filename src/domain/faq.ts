import { FAQ_BLOCK } from './catalog';
import type { Block, Faq } from './types';

export type RenderedFaq = {
  cate: string;
  qid: string;
  q: string;
  a: string;
  answered: boolean;
  blank: boolean;
  /** Why the answer is blank — a switched-off facility, or an answer nobody has written yet. */
  reason: '' | '미사용 시설 · 자동 비활성' | '답변 미입력';
  derived: boolean;
  src: string;
};

const blockOf = (cate: string, blocks: Block[]): Block | undefined => {
  const key = FAQ_BLOCK[cate];
  return key ? blocks.find((b) => b.key === key) : undefined;
};

/** Answers that quote a facility are generated from the block's current value.
 *  There is no field to type them into, so they cannot disagree with the facility. */
export const renderFaq = (f: Faq, blocks: Block[]): RenderedFaq => {
  const base = { cate: f.cate, qid: f.qid, q: f.q };

  if (!f.tpl) {
    const off = blockOf(f.cate, blocks)?.st !== undefined && blockOf(f.cate, blocks)!.st !== 'used';
    return {
      ...base,
      a: f.a,
      answered: !!f.a,
      blank: !f.a,
      reason: f.a ? '' : off ? '미사용 시설 · 자동 비활성' : '답변 미입력',
      derived: false,
      src: '',
    };
  }

  const srcs: string[] = [];
  let off = false;

  const a = f.tpl.replace(/\{([a-z_]+)\.([^}]+)\}/g, (_m, key: string, fieldName: string) => {
    const b = blocks.find((x) => x.key === key);
    if (!b || b.st !== 'used') {
      off = true;
      return '(미사용)';
    }
    srcs.push(`${b.label} · ${fieldName}`);
    const fld = b.fields.find((x) => x[0] === fieldName);
    return fld ? fld[1] : '—';
  });

  return {
    ...base,
    a: off ? '' : a,
    answered: !off,
    blank: off,
    reason: off ? '미사용 시설 · 자동 비활성' : '',
    derived: !off,
    src: srcs.join(' + '),
  };
};
