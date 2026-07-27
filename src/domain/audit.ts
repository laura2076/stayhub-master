import { attrDef, attrOption, attrsOf, feeOf, isOwn, valueOf } from './attrs';
import { deriveBlocks, roomCount, ruleText, slotText } from './derive';
import { renderFaq } from './faq';
import { composeVal, parseVal } from './fieldTypes';
import type { MasterState, Property, Violation } from './types';

/** 이 콘솔이 어떤 조작 뒤에도 지키겠다고 한 규칙들.
 *
 *  검사는 속성 사전을 따라 돕니다 — 바베큐·스파를 이름으로 찾지 않습니다. 그래서
 *  숙소가 캠핑장만 갖든 수영장만 갖든, 새 속성이 사전에 추가되든 같은 검사가 그대로
 *  걸립니다. 1000개를 사람이 눈으로 볼 수 없으니 검사가 대신 봅니다. */
export const auditProperty = (p: Property): Violation[] => {
  const v: Violation[] = [];
  const at = (where: string, what: string) => v.push({ severity: 'error', where: `${p.name} · ${where}`, what });
  const info = (where: string, what: string) => v.push({ severity: 'info', where: `${p.name} · ${where}`, what });
  const defs = attrsOf(p);

  /* 1 — 이 숙소가 쓰는 속성은 전사 사전에 있어야 하고, 기본값이 정해져 있어야 합니다. */
  p.attrs.forEach((key) => {
    const d = attrDef(key);
    if (!d) return at('속성', `사전에 없는 속성입니다: ${key}`);
    if (p.defaults[key] === undefined) at('속성', `${d.label}의 숙소 전체값이 없습니다`);
  });

  /* 2 — 값은 그 속성이 허용하는 것이어야 합니다. 선택지 밖의 코드나 범위 밖의 숫자는
         화면에서 "—"로 조용히 사라지므로, 여기서 잡지 않으면 아무도 모릅니다. */
  const checkValue = (where: string, key: string, val: unknown) => {
    const d = attrDef(key);
    if (!d || val === undefined) return;
    if (d.kind === 'option') {
      if (!attrOption(key, val as string)) at(where, `${d.label}에 없는 값입니다: "${String(val)}"`);
      return;
    }
    const n = Number(val);
    if (!Number.isFinite(n)) return at(where, `${d.label}이 숫자가 아닙니다: "${String(val)}"`);
    if (d.kind === 'int' && d.min !== undefined && n < d.min) at(where, `${d.label} ${n}${d.unit}은 최소 ${d.min}${d.unit}보다 작습니다`);
    if (d.kind === 'int' && d.max !== undefined && n > d.max) at(where, `${d.label} ${n}${d.unit}은 최대 ${d.max}${d.unit}보다 큽니다`);
    if (d.kind === 'money' && n < 0) at(where, `${d.label}이 음수입니다: ${n}`);
  };

  defs.forEach((d) => checkValue('숙소 전체값', d.key, p.defaults[d.key]));
  p.rooms.forEach((r) =>
    Object.entries(r.values).forEach(([key, val]) => {
      if (!p.attrs.includes(key)) at(`객실 ${r.name}`, `이 숙소가 쓰지 않는 속성에 값이 있습니다: ${key}`);
      checkValue(`객실 ${r.name}`, key, val);
    }),
  );

  /* 3 — 기준 인원이 최대 인원보다 많을 수는 없습니다. 숫자로 직접 넣게 한 값에서
         가장 흔한 실수라, 목록이던 시절에는 없던 검사가 필요해집니다. */
  if (p.attrs.includes('capacity_base') && p.attrs.includes('capacity_max')) {
    p.rooms.forEach((r) => {
      const base = Number(valueOf(p, r, 'capacity_base'));
      const max = Number(valueOf(p, r, 'capacity_max'));
      if (base > max) at(`객실 ${r.name}`, `기준 인원 ${base}명이 최대 인원 ${max}명보다 많습니다`);
    });
  }

  /* 4 — 요금은 요금이 붙는 속성의 모든 선택지에 있어야 합니다 (없으면 "—"). */
  defs
    .filter((d) => d.kind === 'option' && d.feeBearing)
    .forEach((d) => {
      if (d.kind !== 'option') return;
      const used = new Set(p.rooms.map((r) => String(valueOf(p, r, d.key))));
      d.options.forEach((o) => {
        /** "없음"·"불가"는 요금이 없는 것이 정상입니다 — 비었다고 알릴 이유가 없습니다. */
        if (o.code !== 'none' && used.has(o.code) && feeOf(p, d.key, o.code) === '—') {
          info(`요금표 ${d.label}`, `"${o.label}"을(를) 쓰는 객실이 있는데 요금이 비어 있습니다`);
        }
      });
    });

  /* 5 — "따로 정함" 표시는 "숙소 전체값과 다르다"와 정확히 같은 뜻이어야 합니다.
         같은 값을 굳이 따로 적어 두면, 전체값을 바꿔도 이 객실만 안 따라옵니다. */
  p.rooms.forEach((r) =>
    defs.forEach((d) => {
      if (isOwn(r, d.key) && r.values[d.key] === p.defaults[d.key]) {
        at(`객실 ${r.name}`, `${d.label}이 전체값과 같은데 따로 정한 값으로 저장돼 있습니다`);
      }
    }),
  );

  /* 6 — 자동 계산 필드는 지금 객실 목록으로 다시 계산한 값과 같아야 합니다. */
  const fresh = deriveBlocks(p);
  p.blocks.forEach((b, i) => {
    const f2 = fresh[i];
    b.fields.forEach((f, fi) => {
      if (f2.fields[fi] && f[1] !== f2.fields[fi][1]) {
        at(`시설 ${b.label}`, `자동 계산 필드가 낡았습니다 · ${f[0]}: "${f[1]}" → 다시 계산 "${f2.fields[fi][1]}"`);
      }
    });
    if (b.st !== f2.st) at(`시설 ${b.label}`, `쓰는지 여부가 낡았습니다: ${b.st} → 다시 계산 ${f2.st}`);
  });

  /* 7 — 시설이 가려내기 규칙을 가졌다면, 그 규칙이 가리키는 속성을 이 숙소가 써야 합니다. */
  p.blocks.forEach((b) => {
    if (!b.memberOf) return;
    if (!p.attrs.includes(b.memberOf.attr)) {
      at(`시설 ${b.label}`, `이 숙소가 쓰지 않는 속성으로 객실을 가려냅니다: ${b.memberOf.attr}`);
      return;
    }
    b.memberOf.codes.forEach((c) => {
      if (!attrOption(b.memberOf!.attr, c)) at(`시설 ${b.label}`, `가려내기 규칙에 없는 값이 있습니다: "${c}"`);
    });
  });

  /* 8 — 쓰는 중인데 붙어 있는 객실이 없는 시설. */
  fresh.forEach((b) => {
    if (b.st === 'used' && roomCount(p, b) === 0) info(`시설 ${b.label}`, '쓰는 중인데 이어진 객실이 0입니다');
  });

  /* 9 — 사용 여부 필드는 시설 상태와 같은 말을 해야 합니다. */
  fresh.forEach((b) => {
    const useField = b.fields.find((f) => f[0] === '사용 여부');
    if (!useField) return;
    const saysOff = useField[1].includes('안함') || useField[1].includes('불가');
    if (b.st === 'used' && saysOff) at(`시설 ${b.label}`, `상태는 쓰는 중인데 사용 여부는 "${useField[1]}"입니다`);
    if (b.st === 'off' && !saysOff) at(`시설 ${b.label}`, `상태는 안 씀인데 사용 여부는 "${useField[1]}"입니다`);
  });

  /* 10 — 안내 문구 조각은 편집 왕복(읽기 → 다시 쓰기)에서 값이 변하지 않아야 합니다. */
  p.blocks.forEach((b) =>
    (b.rules ?? []).forEach((r, ri) => {
      r.slots.forEach((s) => {
        const round = composeVal(s.type, parseVal(s.type, slotText(s)));
        if (round !== slotText(s)) {
          at(`시설 ${b.label}`, `문구 ${ri + 1}의 "${s.k}"가 편집 왕복에서 바뀝니다: "${slotText(s)}" → "${round}"`);
        }
      });
      if (r.tpl.match(/\{(\w+)\}/g)?.some((m) => !r.slots.some((s) => `{${s.k}}` === m))) {
        at(`시설 ${b.label}`, `문구 ${ri + 1}에 값이 없는 자리가 남아 있습니다: "${ruleText(r)}"`);
      }
    }),
  );

  /* 11 — 시설 값을 인용하는 질문은 그 시설이 살아 있는 동안 답이 채워져야 합니다. */
  p.faqs
    .filter((f) => !!f.tpl)
    .forEach((f) => {
      const rendered = renderFaq(f, fresh);
      if (rendered.derived && (rendered.a.includes('—') || rendered.a.includes('undefined'))) {
        at(`질문 ${f.qid}`, `자동 답변이 값을 못 찾았습니다: "${rendered.a}"`);
      }
    });

  /* 12 — 손으로 쓴 답변이 인원을 숫자로 인용하는데, 그 숫자가 이 숙소의 인원이 아닌 경우.
         인원을 숫자로 넣게 한 이상 "최대 4명까지 가능합니다" 같은 문장은 인원을 올리는 순간
         조용히 거짓말이 됩니다. 시설 값을 인용하는 답변(tpl)은 저절로 따라오므로 검사에서 빠집니다. */
  const capacities = new Set(
    ['capacity_base', 'capacity_max']
      .filter((k) => p.attrs.includes(k))
      .flatMap((k) => p.rooms.map((r) => Number(valueOf(p, r, k)))),
  );
  if (capacities.size) {
    p.faqs
      .filter((f) => !f.tpl && f.a)
      .forEach((f) => {
        const aboutPeople = /인원|입실|명까지/.test(`${f.q}${f.a}`);
        if (!aboutPeople) return;
        const cited = [...f.a.matchAll(/(\d+)\s*명/g)].map((m) => Number(m[1]));
        const stale = cited.filter((n) => !capacities.has(n));
        if (stale.length) {
          info(
            `질문 ${f.qid}`,
            `손으로 쓴 답변이 ${stale.join('명, ')}명을 말하는데 이 숙소의 인원(${[...capacities]
              .sort((a2, b2) => a2 - b2)
              .join(', ')}명)에 없습니다: "${f.a}"`,
          );
        }
      });
  }

  /* 13 — 꺼진 시설 때문이 아니라 그냥 비어 있는 답변. */
  const unanswered = p.faqs.map((f) => renderFaq(f, fresh)).filter((f) => f.reason === '답변 미입력');
  if (unanswered.length) {
    info(
      '질문·답변',
      `답변이 비어 판매 사이트에서 빠지는 문항 ${unanswered.length}건 (${unanswered
        .slice(0, 3)
        .map((f) => f.qid)
        .join(', ')}${unanswered.length > 3 ? ' …' : ''})`,
    );
  }

  /* 14 — 같은 객실명·객실코드가 둘 이상이면 판매 사이트 상품이 어느 쪽인지 알 수 없습니다. */
  const names = new Map<string, number>();
  p.rooms.forEach((r) => names.set(r.name, (names.get(r.name) ?? 0) + 1));
  [...names].forEach(([n, c]) => c > 1 && at('객실', `객실명이 겹칩니다: ${n} × ${c}`));
  if (new Set(p.rooms.map((r) => r.code)).size !== p.rooms.length) at('객실', '객실코드가 겹칩니다');

  return v;
};

/** 1000개 전체 검사. 화면은 한 곳만 보지만 검사는 전부 봅니다. */
export const audit = (st: MasterState): Violation[] => st.properties.flatMap(auditProperty);

export const errorsOf = (st: MasterState) => audit(st).filter((x) => x.severity === 'error');
