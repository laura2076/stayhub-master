import { BASEVAL, OPTIONS, optByCode } from './catalog';
import { deriveBlocks, ruleText, slotText } from './derive';
import { renderFaq } from './faq';
import { composeVal, parseVal } from './fieldTypes';
import type { MasterState, Violation } from './types';

/** Consistency rules the console promises to hold after *every* operation.
 *  Anything listed here is something a human would otherwise have to remember. */
export const audit = (st: MasterState): Violation[] => {
  const v: Violation[] = [];
  const err = (where: string, what: string) => v.push({ severity: 'error', where, what });
  const info = (where: string, what: string) => v.push({ severity: 'info', where, what });

  /* 1 — 객실 요금은 옵션 요금에서만 옵니다. */
  st.rooms.forEach((r) => {
    const expected = st.optFees[r.bbqOpt];
    if (r.bbqFee !== expected) {
      err(`객실 ${r.short}`, `바베큐 요금이 옵션 요금과 다릅니다: "${r.bbqFee}" ≠ "${expected}" (${r.bbqOpt})`);
    }
  });

  /* 2 — 화면에 보이는 라벨과 저장된 옵션 코드가 같은 것을 가리켜야 합니다. */
  st.rooms.forEach((r) => {
    const byLabel = OPTIONS.find((o) => o.label === r.bbq);
    if (!byLabel) err(`객실 ${r.short}`, `옵션 목록에 없는 바베큐 값입니다: "${r.bbq}"`);
    else if (byLabel.code !== r.bbqOpt) {
      err(`객실 ${r.short}`, `라벨과 옵션 코드가 어긋납니다: "${r.bbq}" ↔ ${r.bbqOpt} (${optByCode(r.bbqOpt).label})`);
    }
  });

  /* 3 — 오버라이드 표시는 "숙소 기본값과 다르다"와 정확히 같은 뜻이어야 합니다. */
  st.rooms.forEach((r) => {
    const checks: [string, boolean, boolean][] = [
      ['바베큐', r.bbq !== BASEVAL.bbq, r.bbqOv],
      ['스파', r.spa !== BASEVAL.spa, r.spaOv],
      ['최대 인원', String(r.maxP) !== BASEVAL.maxP, r.paxOv],
      ['추가인원 요금', String(r.extra) !== BASEVAL.extra, r.extraOv],
    ];
    checks.forEach(([label, differs, flagged]) => {
      if (differs !== flagged) {
        err(`객실 ${r.short}`, `${label} 오버라이드 표시가 실제 값과 다릅니다 (표시 ${flagged ? '오버라이드' : '상속'})`);
      }
    });
  });

  /* 4 — 자동 산출 필드는 지금 객실 테이블로 다시 계산한 값과 같아야 합니다. */
  const fresh = deriveBlocks(st.rooms, st.blocks);
  st.blocks.forEach((b, i) => {
    const f2 = fresh[i];
    b.fields.forEach((f, fi) => {
      if (f2.fields[fi] && f[1] !== f2.fields[fi][1]) {
        err(`시설 ${b.label}`, `자동 산출 필드가 낡았습니다 · ${f[0]}: "${f[1]}" → 재계산 "${f2.fields[fi][1]}"`);
      }
    });
    if (b.st !== 'none' && b.rooms !== f2.rooms) {
      err(`시설 ${b.label}`, `적용 객실 수가 낡았습니다: ${b.rooms} → 재계산 ${f2.rooms}`);
    }
  });

  /* 5 — 사용중인데 붙어 있는 객실이 없는 시설. */
  fresh.forEach((b) => {
    if (b.st === 'used' && b.rooms === 0) info(`시설 ${b.label}`, '사용중이지만 연결된 객실이 0입니다');
  });

  /* 6 — 사용 여부 필드는 블록 상태와 같은 말을 해야 합니다. */
  fresh.forEach((b) => {
    const useField = b.fields.find((f) => f[0] === '사용 여부');
    if (!useField) return;
    const saysOff = useField[1].includes('안함') || useField[1].includes('불가');
    if (b.st === 'used' && saysOff) err(`시설 ${b.label}`, `상태는 사용중인데 사용 여부 필드는 "${useField[1]}"입니다`);
    if (b.st === 'off' && !saysOff) err(`시설 ${b.label}`, `상태는 사용안함인데 사용 여부 필드는 "${useField[1]}"입니다`);
  });

  /* 7 — 규칙 조각은 편집 왕복(파싱 → 재조립)에서 값이 변하지 않아야 합니다. */
  st.blocks.forEach((b) =>
    (b.rules ?? []).forEach((r, ri) => {
      r.slots.forEach((s) => {
        const round = composeVal(s.type, parseVal(s.type, slotText(s)));
        if (round !== slotText(s)) {
          err(`시설 ${b.label}`, `규칙 ${ri + 1} 조각 "${s.k}"가 편집 왕복에서 바뀝니다: "${slotText(s)}" → "${round}"`);
        }
      });
      if (r.tpl.match(/\{(\w+)\}/g)?.some((m) => !r.slots.some((s) => `{${s.k}}` === m))) {
        err(`시설 ${b.label}`, `규칙 ${ri + 1}에 값이 없는 자리표시자가 남아 있습니다: "${ruleText(r)}"`);
      }
    }),
  );

  /* 8 — 시설 값을 인용하는 FAQ는 그 시설이 살아 있는 동안 답이 채워져야 합니다. */
  st.faqs
    .filter((f) => !!f.tpl)
    .forEach((f) => {
      const rendered = renderFaq(f, fresh);
      if (rendered.derived && (rendered.a.includes('—') || rendered.a.includes('undefined'))) {
        err(`FAQ ${f.qid}`, `파생 답변이 값을 못 찾았습니다: "${rendered.a}"`);
      }
    });

  /* 9 — 꺼진 시설 때문이 아니라 그냥 비어 있는 답변은 채널 전송 전에 채워야 합니다. */
  const unanswered = st.faqs.map((f) => renderFaq(f, fresh)).filter((f) => f.reason === '답변 미입력');
  if (unanswered.length) {
    info('FAQ', `답변이 비어 채널 전송에서 빠지는 문항 ${unanswered.length}건 (${unanswered.slice(0, 3).map((f) => f.qid).join(', ')}${unanswered.length > 3 ? ' …' : ''})`);
  }

  /* 10 — 같은 객실명이 둘 이상이면 채널 상품이 어느 쪽인지 알 수 없습니다. */
  const names = new Map<string, number>();
  st.rooms.forEach((r) => names.set(r.short, (names.get(r.short) ?? 0) + 1));
  [...names].forEach(([n, c]) => c > 1 && err('객실', `객실명이 중복됩니다: ${n} × ${c}`));
  const codes = new Set(st.rooms.map((r) => r.code));
  if (codes.size !== st.rooms.length) err('객실', '객실코드가 중복됩니다');

  return v;
};

export const errorsOf = (st: MasterState) => audit(st).filter((x) => x.severity === 'error');
