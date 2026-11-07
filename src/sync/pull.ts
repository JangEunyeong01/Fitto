import { getMe } from '../api/auth';
import { ApiError, NetworkError } from '../api/client';
import {
  getCustomIngredients,
  getDiet,
  getPeriod,
  getPeriodDaily,
  getPeriodLogs,
  getRecipes,
  getRoutines,
  getSteps,
  getWater,
  getWeights,
  getWorkout,
} from '../api/records';
import { fromCustomIngredientDto, fromRecipeDto, fromRoutineDto, fromUser, toDailyRecord } from '../api/mappers';
import { CONDITION_TO_MOOD } from '../constants/periodTags';
import {
  useAppStore,
  type CustomIngredient,
  type DailyRecord,
  type Recipe,
  type WorkoutRoutine,
} from '../store/useAppStore';
import { enqueueSync, localWriteCount } from './enqueue';
import { retryPendingImport } from './guestImport';
import { useAuthStore } from '../store/useAuthStore';
import { useOutboxStore } from '../store/useOutboxStore';
import { refreshToken } from './syncEngine';
import { markDateLoaded } from './pullDate';
import { addDays, toDateKey } from '../utils/periodCycle';

/**
 * 서버 기록을 기기로 내려받는다.
 *
 * **밀어올리기가 끝난 뒤에만 부른다.** 아직 못 올린 기록이 남아 있는데 서버 값을 덮어쓰면
 * 그 기록이 사라진다. 그래서 대기열이 비어 있을 때만 진행하고, **적용 직전에 한 번 더** 본다 —
 * 받는 사이에 기록이 생겼으면 이번 결과는 버리고 다음에 다시 받는다.
 *
 * 범위를 최근 30일로 제한한 이유: 식단·운동은 날짜별 조회라 기간이 길수록 요청이 그만큼 늘어난다.
 * 오래된 날짜는 그 화면을 열 때 가져온다(pullDate).
 */
const RECENT_DAYS = 30;
/** 식단·운동은 날짜마다 요청이 필요해서 더 짧게 가져온다. 대부분의 화면이 오늘과 어제만 본다. */
const DETAIL_DAYS = 2;

/** 받는 사이 기록이 바뀌어 결과를 버렸는지. 그대로 두면 앱을 다시 열 때까지 안 받는다. */
let discarded = false;

/** 지난번 결과를 버렸거나 게스트 기록을 아직 못 옮겼으면 다시. 러너가 30초마다 올리기 뒤에 부른다. */
export function pullIfBehind(): Promise<void> {
  return discarded || useAuthStore.getState().importPending ? pullAll() : Promise.resolve();
}

export async function pullAll(): Promise<void> {
  const auth = useAuthStore.getState();
  if (auth.status !== 'member' || !auth.accessToken) {
    return;
  }
  if (useOutboxStore.getState().items.length > 0) {
    return;
  }
  // 게스트 기록을 아직 못 옮겼으면 그것부터. 못 옮긴 채로 받으면 서버의 빈 오늘 기록이 기기 기록을 덮는다.
  if (!(await retryPendingImport())) {
    return;
  }

  try {
    // 이전 재시도 중 토큰이 바뀌었을 수 있어서 다시 읽는다.
    await pullOnce(useAuthStore.getState().accessToken ?? auth.accessToken);
  } catch (e) {
    // accessToken이 만료됐으면 갱신하고 한 번 더. 이걸 안 하면 새로 기록한 게 없는 동안
    // (대기열이 비어 밀어올리기가 돌지 않으므로) 갱신할 기회가 아예 없다.
    if (e instanceof ApiError && e.status === 401) {
      const token = await refreshToken();
      if (token) {
        try {
          await pullOnce(token);
        } catch {
          // 다음 기회에 다시 받는다.
        }
      }
      return;
    }

    // 연결이 없으면 다음 기회에. 그 외 오류도 화면을 막지 않는다 —
    // 기기에 이미 기록이 있으므로 못 받아도 앱은 그대로 쓸 수 있다.
    if (!(e instanceof NetworkError)) {
      console.warn('서버 기록을 내려받지 못했습니다', e);
    }
  }
}

