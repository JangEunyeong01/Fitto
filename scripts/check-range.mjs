/**
 * src/utils/dateRange.ts의 rangeSeries(직접 고른 날짜 구간의 막대 묶음) 자체 점검.
 *
 *   node scripts/check-range.mjs
 *
 * 구간 길이에 따라 막대 단위(하루·일주일·한 달)가 바뀌고, 경계(31일, 183일)에서 실수하기 쉽다.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';

const out = mkdtempSync(join(tmpdir(), 'fitto-check-'));

try {
  execFileSync(
    process.execPath,
    ['node_modules/typescript/bin/tsc', 'src/utils/dateRange.ts', '--outDir', out, '--target', 'es2020', '--module', 'commonjs', '--skipLibCheck', '--ignoreConfig'],
    { stdio: 'inherit' }
  );
  const { rangeSeries } = createRequire(import.meta.url)(join(out, 'dateRange.js'));

  const water = { '2026-10-01': 1000, '2026-10-03': 500, '2026-10-31': 200, '2026-11-01': 300 };
  const series = (s, e) => rangeSeries(s, e, (k) => water[k] ?? 0, (k) => (water[k] ?? 0) > 0);

  // 1. 한 달 이하 → 하루 막대. 시작·끝 포함.
  const d = series('2026-10-01', '2026-10-31');
  assert.equal(d.unit, 'day');
  assert.equal(d.values.length, 31, '10/1~10/31은 31칸');
  assert.equal(d.values[0], 1000);
  assert.equal(d.values[30], 200, '끝 날짜도 들어간다');
  assert.equal(d.recordedDays, 3);
  assert.ok(d.labels.filter(Boolean).length <= 8, '라벨은 몇 개만');

  // 2. 32일 → 일주일 막대(경계).
  const w = series('2026-10-01', '2026-11-01');
  assert.equal(w.unit, 'week');
  assert.equal(w.values.reduce((a, v) => a + v, 0), 2000, '합은 그대로');
  assert.equal(w.values.length, 5);

  // 3. 반년 넘으면 한 달 막대.
  const m = series('2026-01-01', '2026-11-30');
  assert.equal(m.unit, 'month');
  assert.equal(m.labels.length, 11);
  assert.equal(m.labels[9], '10월');
  assert.equal(m.values[9], 1700);

  // 4. 하루짜리 구간도 된다.
  assert.equal(series('2026-10-03', '2026-10-03').values[0], 500);

  // 5. 연도를 넘는 구간.
  const y = series('2025-12-20', '2026-01-10');
  assert.equal(y.values.length, 22);

  console.log('기간 막대 점검 통과');
} finally {
  rmSync(out, { recursive: true, force: true });
}
