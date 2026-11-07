/**
 * src/utils/goals.ts 점검 — 서버(GoalCalculatorTest)와 같은 예시 파일로 목표 칼로리·물 목표를 확인한다.
 * 같은 공식이 TypeScript와 Java에 따로 있어서, 둘이 어긋나는 순간 여기와 서버 테스트 중 한쪽이 깨진다.
 *
 *   node scripts/check-goals.mjs
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';

const CASES = 'server/src/test/resources/goal-cases.json';
const out = mkdtempSync(join(tmpdir(), 'fitto-check-'));

try {
  execFileSync(
    process.execPath,
    ['node_modules/typescript/bin/tsc', 'src/utils/goals.ts', '--outDir', out, '--target', 'es2020', '--module', 'commonjs', '--skipLibCheck', '--ignoreConfig'],
    { stdio: 'inherit' }
  );
  const { calculateGoals } = createRequire(import.meta.url)(join(out, 'utils/goals.js'));
  const { cases } = JSON.parse(readFileSync(CASES, 'utf8'));
  assert.ok(cases.length > 0, `${CASES}에 예시가 없어요`);

  for (const c of cases) {
    const r = calculateGoals(c);
    for (const field of ['bmr', 'tdee', 'kcal', 'water']) {
      assert.equal(r[field], c[field], `${c.name}: ${field}가 ${c[field]}여야 하는데 ${r[field]}`);
    }
  }

  console.log(`목표 계산 점검 통과 (서버와 같은 예시 ${cases.length}개)`);
} finally {
  rmSync(out, { recursive: true, force: true });
}
