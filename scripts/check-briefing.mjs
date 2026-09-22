/**
 * src/copy/briefing.ts 자체 점검. check-mappers와 같은 방식으로 한 파일만 tsc로 컴파일해 돌린다.
 *
 *   node scripts/check-briefing.mjs
 *
 * 브리핑은 분기가 많은데 화면에서는 그날 조건에 걸린 한 줄만 보인다.
 * 생리 1일차 문구가 언제 뜨는지 눈으로 확인하려면 날짜를 바꿔가며 앱을 열어야 해서, 여기서 대신 확인한다.
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
      'src/copy/briefing.ts',
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

  // 타입만 가져오는 import도 tsc는 따라가서, 출력 뿌리가 src/가 된다.
  const { buildBriefing } = await import(pathToFileURL(join(out, 'copy/briefing.js')).href);

  /** 아무 일도 없는 평범한 하루. 테스트마다 필요한 값만 덮어쓴다. */
  const plain = {
    persona: 'neutral',
    name: '은영',
    timeGreeting: '좋은 아침',
    water: 500,
    waterGoal: 1700,
    consumedKcal: 310,
    kcalGoal: 1600,
    exerciseMinutes: 0,
    burnedKcal: 0,
    periodOn: false,
    periodCycleDay: null,
    daysUntilPeriod: null,
    streakDays: 1,
  };

  // 받침 있는 인사는 "이에요", 없는 인사는 "예요".
  assert.equal(buildBriefing({ ...plain, timeGreeting: '늦은 밤' }).greeting, '늦은 밤이에요, 은영님');
  assert.equal(buildBriefing({ ...plain, timeGreeting: '나른한 오후' }).greeting, '나른한 오후예요, 은영님');

  // 기본 줄은 수분과 칼로리만. 걸음은 다루지 않는다.
  assert.equal(buildBriefing(plain).base, '오늘 310kcal · 물 500ml');
  assert.match(buildBriefing({ ...plain, persona: 'strict' }).base, /남은 칼로리 1,290kcal/);

  // 아무것도 기록하지 않은 날은 숫자 대신 권유 한 줄.
  const empty = { ...plain, water: 0, consumedKcal: 0 };
  assert.equal(buildBriefing(empty).base, '오늘 기록이 없어요.');
  assert.equal(buildBriefing({ ...empty, persona: 'friendly' }).base, '오늘 첫 기록을 남겨볼까요?');

  // 평범한 하루에는 이벤트 줄을 만들지 않는다. 빈 줄을 억지로 채우지 않으려고.
  assert.equal(buildBriefing(plain).event, null);

  // 생리 1일차가 가장 먼저다. 같은 날 운동을 많이 했어도 이쪽을 보여준다.
  const period1 = { ...plain, periodOn: true, periodCycleDay: 1, exerciseMinutes: 60, burnedKcal: 400 };
  assert.equal(buildBriefing(period1).event, '생리 1일차예요.');
  assert.match(buildBriefing({ ...period1, persona: 'strict' }).event, /강도 높은 운동은 미루세요/);

  // 기능을 끈 사람에게는 주기 값이 있어도 생리 이벤트를 만들지 않는다.
  assert.notEqual(buildBriefing({ ...period1, periodOn: false }).event, '생리 1일차예요.');

  // 예정 안내는 2일 전부터. 3일 전은 아직 이르다.
  const before = { ...plain, periodOn: true, periodCycleDay: 26, daysUntilPeriod: 2 };
  assert.equal(buildBriefing(before).event, '생리 예정 2일 전이에요.');
  assert.equal(buildBriefing({ ...before, daysUntilPeriod: 3 }).event, null);

  // 운동은 30분이나 300kcal 중 하나만 넘으면 된다.
  assert.equal(buildBriefing({ ...plain, exerciseMinutes: 30 }).event, '오늘 운동 30분, 소모 0kcal이에요.');
  assert.match(buildBriefing({ ...plain, exerciseMinutes: 10, burnedKcal: 300 }).event, /소모 300kcal/);
  assert.equal(buildBriefing({ ...plain, exerciseMinutes: 29, burnedKcal: 299 }).event, null);

  // 물 목표 달성. 목표가 0이면(설정 전) 달성으로 치지 않는다.
  assert.equal(buildBriefing({ ...plain, water: 1700 }).event, '물 목표를 채웠어요.');
  assert.equal(buildBriefing({ ...plain, water: 0, waterGoal: 0, consumedKcal: 310 }).event, null);

  // 연속 기록은 3일부터. 이틀은 흐름이라고 부르기 이르다.
  assert.equal(buildBriefing({ ...plain, streakDays: 3 }).event, '3일째 기록하고 있어요.');
  assert.equal(buildBriefing({ ...plain, streakDays: 2 }).event, null);

  console.log('브리핑 점검 통과');
} finally {
  rmSync(out, { recursive: true, force: true });
}
