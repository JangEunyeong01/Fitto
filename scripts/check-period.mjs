/**
 * src/utils/periodCycle.ts의 생리 기록 계산 자체 점검.
 *
 *   node scripts/check-period.mjs
 *
 * 기록 검사는 서버(PeriodService.validateLogs)와 같은 규칙이어야 하고,
 * 달력 띠는 기록·예측을 나누는 경계(진행 중, 마지막 주기 안, 기록 이전)에서 실수하기 쉽다.
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
    ['node_modules/typescript/bin/tsc', 'src/utils/periodCycle.ts', 'src/constants/periodTags.ts', '--outDir', out, '--rootDir', 'src', '--target', 'es2020', '--module', 'commonjs', '--skipLibCheck', '--ignoreConfig'],
    { stdio: 'inherit' }
  );
  const req = createRequire(import.meta.url);
  const p = req(join(out, 'utils', 'periodCycle.js'));
  const tags = req(join(out, 'constants', 'periodTags.js'));
  const today = '2026-10-03';

  // 1. 기록 검사 — 서버와 같은 규칙.
  const ok = [
    { start: '2026-07-10', end: '2026-07-15' },
    { start: '2026-08-08', end: '2026-08-12' },
    { start: '2026-09-06', end: null },
  ];
  assert.equal(p.checkLogs(ok, today), null);
  assert.match(p.checkLogs([{ start: '2026-09-01', end: '2026-09-05' }, { start: '2026-09-05', end: null }], today), /겹쳐/);
  assert.match(p.checkLogs([{ start: '2026-08-01', end: null }, { start: '2026-09-01', end: '2026-09-03' }], today), /진행 중/);
  assert.match(p.checkLogs([{ start: '2026-10-04', end: null }], today), /오늘 이후/);
  assert.match(p.checkLogs([{ start: '2026-09-01', end: '2026-09-16' }], today), /15일/, '16일은 안 된다');
  assert.equal(p.checkLogs([{ start: '2026-09-01', end: '2026-09-15' }], today), null, '15일까지는 된다');

  // 2. 평균 — 주기는 시작일 사이, 기간은 끝난 기록만.
  const stats = p.cycleStats(ok);
  assert.deepEqual(stats.cycles, [29, 29]);
  assert.equal(stats.avgCycle, 29);
  assert.equal(stats.avgLength, 6, '(6 + 5) / 2 = 5.5 → 6, 진행 중은 빠진다');
  assert.equal(stats.change, 0, '마지막 주기 29 - 앞 평균 29');
  assert.equal(p.cycleStats([ok[0]]).avgCycle, null, '기록 하나면 주기를 모른다');

  // 3. 설정 맞추기 — 마지막 시작일은 가장 최근, 주기·기간은 평균.
  const base = { lastStartDate: '2026-01-01', cycleLength: 28, periodLength: 5 };
  assert.deepEqual(p.deriveSettings(ok, base), { lastStartDate: '2026-09-06', cycleLength: 29, periodLength: 6 });
  assert.deepEqual(p.deriveSettings([], base), base, '기록이 없으면 그대로');

  // 4. 달력 띠.
  const s = p.deriveSettings(ok, base);
  const band = (k) => p.getBandDay(k, s, ok, today);
  assert.deepEqual(band('2026-07-12'), { type: 'period', predicted: false }, '지난 기록은 진하게');
  assert.equal(band('2026-07-20'), null, '기록 사이 예전 주기는 비운다');
  assert.deepEqual(band('2026-09-07'), { type: 'period', predicted: false }, '진행 중 기록, 오늘까지는 기록');
  assert.equal(band('2026-10-03')?.predicted ?? false, false);
  assert.deepEqual(band('2026-10-05'), { type: 'period', predicted: true }, '같은 생리에서 오늘 뒤는 예측');
  assert.deepEqual(band('2026-10-05').type, 'period');

  // 끝난 기록이면 평균 기간이 남아도 끝날 뒤는 비운다.
  const ended = [{ start: '2026-09-06', end: '2026-09-08' }];
  const s2 = { lastStartDate: '2026-09-06', cycleLength: 28, periodLength: 5 };
  assert.equal(p.getBandDay('2026-09-09', s2, ended, today), null, '끝났으면 거기까지');
  assert.deepEqual(p.getBandDay('2026-10-04', s2, ended, today), { type: 'period', predicted: true }, '다음 주기는 예측');

  // 기록이 없던 예전 데이터는 마지막 시작일부터 평균 기간을 기록으로 본다.
  assert.deepEqual(p.getBandDay('2026-09-07', s2, [], today), { type: 'period', predicted: false });

  // 5. 맨 위 한 줄.
  assert.equal(p.getPeriodHeadline('2026-09-08', s, ok), '생리 3일째');
  assert.equal(p.getPeriodHeadline('2026-09-20', s2, ended), '다음 생리까지 14일');

  // 6. 일일 기록 칩.
  assert.equal(tags.periodTagLabel('mood.happy'), '행복함');
  assert.equal(tags.periodTagLabel('custom.허벅지 당김'), '허벅지 당김', '직접 입력은 접두어를 뺀다');
  assert.equal(tags.periodTagLabel('cramp'), '복통', '예전 증상 코드도 그대로 읽힌다');
  assert.equal(tags.isRoughDay(['mood.tired']), true);
  assert.equal(tags.isRoughDay(['mood.happy', 'acne']), false);
  assert.deepEqual(
    tags.frequentTags([['cramp', 'mood.tired'], ['cramp'], ['mood.tired', 'acne'], ['cramp']]),
    ['cramp', 'mood.tired'],
    '두 번 이상, 많은 순'
  );
  // 코드는 서버 칸(30자)에 들어가야 한다.
  tags.PERIOD_TAG_GROUPS.flatMap((g) => g.options).forEach((o) => assert.ok(o.code.length <= 30, o.code));
  assert.ok(tags.CUSTOM_PREFIX.length + tags.CUSTOM_MAX <= 30);

  console.log('check-period: 모두 통과');
} finally {
  rmSync(out, { recursive: true, force: true });
}