/**
 * 레시피·루틴·직접 입력 재료를 내려받아 기기 목록과 합친다.
 *
 * 서버에 없는데 기기에만 있는 항목은 지우지 않고 올린다. 이 종류는 예전에 대기열에 없어서,
 * 가입한 뒤 만든 것들이 서버에 한 번도 올라간 적이 없다. 서버 목록으로 덮으면 그게 사라진다.
 *
 * ponytail: 다른 기기에서 지운 항목도 "기기에만 있는 것"으로 보여 다시 올라간다.
 * 여러 기기에서 삭제를 맞추려면 서버에 삭제 기록(tombstone)이 필요하다. 한 사람이 폰 하나로 쓰는 지금은 넘어간다.
 */
async function fetchTemplates(token: string) {
  const [recipeRes, routineRes, ingredientRes] = await Promise.all([
    getRecipes(token),
    getRoutines(token),
    getCustomIngredients(token),
  ]);
  return { recipeRes, routineRes, ingredientRes };
}

/** 받은 목록과 지금 기기 목록을 합친다. 적용하는 그 순간의 기기 값으로 계산해야 받는 사이 만든 것도 안 빠진다. */
function mergeTemplates({ recipeRes, routineRes, ingredientRes }: Awaited<ReturnType<typeof fetchTemplates>>): {
  recipes: Recipe[];
  routines: WorkoutRoutine[];
  customIngredients: CustomIngredient[];
  /** 서버에 없어서 올려야 하는 것. 적용한 뒤에 대기열에 넣는다 — 먼저 넣으면 이번 결과가 "받는 사이 바뀜"으로 버려진다. */
  enqueueLocalOnly: () => void;
} {
  const local = useAppStore.getState();

  const serverRecipeIds = new Set(recipeRes.items.map((r) => r.id));
  const localOnlyRecipes = local.recipes.filter((r) => !serverRecipeIds.has(r.id));
  const recipes = [
    ...localOnlyRecipes,
    // 사진은 서버에 없다. 기기에 있던 경로를 이어 붙인다.
    ...recipeRes.items.map((dto) => fromRecipeDto(dto, local.recipes.find((r) => r.id === dto.id)?.photoUri ?? null)),
  ];

  const serverRoutineIds = new Set(routineRes.items.map((r) => r.id));
  const localOnlyRoutines = local.routines.filter((r) => !serverRoutineIds.has(r.id));
  const routines = [...localOnlyRoutines, ...routineRes.items.map(fromRoutineDto)];

  const serverIngredientNames = new Set(ingredientRes.items.map((i) => i.name));
  const localOnlyIngredients = local.customIngredients.filter((i) => !serverIngredientNames.has(i.name));
  const customIngredients = [...localOnlyIngredients, ...ingredientRes.items.map(fromCustomIngredientDto)];

  const enqueueLocalOnly = () => {
    localOnlyRecipes.forEach((r) => enqueueSync({ kind: 'recipe.save', recipeId: r.id }));
    localOnlyRoutines.forEach((r) => enqueueSync({ kind: 'routine.save', routineId: r.id }));
    localOnlyIngredients.forEach((i) => enqueueSync({ kind: 'ingredient.save', name: i.name }));
  };

  return { recipes, routines, customIngredients, enqueueLocalOnly };
}

/** 주기 설정·기록·일일 기록. 설정이 없으면 404인데, 그건 오류가 아니라 "아직 입력 안 함"이라 null(명세 3-3). */
async function fetchPeriod(token: string, today: string, from: string) {
  try {
    const period = await getPeriod(today, token);
    const [logs, daily] = await Promise.all([getPeriodLogs(token), getPeriodDaily(from, today, token)]);
    return { period, logs, daily };
  } catch {
    return null;
  }
}

