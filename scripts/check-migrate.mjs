/**
 * src/store/appMigrate.ts 자체 점검 — 옛 버전으로 저장된 기기 상태가 지금 모양으로 옮겨지는지.
 * 마이그레이션은 사용자 기록을 직접 바꾸는 곳이라, 버전별 옛 저장본 예시로 "옮긴 뒤 모양"을 확인한다.
 *
 *   node scripts/check-migrate.mjs
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';

const out = mkdtempSync(join(tmpdir(), 'fitto-check-'));

try {
  // 다른 파일을 실제로 불러서(코드 표·날짜 함수) CommonJS로 만든다 — ESM으로 만들면 확장자 없는 import를 node가 못 찾는다.
  execFileSync(
    process.execPath,
    ['node_modules/typescript/bin/tsc', 'src/store/appMigrate.ts', '--outDir', out, '--target', 'es2020', '--module', 'commonjs', '--skipLibCheck', '--ignoreConfig'],
    { stdio: 'inherit' }
  );
  const { migrateAppState, APP_STORAGE_VERSION } = createRequire(import.meta.url)(join(out, 'store/appMigrate.js'));
  const { DEFAULT_CARD_ORDER } = createRequire(import.meta.url)(join(out, 'constants/homeCards.js'));

  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
  const pad = (n) => String(n).padStart(2, '0');
  const key = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const daysAgo = (n) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return key(d);
  };

  assert.equal(APP_STORAGE_VERSION, 10, '버전을 올렸으면 이 점검에 그 버전의 옛 저장본 예시를 더한다');

  // 저장본이 없으면 그대로.
  assert.equal(migrateAppState(undefined, 0), undefined);

  // ---------- v0: 라벨로 저장하던 시절의 저장본 → 지금 모양 ----------
  const v0 = migrateAppState(
    {
      profile: {
        nickname: '피또',
        gender: '여성',
        activity: '보통이에요',
        goalType: '체중 감량',
        conditions: ['당뇨', '손목 터널 증후군'],
        allergies: ['견과류', '키위'],
      },
      obInfo: { gender: '여성' },
      obPick: { activity: '보통이에요', goal: '체중 감량' },
      obTags: { health: ['당뇨'], taste: ['한식', '비건식'], avoid: ['견과류'] },
      dailyRecords: {
        '2026-09-05': { water: 0, steps: 0, meals: {}, exercises: [], periodSymptoms: ['mood.happy'], periodCondition: 'good' },
        '2026-09-03': {
          water: 500,
          steps: 0,
          meals: {
            아침: [{ id: '1693700000000', name: '현미밥', amount: '1공기 210g × 2', kcal: 620 }],
            점심: [{ id: '1693700000001', name: '사과', amount: '150g', kcal: 80 }],
          },
          mealMemos: { 아침: '많이 먹음' },
          exercises: [{ id: '1693700000002', name: '걷기', minutes: 20, kcal: 80 }],
          periodSymptoms: ['생리통', '허리 묵직'],
          periodCondition: 'bad',
        },
      },
      cardOrder: ['kcal', 'water', 'act', 'steps', 'ex', 'week', 'period'],
      cardHidden: ['steps'],
      onboardingDone: true,
      recipes: [{ id: 'r-old', name: '샐러드' }],
      routines: [{ id: '42', name: '하체' }],
      periodSettings: { lastStartDate: '2026-08-20', cycleLength: 28, periodLength: 5 },
      periodSetupDone: true,
    },
    0
  );

  // v3: 라벨 → 코드. 목록에 없는 값은 직접 입력(custom)으로.
  assert.equal(v0.profile.gender, 'female');
  assert.equal(v0.profile.activity, 'moderate');
  assert.equal(v0.profile.goalType, 'lose_weight');
  assert.deepEqual(v0.profile.conditions, ['diabetes']);
  assert.deepEqual(v0.profile.customConditions, ['손목 터널 증후군']);
  assert.deepEqual(v0.profile.allergies, ['nuts']);
  assert.deepEqual(v0.profile.customAllergies, ['키위']);
  // 식단 취향은 프로필에 없던 값이라 온보딩 태그에서 옮겨온다.
  assert.deepEqual(v0.profile.preferredFoods, ['korean']);
  assert.deepEqual(v0.profile.customPreferredFoods, ['비건식']);
  assert.equal(v0.obInfo.gender, 'female');
  assert.deepEqual(v0.obPick, { activity: 'moderate', goal: 'lose_weight' });
  assert.deepEqual(v0.obTags, {
    health: { codes: ['diabetes'], custom: [] },
    taste: { codes: ['korean'], custom: ['비건식'] },
    avoid: { codes: ['nuts'], custom: [] },
  });
  // 닉네임은 그대로(v1을 지워도 바뀌는 게 없다).
  assert.equal(v0.profile.nickname, '피또');

  // v4: 끼니 키·양·메모·증상.
  const day = v0.dailyRecords['2026-09-03'];
  assert.deepEqual(Object.keys(day.meals).sort(), ['breakfast', 'dinner', 'lunch', 'snack']);
  assert.equal(day.meals.breakfast[0].name, '현미밥');
  assert.equal(day.meals.breakfast[0].amount, 2, '"× 2"는 2인분');
  assert.equal(day.meals.breakfast[0].unit, 'serving');
  assert.equal(day.meals.breakfast[0].servingLabel, '1공기 210g');
  assert.equal(day.meals.lunch[0].amount, 150);
  assert.equal(day.meals.lunch[0].unit, 'g');
  assert.equal(day.meals.lunch[0].servingLabel, undefined);
  assert.deepEqual(day.meals.dinner, []);
  assert.deepEqual(day.mealMemos, { breakfast: '많이 먹음' });

  // v6: 시각으로 만든 ID → UUID. 이름·칼로리는 그대로.
  assert.match(day.meals.breakfast[0].id, UUID);
  assert.match(day.meals.lunch[0].id, UUID);
  assert.match(day.exercises[0].id, UUID);
  assert.equal(day.exercises[0].kcal, 80);
  assert.match(v0.recipes[0].id, UUID);
  assert.match(v0.routines[0].id, UUID);
  assert.equal(v0.recipes[0].name, '샐러드');

  // v4 + v9: 증상 라벨 → 코드(모르는 건 그대로), 옛 컨디션 → 기분 칩. 컨디션 칸은 지운다.
  assert.deepEqual(day.periodSymptoms, ['period_pain', '허리 묵직', 'mood.tired']);
  assert.equal('periodCondition' in day, false);
  // 이미 기분을 고른 날은 컨디션으로 기분을 더하지 않는다.
  assert.deepEqual(v0.dailyRecords['2026-09-05'].periodSymptoms, ['mood.happy']);
  assert.equal('periodCondition' in v0.dailyRecords['2026-09-05'], false);

  // v5: 시작일 = 기록이 남은 가장 오래된 날. v7: 계정 선택은 물어본 것으로.
  assert.equal(v0.startDate, '2026-09-03');
  assert.equal(v0.accountPromptSeen, true);

  // v8: 마지막 시작일 하나 → 생리 기록 한 건. 끝날이 지났으면 평균 기간으로 채운다.
  assert.deepEqual(v0.periodLogs, [{ start: '2026-08-20', end: '2026-08-24' }]);

  // 기본 카드는 숨길 수 없다. v2: 옛 기본 순서 그대로면 새 순서로. v10: 안 건드린 홈이면 활동 카드 숨김.
  assert.deepEqual(v0.cardOrder, DEFAULT_CARD_ORDER);
  assert.deepEqual(v0.cardHidden, ['act']);

  // ---------- 버전이 어긋난 저장본: 이미 코드인데 v3 전 번호 ----------
  const mixed = migrateAppState(
    {
      profile: { gender: 'female', activity: 'light', goalType: 'maintain', conditions: ['diabetes'], allergies: [] },
      obTags: { health: { codes: ['diabetes'], custom: [] }, taste: { codes: ['korean'], custom: [] }, avoid: { codes: [], custom: [] } },
    },
    2
  );
  // 코드를 라벨로 못 읽는다고 비우면 목표 칼로리가 기본값으로 돌아간다.
  assert.equal(mixed.profile.gender, 'female');
  assert.equal(mixed.profile.activity, 'light');
  assert.equal(mixed.profile.goalType, 'maintain');
  assert.deepEqual(mixed.profile.conditions, ['diabetes']);
  assert.deepEqual(mixed.profile.preferredFoods, ['korean']);
  assert.deepEqual(mixed.obTags.health, { codes: ['diabetes'], custom: [] });

  // ---------- v8: 아직 안 끝난 생리, 이미 목록이 있는 경우 ----------
  const ongoing = migrateAppState(
    { periodSetupDone: true, periodSettings: { lastStartDate: daysAgo(1), cycleLength: 28, periodLength: 5 } },
    7
  );
  assert.deepEqual(ongoing.periodLogs, [{ start: daysAgo(1), end: null }], '끝날이 오늘 뒤면 진행 중');
  const hasLogs = migrateAppState(
    {
      periodSetupDone: true,
      periodSettings: { lastStartDate: '2026-08-20', cycleLength: 28, periodLength: 5 },
      periodLogs: [{ start: '2026-07-01', end: '2026-07-05' }],
    },
    7
  );
  assert.deepEqual(hasLogs.periodLogs, [{ start: '2026-07-01', end: '2026-07-05' }], '이미 있는 목록은 건드리지 않는다');

  // ---------- v10: 홈 카드를 건드린 사람은 그대로 ----------
  const reordered = migrateAppState({ cardOrder: ['water', ...DEFAULT_CARD_ORDER.filter((c) => c !== 'water')], cardHidden: [] }, 9);
  assert.deepEqual(reordered.cardHidden, [], '순서를 바꾼 사람의 홈은 그대로');
  const hid = migrateAppState({ cardOrder: [...DEFAULT_CARD_ORDER], cardHidden: ['week'] }, 9);
  assert.deepEqual(hid.cardHidden, ['week'], '직접 숨긴 게 있으면 그대로');

  // ---------- 지금 버전: 옮기지 않는다(기본 카드 숨김만 걸러낸다) ----------
  const current = migrateAppState(
    {
      cardOrder: [...DEFAULT_CARD_ORDER],
      cardHidden: ['kcal', 'week'],
      dailyRecords: { '2026-11-01': { exercises: [{ id: 'not-a-uuid' }], meals: { breakfast: [] } } },
      onboardingDone: true,
      startDate: '2026-10-01',
    },
    APP_STORAGE_VERSION
  );
  assert.deepEqual(current.cardHidden, ['week']);
  assert.equal(current.dailyRecords['2026-11-01'].exercises[0].id, 'not-a-uuid');
  assert.equal(current.startDate, '2026-10-01');

  console.log('기기 저장소 마이그레이션 점검 통과');
} finally {
  rmSync(out, { recursive: true, force: true });
}
