import { ApiError, NetworkError } from '../api/client';
import { refresh } from '../api/auth';
import { toCustomIngredientPut, toRecipeDto, toRoutineDto } from '../api/mappers';
import {
  deleteMeal,
  deleteRoutine,
  deleteWeight,
  deleteWorkout,
  patchMe,
  postMeal,
  postRecipe,
  postRoutine,
  postWorkout,
  putCustomIngredient,
  putMealMemo,
  putPeriodDaily,
  putPeriodLogs,
  putPeriodSettings,
  putSteps,
  putWater,
  putWeight,
} from '../api/records';
import { useAppStore } from '../store/useAppStore';
import { useAuthStore } from '../store/useAuthStore';
import { useOutboxStore } from '../store/useOutboxStore';
import { toDateKey } from '../utils/periodCycle';
import { classifyFailure, singleFlight } from './rules';
import type { SyncOp } from './types';

/**
 * 아웃박스를 하나씩 처리한다.
 *
 * 보낼 값은 큐가 아니라 **기기 저장소에서 그때그때 읽는다.** 큐에는 "무엇이 바뀌었는지"만 있다.
 * 이렇게 하면 같은 대상을 여러 번 고쳐도 마지막 상태 한 번만 올라가고,
 * 보내기 직전에 지워진 기록을 보내려다 실패하는 일도 줄어든다.
 */

let running = false;

/**
 * 401을 만나면 한 번만 갱신을 시도한다. 갱신도 실패하면 로그아웃시킨다(명세 0-4).
 * 올리기·내려받기·지난 날짜가 동시에 불러도 요청은 하나만 나간다(rules.ts singleFlight).
 */
export const refreshToken = singleFlight(refreshTokenOnce);

async function refreshTokenOnce(): Promise<string | null> {
  const { refreshToken: current, updateTokens, expireSession } = useAuthStore.getState();
  if (!current) {
    return null;
  }

  try {
    const tokens = await refresh(current);
    updateTokens(tokens);
    return tokens.accessToken;
  } catch (e) {
    // 네트워크 문제라면 토큰이 죽은 게 아니다. 로그아웃시키면 기록을 못 올린 채 로그인 화면으로 밀려난다.
    if (e instanceof NetworkError) {
      return null;
    }
    // 토큰이 만료됐거나 폐기됐다. 조용히 로그아웃시키면 기록이 왜 안 올라가는지 알 수 없다.
    expireSession();
    return null;
  }
}

/** 큐에 쌓인 작업을 순서대로 보낸다. 이미 돌고 있으면 그냥 돌아온다. */
export async function runSync(): Promise<void> {
  if (running) {
    return;
  }
  running = true;

  try {
    while (true) {
      const { items, shift, retryLater } = useOutboxStore.getState();
      const head = items[0];
      const auth = useAuthStore.getState();

      // 게스트로 돌아왔거나 큐가 비었으면 끝.
      if (!head || auth.status !== 'member' || !auth.accessToken) {
        return;
      }

      try {
        await send(head.op, auth.accessToken);
        shift();
      } catch (e) {
        const action = classifyFailure(head.op.kind, {
          network: e instanceof NetworkError,
          status: e instanceof ApiError ? e.status : undefined,
        });

        if (action === 'done') {
          shift();
          continue;
        }

        if (action === 'refresh') {
          const token = await refreshToken();
          if (!token) {
            return; // 갱신 실패. 다음 기회에 다시 시도한다.
          }
          continue; // 새 토큰으로 같은 작업을 다시.
        }

        // 연결이 없거나 서버가 잠깐 못 받는다. 큐를 그대로 두고 멈춘다. 실패로 세지 않는다 —
        // 비행기 모드나 서버 배포가 길어졌다고 기록을 버리면 안 된다.
        if (action === 'pause') {
          return;
        }

        // 서버가 거절한 요청(400 등). 횟수를 세고 사유를 남긴다 — 횟수를 다 쓰면 실패 목록에 들어가 설정 화면에 보인다.
        // 그리고 이번 차례는 끝낸다. 예전엔 여기서 바로 다시 보내서, 5번을 1초 만에 다 써 버렸다.
        retryLater(e instanceof ApiError ? e.message : '알 수 없는 이유로 실패했어요.');
        return;
      }
    }
  } finally {
    running = false;
  }
}

