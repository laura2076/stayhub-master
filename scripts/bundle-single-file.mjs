/* Package `dist/` as one self-contained HTML file for hosts that serve a single
 * document under a strict CSP (no external CSS, JS, or font requests).
 *
 * Run `npm run build` first, then: node scripts/bundle-single-file.mjs <out.html> [fonts.css] */
import fs from 'node:fs';
import path from 'node:path';

const [, , outPath, fontsPath] = process.argv;
if (!outPath) {
  console.error('usage: node scripts/bundle-single-file.mjs <out.html> [inlined-fonts.css]');
  process.exit(1);
}

const dist = 'dist';
const indexHtml = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');

const cssHref = indexHtml.match(/href="\/?(assets\/[^"]+\.css)"/)?.[1];
const jsSrc = indexHtml.match(/src="\/?(assets\/[^"]+\.js)"/)?.[1];
if (!cssHref || !jsSrc) throw new Error('dist/index.html has no asset links — run `npm run build` first');

let css = fs.readFileSync(path.join(dist, cssHref), 'utf8');

/* Drop the webfont @import: the CSP blocks font CDNs, and the faces are inlined below.
 * Matching has to run to the semicolon that ends the statement, not the first semicolon
 * in the file — Google Fonts URLs carry them inside the query string (`wght@400;500;700`).
 * Getting this wrong leaves a fragment that swallows the next rule, and the next rule is
 * the token block the whole design system hangs off. */
const IMPORT = /@import\s*(?:url\(\s*(?:"[^"]*"|'[^']*'|[^)]*)\s*\)|"[^"]*"|'[^']*')[^;]*;/g;
const removed = css.match(IMPORT) ?? [];
css = css.replace(IMPORT, '');

if (/@import/.test(css)) throw new Error('an @import survived the strip — it would fail under CSP');
if (!/:root\s*\{[^}]*--color-bg/.test(css)) {
  throw new Error('token block missing from the bundled CSS — the strip damaged the stylesheet');
}

const fonts = fontsPath ? fs.readFileSync(fontsPath, 'utf8') : '';
/* Only a real fetch matters — the licence header names its source URL in a comment. */
if (/url\(\s*['"]?https?:/i.test(fonts)) throw new Error('font CSS still fetches from a URL — inline the faces as data URIs');

/* A "</script" inside a string literal would end the tag early. */
const js = fs.readFileSync(path.join(dist, jsSrc), 'utf8').split('</script').join('<\\/script');

const out = `<meta charset="utf-8">
<title>STAYHUB 마스터 · 숙소·객실</title>
${fonts ? `<style>\n${fonts}\n</style>` : ''}
<style>
${css}
</style>
<div id="root"></div>
<script type="module">
${js}
</script>
`;

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, out);
console.log(`${outPath} · ${(out.length / 1024).toFixed(0)}KB · @import 제거 ${removed.length}건 · 토큰 블록 확인됨`);
