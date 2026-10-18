// 피또 캐릭터 SVG(성격 3 × 상황 11) → src/theme/fittoSvgs.ts.
// 원본에 붙은 메타데이터와 크기·접근성 속성을 떼고 문자열로 담는다(308KB → 48KB).
// 그림은 저장소에 올리지 않는다 — 결과 파일은 .gitignore에 있고, 앱 빌드에는 .easignore로 들어간다.
//
//   node scripts/build-fitto-svgs.mjs [원본 svg 폴더]
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const src = process.argv[2] ?? 'Claude outputs/fitto_character/v3_방향3/svg';
const out = 'src/theme/fittoSvgs.ts';
// 디자인 파일의 calm(차분형)은 앱 키로 neutral이다.
const PERSONA = { friendly: 'friendly', strict: 'strict', calm: 'neutral' };
const STATES = ['hello', 'water0_dry', 'water1_thirsty', 'water2_normal', 'water3_fresh', 'water4_full', 'empty', 'laydown_puddle', 'birthday', 'lock', 'period_care'];

const data = {};
let before = 0;
let after = 0;
for (const f of readdirSync(src)) {
  const m = f.match(/^fitto_(friendly|strict|calm)_(.+)\.svg$/);
  if (!m) continue;
  if (!STATES.includes(m[2])) throw new Error('모르는 상황: ' + f);
  const raw = readFileSync(join(src, f), 'utf8');
  const svg = raw
    .replace(/<metadata>[\s\S]*?<\/metadata>/, '')
    .replace(/\s(width|height|role|aria-label|xmlns:c2pa)="[^"]*"/g, '')
    .replace(/>\s+</g, '><')
    .trim();
  if (svg.includes('`') || svg.includes('${')) throw new Error('템플릿 문자열에 못 넣음: ' + f);
  (data[PERSONA[m[1]]] ??= {})[m[2]] = svg;
  before += raw.length;
  after += svg.length;
}
for (const p of Object.values(PERSONA)) for (const s of STATES) if (!data[p]?.[s]) throw new Error(`빠짐: ${p} ${s}`);

let ts = `// 피또 v3 캐릭터 그림(성격 3 × 상황 11). scripts/build-fitto-svgs.mjs가 만든 파일 — 직접 고치지 않는다.
// 그림은 저장소에 올리지 않는다(.gitignore). 고르는 건 theme/assets.ts의 getFittoSvg로.
// 원본 viewBox는 0 -24 200 244 — 머리끝 선이 위로 24만큼 나와 있다.

export const FITTO_SVGS = {\n`;
for (const p of Object.values(PERSONA)) {
  ts += `  ${p}: {\n`;
  for (const s of STATES) ts += `    ${s}: \`${data[p][s]}\`,\n`;
  ts += '  },\n';
}
ts += '} as const;\n';
writeFileSync(out, ts);
console.log(`피또 그림 ${Object.keys(data).length}×${STATES.length}장, ${before} → ${after} bytes → ${out}`);
