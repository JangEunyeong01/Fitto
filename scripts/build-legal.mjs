/**
 * 약관·개인정보처리방침 웹 페이지(site/)를 src/data/terms.ts에서 만든다. 스토어는 처리방침을 웹 주소로 요구한다.
 * 앱 문안과 웹이 따로 놀지 않게 원본은 terms.ts 하나다.
 *
 *   node scripts/build-legal.mjs          site/를 다시 만든다
 *   node scripts/build-legal.mjs --check  site/가 terms.ts와 같은지만 본다(npm run check)
 *
 * site/는 GitHub Pages로 올라간다(.github/workflows/pages.yml).
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { testerGuide } from './tester-guide.mjs';

const CHECK = process.argv.includes('--check');
const SITE = 'site';
const HISTORY = 'https://github.com/JangEunyeong01/Fitto/commits/main/src/data/terms.ts';
const out = mkdtempSync(join(tmpdir(), 'fitto-legal-'));

/** 문서 id → 웹 파일 이름. 처리방침 주소는 스토어에 등록하니 바꾸지 않는다. */
const FILES = { policy: 'privacy.html', terms: 'terms.html', privacy: 'consent-privacy.html', health: 'consent-health.html', deletion: 'delete-account.html', guide: 'beta.html' };

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/** 이스케이프한 글에서 https 주소만 링크로. 약관 본문에는 https가 없어 테스터 안내에만 걸린다. */
const linkify = (s) => esc(s).replace(/https:\/\/[^\s<]+/g, (u) => `<a href="${u}">${u}</a>`);

/** "· "로 시작하는 줄은 목록으로, 나머지는 문단으로. */
function body(text) {
  const html = [];
  let list = [];
  const flush = () => {
    if (list.length) html.push(`<ul>${list.map((l) => `<li>${linkify(l)}</li>`).join('')}</ul>`);
    list = [];
  };
  for (const line of text.split('\n')) {
    if (line.startsWith('· ')) list.push(line.slice(2));
    else {
      flush();
      html.push(`<p>${linkify(line)}</p>`);
    }
  }
  flush();
  return html.join('\n');
}

function page(title, main) {
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} · 피또</title>
<style>
:root { --bg: #f7f9fb; --text: #1c2430; --sub: #5b6573; --line: #e3e8ee; --link: #2f7fa8; }
@media (prefers-color-scheme: dark) { :root { --bg: #12161c; --text: #e8edf2; --sub: #a3adb9; --line: #2a313a; --link: #89c4e1; } }
body { margin: 0; background: var(--bg); color: var(--text); font: 16px/1.7 -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif; word-break: keep-all; }
main { max-width: 680px; margin: 0 auto; padding: 32px 16px 64px; }
h1 { font-size: 24px; margin: 0 0 4px; }
h2 { font-size: 17px; margin: 32px 0 8px; }
p, li { margin: 6px 0; }
ul { padding-left: 20px; }
.sub { color: var(--sub); font-size: 14px; }
a { color: var(--link); overflow-wrap: anywhere; }
footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid var(--line); }
</style>
</head>
<body>
<main>
${main}
</main>
</body>
</html>
`;
}

try {
  execFileSync(
    process.execPath,
    ['node_modules/typescript/bin/tsc', 'src/data/terms.ts', '--outDir', out, '--target', 'es2020', '--module', 'commonjs', '--skipLibCheck', '--ignoreConfig'],
    { stdio: 'inherit' }
  );
  const { ALL_DOCS, DELETION_DOC, PRIVACY_OFFICER } = createRequire(import.meta.url)(join(out, 'terms.js'));

  const files = {};
  const footer = `<footer class="sub"><a href="index.html">문서 목록</a> · <a href="${HISTORY}">변경 기록</a></footer>`;
  const docs = [...ALL_DOCS, DELETION_DOC];
  // 테스터 안내는 약관 목록(index)에는 넣지 않는다. 문의 메일은 약관과 같은 값을 쓴다.
  const guide = testerGuide(PRIVACY_OFFICER.email);
  for (const doc of [...docs, guide]) {
    const sections = doc.sections.map((s) => `<h2>${esc(s.heading)}</h2>\n${body(s.body)}`).join('\n');
    files[FILES[doc.id]] = page(doc.title, `<h1>${esc(doc.title)}</h1>\n${doc.effective ? `<p class="sub">시행일 ${esc(doc.effective)}</p>\n` : ''}${sections}\n${footer}`);
  }
  const links = docs.map((d) => `<li><a href="${FILES[d.id]}">${esc(d.title)}</a></li>`).join('\n');
  files['index.html'] = page('약관 및 정책', `<h1>피또 약관 및 정책</h1>\n<ul>\n${links}\n</ul>`);

  // 문서를 빼거나 파일 이름을 바꾸면 예전 HTML이 site/에 남아 계속 공개된다. 만들지 않는 .html은 남은 파일로 본다.
  const leftovers = existsSync(SITE) ? readdirSync(SITE).filter((f) => f.endsWith('.html') && !(f in files)) : [];

  if (CHECK) {
    // 윈도우 git은 받을 때 줄바꿈을 CRLF로 바꿀 수 있어서 맞춰서 비교한다.
    const read = (f) => readFileSync(join(SITE, f), 'utf8').replace(/\r\n/g, '\n');
    const stale = [...Object.keys(files).filter((f) => !existsSync(join(SITE, f)) || read(f) !== files[f]), ...leftovers];
    if (stale.length) {
      console.error(`약관 웹 페이지가 terms.ts와 달라요: ${stale.join(', ')} — npm run build:legal`);
      process.exit(1);
    }
    // 출시 전엔 비어 있어도 된다. 막지는 않고 잊지 않게만.
    if (!PRIVACY_OFFICER.name || !PRIVACY_OFFICER.email) console.warn('경고: 개인정보 보호책임자 이름·메일이 비어 있어요(출시 전에 채우기)');
    console.log('약관 웹 페이지 점검 통과');
  } else {
    mkdirSync(SITE, { recursive: true });
    for (const f of leftovers) unlinkSync(join(SITE, f));
    for (const [f, html] of Object.entries(files)) writeFileSync(join(SITE, f), html);
    console.log(`site/에 ${Object.keys(files).length}개 만듦`);
  }
} finally {
  rmSync(out, { recursive: true, force: true });
}
