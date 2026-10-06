/**
 * src/notifications/plan.ts 자체 점검. check-briefing과 같은 방식으로 한 파일만 tsc로 컴파일해 돌린다.
 *
 *   node scripts/check-notify.mjs
 *
 * 알림은 폰에서 시간이 돼야 울려서 눈으로 확인하기 어렵다. 방해 금지·자정·지난 시각 같은 경우를 여기서 본다.
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
    [
      'node_modules/typescript/bin/tsc',
      'src/notifications/plan.ts',
      '--outDir', out,
      '--target', 'es2020',
      // plan.ts는 다른 파일(문구·주기 계산)을 불러온다. ESM은 import 경로에 .js가 있어야 해서 CommonJS로 뽑는다.
      '--module', 'commonjs',
      '--skipLibCheck',
      '--ignoreConfig',
    ],
    { stdio: 'inherit' }
  );
  const { planNotifications, inQuiet } = createRequire(import.meta.url)(join(out, 'notifications/plan.js'));

  const off = {
    water: false, waterEvery: 2, meal: false, mealTimes: ['08:00', '12:30', '19:00'], move: false, moveAfter: 60,
    weigh: false, report: false, quiet: true, quietFrom: '22:30', quietTo: '07:00', period: false, periodPreview: false,
  };
  /** 2026-10-07(수) 06:00. 테스트마다 필요한 값만 덮어쓴다. */
  const base = (over = {}) => ({
    now: new Date(2026, 9, 7, 6, 0),
    alarms: off,
    persona: 'neutral',
    waterGoal: 2000,
    waterByDate: {},
    mealsLogged: {},
    period: { on: false, setupDone: false, settings: { lastStartDate: '2026-09-20', cycleLength: 28, periodLength: 5 } },
    ...over,
  });
  const hhmm = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const day = (d) => `${d.getMonth() + 1}/${d.getDate()}`;

  // 1. 다 꺼져 있으면 아무것도 없다.
  assert.equal(planNotifications(base()).length, 0);

  // 2. 방해 금지: 자정을 넘는 구간.
  assert.equal(inQuiet(23 * 60, off), true, '23:00은 방해 금지');
  assert.equal(inQuiet(6 * 60 + 59, off), true, '06:59는 방해 금지');
  assert.equal(inQuiet(7 * 60, off), false, '07:00부터는 깨어 있음');
  assert.equal(inQuiet(23 * 60, { ...off, quiet: false }), false, '방해 금지를 끄면 아무 때나');

  // 3. 물: 07:00 기상 + 2시간마다 → 09·11·13·15·17·19·21시. 22:30부터 방해 금지.
  const water = planNotifications(base({ alarms: { ...off, water: true } })).filter((n) => n.id.startsWith('water'));
  const today = water.filter((n) => day(n.at) === '10/7').map((n) => hhmm(n.at));
  assert.deepEqual(today, ['09:00', '11:00', '13:00', '15:00', '17:00', '19:00', '21:00']);
  assert.equal(new Set(water.map((n) => day(n.at))).size, 3, '물은 사흘치');
  assert.match(water[0].body, /2000ml/, '오늘 남은 양이 문구에 들어간다');

  // 4. 지난 시각은 빼고, 오늘 마신 만큼 문구가 바뀐다.
  const afternoon = planNotifications(
    base({ now: new Date(2026, 9, 7, 14, 0), alarms: { ...off, water: true }, waterByDate: { '2026-10-07': 1500 } })
  ).filter((n) => day(n.at) === '10/7');
  assert.deepEqual(afternoon.map((n) => hhmm(n.at)), ['15:00', '17:00', '19:00', '21:00']);
  assert.match(afternoon[0].body, /500ml/);

  // 5. 오늘 목표를 채웠으면 오늘 물 알림은 없다. 내일 것은 남는다.
  const done = planNotifications(base({ alarms: { ...off, water: true }, waterByDate: { '2026-10-07': 2000 } }));
  assert.equal(done.filter((n) => day(n.at) === '10/7').length, 0);
  assert.ok(done.some((n) => day(n.at) === '10/8'));

  // 6. 식사: 기록한 끼니는 빠진다.
  const meals = planNotifications(base({ alarms: { ...off, meal: true }, mealsLogged: { '2026-10-07': ['breakfast'] } }));
  const todayMeals = meals.filter((n) => day(n.at) === '10/7').map((n) => n.title);
  assert.deepEqual(todayMeals, ['점심 기록', '저녁 기록']);

  // 7. 방해 금지 시간에 걸린 식사 알림은 예약하지 않는다(늦은 저녁 23:00).
  const late = planNotifications(base({ alarms: { ...off, meal: true, mealTimes: ['08:00', '12:30', '23:00'] } }));
  assert.ok(!late.some((n) => n.title === '저녁 기록'));

  // 8. 체중은 월요일, 리포트는 일요일. 수요일 기준 일주일 안에 하나씩.
  const weekly = planNotifications(base({ alarms: { ...off, weigh: true, report: true } }));
  assert.deepEqual(weekly.map((n) => `${n.title} ${day(n.at)} ${hhmm(n.at)}`), ['주간 리포트 10/11 20:00', '체중 기록 10/12 08:30']);

  // 9. 생리: 다음 시작일(10/18) 하루 전 09:00. 내용 숨기기가 기본.
  const periodOn = { on: true, setupDone: true, settings: { lastStartDate: '2026-09-20', cycleLength: 28, periodLength: 5 } };
  const hidden = planNotifications(base({ now: new Date(2026, 9, 14, 6, 0), alarms: { ...off, period: true }, period: periodOn }));
  assert.equal(hidden.length, 1);
  assert.equal(`${day(hidden[0].at)} ${hhmm(hidden[0].at)}`, '10/17 09:00');
  assert.equal(hidden[0].title, '피또');
  assert.doesNotMatch(hidden[0].body, /생리/, '숨기기를 고르면 잠금화면에 "생리"가 안 보인다');

  const shown = planNotifications(base({ now: new Date(2026, 9, 14, 6, 0), alarms: { ...off, period: true, periodPreview: true }, period: periodOn }));
  assert.match(shown[0].body, /생리/);

  // 10. 생리 기능이 꺼져 있거나 설정 전이면 알림도 없다.
  assert.equal(planNotifications(base({ now: new Date(2026, 9, 14, 6, 0), alarms: { ...off, period: true }, period: { ...periodOn, on: false } })).length, 0);
  assert.equal(planNotifications(base({ now: new Date(2026, 9, 14, 6, 0), alarms: { ...off, period: true }, period: { ...periodOn, setupDone: false } })).length, 0);

  // 11. 물 알림이 다른 알림과 30분 안에 겹치면 물 쪽을 뺀다(저녁 19:00과 물 19:00이 같이 울리던 것).
  const mixed = planNotifications(base({ alarms: { ...off, water: true, meal: true } }))
    .filter((n) => day(n.at) === '10/7')
    .map((n) => `${hhmm(n.at)} ${n.title}`);
  assert.deepEqual(mixed, [
    '08:00 아침 기록', '09:00 물 마시기', '11:00 물 마시기', '12:30 점심 기록', '13:00 물 마시기',
    '15:00 물 마시기', '17:00 물 마시기', '19:00 저녁 기록', '21:00 물 마시기',
  ]);

  // 12. 다 켜도 iOS 예약 한도(64)를 넘지 않는다.
  const all = planNotifications(base({ alarms: { ...off, water: true, waterEvery: 1, meal: true, weigh: true, report: true, quiet: false, period: true }, period: periodOn }));
  assert.ok(all.length <= 64, `예약 ${all.length}개 — 64개를 넘었다`);
  assert.equal(new Set(all.map((n) => n.id)).size, all.length, 'id가 겹치면 예약이 덮어써진다');

  console.log(`알림 계획 점검 통과 (최대 ${all.length}개 예약)`);
} finally {
  rmSync(out, { recursive: true, force: true });
}
