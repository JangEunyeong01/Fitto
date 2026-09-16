import type {
  CustomIngredient,
  DailyRecord,
  Goals,
  Persona,
  Profile,
  Recipe,
  WorkoutRoutine,
} from '../store/useAppStore';
import type { PeriodSettings } from '../utils/periodCycle';
import type { WorkoutPreference } from '../utils/workoutRecommend';
import type {
  CustomIngredientDto,
  ImportPayload,
  MealItemDto,
  MealMemoDto,
  PeriodDailyDto,
  RecipeDto,
  RoutineDto,
  User,
  WorkoutDto,
} from './types';

/**
 * 스토어 값과 서버 값 사이의 유일한 번역기.
 * 이름이 다른 이유는 서버 명세를 먼저 정해두고 화면은 원래 쓰던 이름을 유지했기 때문이다
 * (kcal ↔ calories, minutes ↔ duration 등). 양쪽을 맞추는 일은 전부 여기서만 한다.
 */

/** 게스트로 쌓은 기기 기록을 POST /me/import에 올릴 모양으로 바꾼다(명세 6). */
export interface LocalSnapshot {
  dailyRecords: Record<string, DailyRecord>;
  weightLog: Record<string, number>;
  periodSettings: PeriodSettings;
  periodSetupDone: boolean;
  recipes: Recipe[];
  routines: WorkoutRoutine[];
  customIngredients: CustomIngredient[];
}

export function toImportPayload(s: LocalSnapshot): ImportPayload {
  const meals: MealItemDto[] = [];
  const mealMemos: MealMemoDto[] = [];
  const workouts: WorkoutDto[] = [];
  const water: ImportPayload['water'] = [];
  const steps: ImportPayload['steps'] = [];
  const periodDaily: PeriodDailyDto[] = [];

  Object.entries(s.dailyRecords).forEach(([date, rec]) => {
    Object.entries(rec.meals).forEach(([mealType, items]) => {
      items.forEach((item) => {
        meals.push({
          id: item.id,
          date,
          mealType,
          name: item.name,
          // 내장 음식 DB가 로컬 배열이라 서버 음식 ID를 아직 모른다. 서버는 이름과 칼로리만 받아 저장한다.
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
        });
      });
    });

    Object.entries(rec.mealMemos ?? {}).forEach(([mealType, memo]) => {
      if (memo) mealMemos.push({ date, mealType, memo });
    });

    rec.exercises.forEach((e) => {
      workouts.push({
        id: e.id,
        date,
        exerciseCode: e.code ?? null,
        name: e.name,
        duration: e.minutes,
        calories: e.kcal,
        memo: e.memo ?? null,
      });
    });

    // 0은 "안 마심"이라 올릴 게 없다. 빈 기록까지 보내면 서버의 날짜당 한 건 규칙만 차지한다.
    if (rec.water > 0) water.push({ date, amount: rec.water });
    if (rec.steps > 0) steps.push({ date, steps: rec.steps });

    const hasPeriodNote =
      rec.periodCondition || (rec.periodSymptoms?.length ?? 0) > 0 || rec.periodMedication || rec.periodMemo;
    if (hasPeriodNote) {
      periodDaily.push({
        date,
        condition: rec.periodCondition ?? null,
        symptoms: rec.periodSymptoms ?? [],
        medication: rec.periodMedication ?? null,
        memo: rec.periodMemo ?? null,
      });
    }
  });

  const recipes: RecipeDto[] = s.recipes.map((r) => ({
    id: r.id,
    name: r.name,
    // 기기 안 사진 경로(file://)는 서버에서 못 읽는다. 업로드는 사진 API를 붙일 때 따로 처리한다.
    photoUrl: null,
    ingredients: r.ingredients.map((i) => ({ name: i.name, grams: i.grams, calories: i.kcal })),
    totalCalories: r.totalKcal,
  }));

  const routines: RoutineDto[] = s.routines.map((r) => ({
    id: r.id,
    name: r.name,
    exercises: r.exercises.map((e) => ({ exerciseCode: e.code, name: e.name, duration: e.minutes })),
  }));

  const customIngredients: CustomIngredientDto[] = s.customIngredients.map((i) => ({
    name: i.name,
    caloriesPer100g: i.kcal100,
    carbsPer100g: i.carbs100,
    proteinPer100g: i.protein100,
    fatPer100g: i.fat100,
    allergy: !!i.allergy,
  }));

  return {
    meals,
    mealMemos,
    workouts,
    water,
    steps,
    weights: Object.entries(s.weightLog).map(([date, weight]) => ({ date, weight })),
    // 시작일을 직접 고른 적이 없으면 설정은 보내지 않는다. 기본값을 사용자가 정한 값처럼 올릴 수 없다(F-017).
    period: {
      settings: s.periodSetupDone
        ? {
            startDate: s.periodSettings.lastStartDate,
            cycleLength: s.periodSettings.cycleLength,
            periodLength: s.periodSettings.periodLength,
          }
        : undefined,
      daily: periodDaily,
    },
    recipes,
    routines,
    customIngredients,
  };
}

/** 로그인·가입 응답의 User를 스토어에 얹을 모양으로 바꾼다. */
export function fromUser(user: User): {
  profile: Profile;
  goals: Goals;
  persona: Persona;
  workoutPreference: WorkoutPreference;
  periodOn: boolean;
} {
  return {
    profile: {
      nickname: user.name,
      birthdayMonth: user.birthday?.month ?? null,
      birthdayDay: user.birthday?.day ?? null,
      gender: user.gender as Profile['gender'],
      age: user.age,
      height: user.height,
      weight: user.weight,
      targetWeight: user.targetWeight,
      activity: user.activityLevel as Profile['activity'],
      allergies: user.allergies,
      customAllergies: user.customAllergies,
      conditions: user.diseases,
      customConditions: user.customDiseases,
      preferredFoods: user.preferredFoods,
      customPreferredFoods: user.customPreferredFoods,
      goalType: user.goal as Profile['goalType'],
    },
    goals: {
      kcal: user.goals.targetCalorie,
      water: user.goals.waterGoal,
      steps: user.goals.stepGoal,
      cup: user.goals.cupSize,
    },
    persona: user.personality as Persona,
    workoutPreference: user.workoutPreference as WorkoutPreference,
    periodOn: user.periodEnabled,
  };
}
