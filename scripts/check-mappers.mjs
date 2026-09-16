/**
 * src/api/mappers.ts 자체 점검. 테스트 러너를 따로 붙이지 않고 tsc로 한 파일만 컴파일해 돌린다.
 *
 *   node scripts/check-mappers.mjs
 *
 * 매핑은 필드 이름이 양쪽에서 다르고(kcal ↔ calories) 눈으로는 틀린 걸 못 잡는다.
 * 서버를 붙이기 전까지 이 스크립트가 유일한 검증이다.
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
      'src/api/mappers.ts',
      '--outDir',
      out,
      '--target',
      'es2020',
      '--module',
      'es2022',
      '--skipLibCheck',
      // 파일을 직접 지정하면 tsconfig를 안 읽는데, TS6는 그걸 에러로 알린다.
      '--ignoreConfig',
    ],
    { stdio: 'inherit' }
  );

  const { toImportPayload, fromUser } = await import(pathToFileURL(join(out, 'api/mappers.js')).href);

  const snapshot = {
    dailyRecords: {
      '2026-09-16': {
        water: 500,
        steps: 0,
        meals: {
          breakfast: [
            { id: 'm1', name: '현미밥', amount: 2, unit: 'serving', servingLabel: '1공기 210g', kcal: 620 },
          ],
          lunch: [],
          dinner: [],
          snack: [],
        },
        mealMemos: { breakfast: '많이 먹음', lunch: '' },
        exercises: [{ id: 'w1', code: 'walking', name: '걷기', minutes: 20, kcal: 130 }],
        periodCondition: 'bad',
        periodSymptoms: ['cramp'],
      },
      '2026-09-15': {
        water: 0,
        steps: 6420,
        meals: { breakfast: [], lunch: [], dinner: [], snack: [] },
        exercises: [],
      },
    },
    weightLog: { '2026-09-16': 54.6 },
    periodSettings: { lastStartDate: '2026-09-05', cycleLength: 30, periodLength: 5 },
    periodSetupDone: true,
    recipes: [
      {
        id: 'r1',
        name: '닭가슴살 덮밥',
        photoUri: 'file:///tmp/a.jpg',
        ingredients: [{ name: '현미밥', grams: 210, kcal: 310 }],
        totalKcal: 475,
      },
    ],
    routines: [{ id: 'rt1', name: '아침 루틴', exercises: [{ code: 'walking', name: '걷기', minutes: 15 }] }],
    customIngredients: [{ name: '들기름', kcal100: 900, carbs100: 0, protein100: 0, fat100: 100 }],
  };

  const p = toImportPayload(snapshot);

  assert.deepEqual(p.meals, [
    {
      id: 'm1',
      date: '2026-09-16',
      mealType: 'breakfast',
      name: '현미밥',
      foodId: null,
      recipeId: null,
      amount: 2,
      unit: 'serving',
      servingLabel: '1공기 210g',
      calories: 620,
      carbs: null,
      protein: null,
      fat: null,
      sodium: null,
      sugar: null,
    },
  ]);
  // 빈 메모는 올리지 않는다.
  assert.deepEqual(p.mealMemos, [{ date: '2026-09-16', mealType: 'breakfast', memo: '많이 먹음' }]);
  assert.deepEqual(p.workouts, [
    { id: 'w1', date: '2026-09-16', exerciseCode: 'walking', name: '걷기', duration: 20, calories: 130, memo: null },
  ]);
  // 0인 날은 빠진다.
  assert.deepEqual(p.water, [{ date: '2026-09-16', amount: 500 }]);
  assert.deepEqual(p.steps, [{ date: '2026-09-15', steps: 6420 }]);
  assert.deepEqual(p.weights, [{ date: '2026-09-16', weight: 54.6 }]);
  assert.deepEqual(p.period.settings, { startDate: '2026-09-05', cycleLength: 30, periodLength: 5 });
  assert.deepEqual(p.period.daily, [
    { date: '2026-09-16', condition: 'bad', symptoms: ['cramp'], medication: null, memo: null },
  ]);
  assert.equal(p.recipes[0].photoUrl, null);
  assert.deepEqual(p.recipes[0].ingredients, [{ name: '현미밥', grams: 210, calories: 310 }]);
  assert.deepEqual(p.routines[0].exercises, [{ exerciseCode: 'walking', name: '걷기', duration: 15 }]);
  assert.equal(p.customIngredients[0].caloriesPer100g, 900);
  assert.equal(p.customIngredients[0].allergy, false);

  // 시작일을 고른 적이 없으면 주기 설정은 안 올린다(기본값을 사용자 값처럼 보내지 않는다).
  const noPeriod = toImportPayload({ ...snapshot, periodSetupDone: false });
  assert.equal(noPeriod.period.settings, undefined);
  assert.equal(noPeriod.period.daily.length, 1);

  const user = fromUser({
    userId: 'u1',
    email: 'a@b.c',
    name: '은영',
    gender: 'female',
    age: 26,
    height: 165,
    weight: 55,
    targetWeight: 52,
    birthday: { month: 3, day: 14 },
    activityLevel: 'light',
    goal: 'lose_weight',
    diseases: ['diabetes'],
    customDiseases: [],
    preferredFoods: ['korean'],
    customPreferredFoods: [],
    allergies: ['nuts'],
    customAllergies: ['오이'],
    personality: 'friendly',
    workoutPreference: { intensity: 'normal', equipment: 'bodyweight', focus: 'full' },
    periodEnabled: true,
    goals: { targetCalorie: 1424, waterGoal: 1800, waterGoalCustom: false, stepGoal: 8000, cupSize: 250 },
    startedAt: '2026-08-01T09:00:00Z',
    createdAt: '2026-09-12T03:00:00Z',
    updatedAt: '2026-09-12T03:00:00Z',
  });

  assert.equal(user.profile.nickname, '은영');
  assert.equal(user.profile.birthdayMonth, 3);
  assert.equal(user.profile.activity, 'light');
  assert.equal(user.profile.conditions[0], 'diabetes');
  assert.equal(user.profile.customAllergies[0], '오이');
  assert.deepEqual(user.goals, { kcal: 1424, water: 1800, steps: 8000, cup: 250 });
  assert.equal(user.persona, 'friendly');
  assert.equal(user.periodOn, true);

  console.log('매핑 점검 통과');
} finally {
  rmSync(out, { recursive: true, force: true });
}
