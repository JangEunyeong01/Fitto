/**
 * src/utils/hangul.ts 자체 점검. check-mappers와 같은 방식으로 한 파일만 tsc로 컴파일해 돌린다.
 *
 *   node scripts/check-hangul.mjs
 *
 * 초성 규칙은 눈으로 못 본다. "ㄱㄷㄱ"가 깍두기를 찾는지, "ㄲ"가 김치를 안 찾는지를
 * 앱에서 확인하려면 매번 시트를 열고 자판을 쳐야 해서 여기서 대신 확인한다.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';

const out = mkdtempSync(join(tmpdir(), 'fitto-check-'));

try {
  // npx는 윈도우에서 셸을 거쳐야 해서 tsc 진입점을 node로 직접 부른다.
  execFileSync(
    process.execPath,
    [
      'node_modules/typescript/bin/tsc',
      'src/utils/hangul.ts',
      '--outDir',
      out,
      '--target',
      'es2020',
      '--module',
      'es2022',
      '--skipLibCheck',
      '--ignoreConfig',
    ],
    { stdio: 'inherit' }
  );

  const { matchRange, searchByName, chosungOf } = await import(pathToFileURL(join(out, 'hangul.js')).href);

  assert.equal(chosungOf('김'), 'ㄱ');
  assert.equal(chosungOf('빠'), 'ㅃ');
  assert.equal(chosungOf('a'), null);

  // 초성으로 찾기. 찾은 자리는 원래 글자 위치와 그대로 맞는다.
  assert.deepEqual(matchRange('김치찌개', 'ㄱㅊ'), { start: 0, length: 2 });
  assert.deepEqual(matchRange('양념 치킨', 'ㅊㅋ'), { start: 3, length: 2 });
  assert.equal(matchRange('김치찌개', 'ㄱㅈ'), null);

  // 글자를 그대로 쳐도 되고, 섞어 쳐도 된다.
  assert.deepEqual(matchRange('김치찌개', '치찌'), { start: 1, length: 2 });
  assert.deepEqual(matchRange('김치찌개', '김ㅊ'), { start: 0, length: 2 });

  // 된소리는 shift를 눌러야 나온다. "ㄱㄷㄱ"로 깍두기를 찾을 수 있어야 한다.
  assert.deepEqual(matchRange('깍두기', 'ㄱㄷㄱ'), { start: 0, length: 3 });
  // 반대는 열지 않는다 — 굳이 ㄲ를 쳤다면 된소리를 찾는 중이다.
  assert.equal(matchRange('김치', 'ㄲ'), null);

  // 영문 이름은 대소문자를 가리지 않는다.
  assert.deepEqual(matchRange('PT 체조', 'pt'), { start: 0, length: 2 });

  // 검색어가 이름보다 길면 볼 것도 없다.
  assert.equal(matchRange('밥', 'ㅂㅂ'), null);
  // 빈 검색어는 "찾은 자리 없음"이다(목록 거르기는 searchByName이 따로 처리한다).
  assert.equal(matchRange('김치', '  '), null);

  const items = [{ name: '양념 치킨' }, { name: '치킨' }, { name: '김치' }];

  // 빈 검색어면 전부, 순서도 그대로.
  const all = searchByName(items, '', (i) => i.name);
  assert.equal(all.length, 3);
  assert.equal(all[0].match, null);

  // 앞에서 걸린 것이 위로 온다. "치킨"이 "양념 치킨"보다 먼저.
  const hits = searchByName(items, 'ㅊㅋ', (i) => i.name);
  assert.deepEqual(hits.map((h) => h.item.name), ['치킨', '양념 치킨']);
  assert.deepEqual(hits[0].match, { start: 0, length: 2 });
  assert.deepEqual(hits[1].match, { start: 3, length: 2 });

  console.log('초성 검색 점검 통과');
} finally {
  rmSync(out, { recursive: true, force: true });
}
