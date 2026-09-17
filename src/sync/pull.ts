import { getMe } from '../api/auth';
import { NetworkError } from '../api/client';
import {
  getDiet,
  getPeriod,
  getPeriodDaily,
  getSteps,
  getWater,
  getWeights,
  getWorkout,
} from '../api/records';
import { fromUser } from '../api/mappers';
import { useAppStore, type DailyRecord, type MealItem, type MealSlot } from '../store/useAppStore';
import { useAuthStore } from '../store/useAuthStore';
import { useOutboxStore } from '../store/useOutboxStore';
import { addDays, toDateKey } from '../utils/periodCycle';
import type { MealUnit } from '../constants/codes';

/**
 * 서버 기록을 기기로 내려받는다.
 *
 * **밀어올리기가 끝난 뒤에만 부른다.** 아직 못 올린 기록이 남아 있는데 서버 값을 덮어쓰면
 * 그 기록이 사라진다. 그래서 대기열이 비어 있을 때만 진행한다.
 *
 * 범위를 최근 30일로 제한한 이유: 식단·운동은 날짜별 조회라 기간이 길수록 요청이 그만큼 늘어난다.
 * 오래된 날짜는 그 화면을 열 때 가져오면 된다(아직 미구현).
 */
const RECENT_DAYS = 30;
/** 식단·운동은 날짜마다 요청이 필요해서 더 짧게 가져온다. 대부분의 화면이 오늘과 어제만 본다. */
const DETAIL_DAYS = 2;

export async function pullAll(): Promise<void> {
  const auth = useAuthStore.getState();
  if (auth.status !== 'member' || !auth.accessToken) {
    return;
  }
  if (useOutboxStore.getState().items.length > 0) {
    return;
  }

  const token = auth.accessToken;
  const today = toDateKey(new Date());
  const from = addDays(today, -(RECENT_DAYS - 1));

  try {
    // 프로필과 목표는 서버 값이 최종값이다(명세 2장).
    // setProfile이 아니라 전용 액션으로 넣는다 — setProfile은 대기열에 쌓아서 방금 받은 값을 다시 올려보낸다.
    const user = await getMe(token);
    const mapped = fromUser(user);

    const dailyRecords: Record<string, Partial<DailyRecord>> = {};
    const touch = (date: string) => (dailyRecords[date] ??= {});

    for (let i = 0; i < DETAIL_DAYS; i++) {
      const date = addDays(today, -i);

      const diet = await getDiet(date, token);
      const meals = { breakfast: [], lunch: [], dinner: [], snack: [] } as Record<MealSlot, MealItem[]>;
      Object.entries(diet.meals).forEach(([slot, items]) => {
        meals[slot as MealSlot] = items.map((item) => ({
          id: item.id,
          name: item.name,
          amount: item.amount,
          unit: item.unit as MealUnit,
          servingLabel: item.servingLabel ?? undefined,
          kcal: item.calories,
        }));
      });

      const mealMemos: Partial<Record<MealSlot, string>> = {};
      Object.entries(diet.memos).forEach(([slot, memo]) => {
        if (memo) mealMemos[slot as MealSlot] = memo;
      });

      const workout = await getWorkout(date, token);
      const water = await getWater(date, token);

      Object.assign(touch(date), {
        meals,
        mealMemos,
        exercises: workout.workouts.map((w) => ({
          id: w.id,
          code: w.exerciseCode ?? undefined,
          name: w.name,
          minutes: w.duration,
          kcal: w.calories,
          memo: w.memo ?? undefined,
        })),
        water: water.amount,
      });
    }

    const steps = await getSteps(from, today, token);
    steps.items.forEach((item) => {
      Object.assign(touch(item.date), { steps: item.steps });
    });

    const weights = await getWeights(token);
    const weightLog: Record<string, number> = {};
    weights.items.forEach((item) => {
      weightLog[item.date] = item.weight;
    });

    // 주기는 설정이 없으면 404다. 그건 오류가 아니라 "아직 입력 안 함"이라 조용히 넘어간다(명세 3-3).
    let periodSettings;
    let periodSetupDone;
    try {
      const period = await getPeriod(today, token);
      periodSettings = {
        lastStartDate: period.startDate,
        cycleLength: period.cycleLength,
        periodLength: period.periodLength,
      };
      periodSetupDone = true;

      const daily = await getPeriodDaily(from, today, token);
      daily.items.forEach((item) => {
        Object.assign(touch(item.date), {
          periodCondition: item.condition ?? undefined,
          periodSymptoms: item.symptoms,
          periodMedication: item.medication ?? undefined,
          periodMemo: item.memo ?? undefined,
        });
      });
    } catch {
      // 주기 미설정. 기기 설정을 그대로 둔다.
    }

    useAppStore.getState().applyServerRecords({
      profile: mapped.profile,
      goals: mapped.goals,
      persona: mapped.persona,
      dailyRecords,
      weightLog,
      periodSettings,
      periodSetupDone,
    });
    useOutboxStore.getState().markSynced();
  } catch (e) {
    // 연결이 없으면 다음 기회에. 그 외 오류도 화면을 막지 않는다 —
    // 기기에 이미 기록이 있으므로 못 받아도 앱은 그대로 쓸 수 있다.
    if (!(e instanceof NetworkError)) {
      console.warn('서버 기록을 내려받지 못했습니다', e);
    }
  }
}