async function pullOnce(token: string): Promise<void> {
  const today = toDateKey(new Date());
  const from = addDays(today, -(RECENT_DAYS - 1));
  const dates = Array.from({ length: DETAIL_DAYS }, (_, i) => addDays(today, -i));
  const writesAtStart = localWriteCount();

  // 서로 기다릴 이유가 없는 요청이라 한꺼번에 보낸다. 예전엔 15개를 하나씩 보내서
  // 받는 시간이 길었고, 그만큼 "받는 사이 기록이 생기는" 구간도 길었다.
  const [user, days, steps, weights, period, templateRes] = await Promise.all([
    getMe(token),
    Promise.all(
      dates.map(async (date) => {
        const [diet, workout, water] = await Promise.all([getDiet(date, token), getWorkout(date, token), getWater(date, token)]);
        return { date, record: toDailyRecord(diet, workout, water) };
      })
    ),
    getSteps(from, today, token),
    getWeights(token),
    fetchPeriod(token, today, from),
    fetchTemplates(token),
  ]);

  // 다른 기기에서 인증·다시 동의했을 수 있다. 서버 값을 따른다(기록이 아니라 덮어써도 잃는 게 없다).
  useAuthStore.getState().setEmailVerified(user.emailVerified);
  useAuthStore.getState().setAgreedTermsVersion(user.agreedTermsVersion ?? null);

  // 받는 사이에 기기에서 기록이 바뀌었으면 이번 결과는 버린다. 그대로 적용하면 서버의 옛 값이
  // 방금 기록을 덮는다(물은 한 잔 전 값으로, 식단은 항목이 사라짐). 다음 차례에 다시 받는다.
  if (localWriteCount() !== writesAtStart || useOutboxStore.getState().items.length > 0) {
    discarded = true;
    return;
  }
  discarded = false;

  // 프로필과 목표는 서버 값이 최종값이다(명세 2장).
  // setProfile이 아니라 전용 액션으로 넣는다 — setProfile은 대기열에 쌓아서 방금 받은 값을 다시 올려보낸다.
  const mapped = fromUser(user);

  const dailyRecords: Record<string, Partial<DailyRecord>> = {};
  const touch = (date: string) => (dailyRecords[date] ??= {});

  days.forEach(({ date, record }) => Object.assign(touch(date), record));

  steps.items.forEach((item) => {
    Object.assign(touch(item.date), { steps: item.steps });
  });

  const weightLog: Record<string, number> = {};
  weights.items.forEach((item) => {
    weightLog[item.date] = item.weight;
  });

  let periodSettings;
  let periodSetupDone;
  let periodLogs;
  if (period) {
    periodSettings = {
      lastStartDate: period.period.startDate,
      cycleLength: period.period.cycleLength,
      periodLength: period.period.periodLength,
    };
    periodSetupDone = true;

    // 기록 표가 생기기 전 계정은 목록이 비어 있다. 그땐 기기 목록(마지막 시작일에서 옮긴 한 건)을 지우지 않는다.
    if (period.logs.items.length) {
      periodLogs = period.logs.items.map((l) => ({ start: l.startDate, end: l.endDate }));
    }

    period.daily.items.forEach((item) => {
      // 서버에 남은 옛 컨디션(good·normal·bad)은 기분 칩으로 바꿔 읽는다(기기 저장소 v9와 같은 규칙).
      const mood = item.condition ? CONDITION_TO_MOOD[item.condition as keyof typeof CONDITION_TO_MOOD] : undefined;
      const symptoms =
        mood && !item.symptoms.some((c) => c.startsWith('mood.')) ? [...item.symptoms, mood] : item.symptoms;
      Object.assign(touch(item.date), {
        periodSymptoms: symptoms,
        periodMedication: item.medication ?? undefined,
        periodMemo: item.memo ?? undefined,
      });
    });
  }
  // 주기 미설정(period가 null)이면 기기 설정을 그대로 둔다.

  const { enqueueLocalOnly, ...templates } = mergeTemplates(templateRes);

  useAppStore.getState().applyServerRecords({
    profile: mapped.profile,
    goals: mapped.goals,
    persona: mapped.persona,
    dailyRecords,
    weightLog,
    periodSettings,
    periodSetupDone,
    periodLogs,
    ...templates,
  });
  // 이 날짜들은 여기서 받았으니 화면을 열 때 또 받지 않는다.
  dates.forEach(markDateLoaded);
  enqueueLocalOnly();
  useOutboxStore.getState().markSynced();
}