/** 작업 하나를 실제 요청으로 바꿔 보낸다. 값은 지금 기기 저장소에서 읽는다. */
async function send(op: SyncOp, token: string): Promise<void> {
  const s = useAppStore.getState();

  switch (op.kind) {
    case 'meal.add': {
      const item = s.dailyRecords[op.date]?.meals[op.mealType]?.find((m) => m.id === op.itemId);
      // 보내기 전에 지워졌으면 보낼 것도 없다.
      if (!item) {
        return;
      }
      await postMeal(
        {
          id: item.id,
          date: op.date,
          mealType: op.mealType,
          name: item.name,
          foodId: null,
          recipeId: null,
          amount: item.amount,
          unit: item.unit,
          servingLabel: item.servingLabel ?? null,
          calories: item.kcal,
          carbs: null,
          protein: null,
          fat: null,
          sodium: null,
          sugar: null,
        },
        token
      );
      return;
    }

    case 'meal.remove':
      await deleteMeal(op.mealItemId, token);
      return;

    case 'meal.memo': {
      const memo = s.dailyRecords[op.date]?.mealMemos?.[op.mealType] ?? null;
      await putMealMemo({ date: op.date, mealType: op.mealType, memo }, token);
      return;
    }

    case 'workout.add': {
      const entry = s.dailyRecords[op.date]?.exercises.find((e) => e.id === op.workoutId);
      if (!entry) {
        return;
      }
      await postWorkout(
        {
          id: entry.id,
          date: op.date,
          exerciseCode: entry.code ?? null,
          name: entry.name,
          duration: entry.minutes,
          calories: entry.kcal,
          memo: entry.memo ?? null,
        },
        token
      );
      return;
    }

    case 'workout.remove':
      await deleteWorkout(op.workoutId, token);
      return;

    case 'water.put':
      await putWater({ date: op.date, amount: s.dailyRecords[op.date]?.water ?? 0 }, token);
      return;

    case 'steps.put':
      // 걸음수는 여러 날짜를 한 번에 받는 API라 한 건도 배열로 감싼다(명세 10장).
      await putSteps([{ date: op.date, steps: s.dailyRecords[op.date]?.steps ?? 0 }], token);
      return;

    case 'weight.put': {
      const kg = s.weightLog[op.date];
      if (kg == null) {
        return;
      }
      // 가장 최근 기록이면 서버가 목표를 다시 계산해 돌려준다. 그 값으로 기기를 맞춘다(명세 2장).
      const { user } = await putWeight(op.date, kg, token);
      useAppStore.getState().setGoals({
        kcal: user.goals.targetCalorie,
        water: user.goals.waterGoal,
      });
      return;
    }

    case 'weight.remove':
      await deleteWeight(op.date, token);
      return;

    case 'period.settings':
      await putPeriodSettings(
        {
          startDate: s.periodSettings.lastStartDate,
          cycleLength: s.periodSettings.cycleLength,
          periodLength: s.periodSettings.periodLength,
          today: toDateKey(new Date()),
        },
        token
      );
      return;

    case 'period.logs':
      await putPeriodLogs(
        s.periodLogs.map((l) => ({ startDate: l.start, endDate: l.end })),
        toDateKey(new Date()),
        token
      );
      return;

    case 'period.daily': {
      const rec = s.dailyRecords[op.date];
      await putPeriodDaily(
        op.date,
        {
          // 컨디션 3택은 기분 칩으로 옮겼다. 서버의 옛 컨디션 값은 이 저장으로 비워진다.
          condition: null,
          symptoms: rec?.periodSymptoms ?? [],
          medication: rec?.periodMedication ?? null,
          memo: rec?.periodMemo ?? null,
        },
        token
      );
      return;
    }

    case 'profile.patch': {
      const p = s.profile;
      const user = await patchMe(
        {
          name: p.nickname,
          gender: p.gender,
          age: p.age,
          height: p.height,
          weight: p.weight,
          targetWeight: p.targetWeight,
          activityLevel: p.activity,
          goal: p.goalType,
          personality: s.persona,
          // 세 칸을 한 묶음으로 보낸다. 서버는 묶음이 오면 세 칸을 통째로 갈아끼우고, null이면 그대로 둔다.
          birthday:
            p.birthYear != null || p.birthdayMonth != null || p.birthdayDay != null
              ? { year: p.birthYear, month: p.birthdayMonth, day: p.birthdayDay }
              : null,
          diseases: p.conditions,
          customDiseases: p.customConditions,
          preferredFoods: p.preferredFoods,
          customPreferredFoods: p.customPreferredFoods,
          allergies: p.allergies,
          customAllergies: p.customAllergies,
          periodEnabled: s.periodOn,
          goals: { stepGoal: s.goals.steps, cupSize: s.goals.cup },
        },
        token
      );
      // 목표 칼로리·물 목표는 서버가 계산한 값이 최종값이다.
      useAppStore.getState().setGoals({
        kcal: user.goals.targetCalorie,
        water: user.goals.waterGoal,
      });
      return;
    }

    // 레시피·루틴·직접 입력 재료. 예전에는 대기열에 이 종류가 없어서, 가입할 때 한 번 올라간 뒤로
    // 새로 만든 건 기기에만 남았다. 서버 API는 그때부터 있었는데 앱이 부르지 않았다.
    case 'recipe.save': {
      const recipe = s.recipes.find((r) => r.id === op.recipeId);
      if (!recipe) return;
      await postRecipe(toRecipeDto(recipe), token);
      return;
    }

    case 'routine.save': {
      const routine = s.routines.find((r) => r.id === op.routineId);
      // 보내기 전에 지웠으면 보낼 게 없다. 뒤에 쌓인 삭제가 서버 쪽을 처리한다.
      if (!routine) return;
      await postRoutine(toRoutineDto(routine), token);
      return;
    }

    case 'routine.remove':
      await deleteRoutine(op.routineId, token);
      return;

    case 'ingredient.save': {
      const ingredient = s.customIngredients.find((i) => i.name === op.name);
      if (!ingredient) return;
      await putCustomIngredient(toCustomIngredientPut(ingredient), token);
      return;
    }
  }
}
