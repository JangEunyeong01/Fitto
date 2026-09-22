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
  CustomIngredientImportDto,
  CustomIngredientPutDto,
  CustomIngredientResponseDto,
  ImportPayload,
  MealItemDto,
  MealMemoDto,
  PeriodDailyDto,
  RecipeDto,
  RecipeResponseDto,
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

  const recipes = s.recipes.map(toRecipeDto);
  const routines = s.routines.map(toRoutineDto);

  // 가져오기는 100g 기준 값을 평평하게 받는다. 개별 저장(PUT)은 per100g로 묶는다 — 모양이 달라 따로 만든다.
  const customIngredients: CustomIngredientImportDto[] = s.customIngredients.map((i) => ({
    name: i.name,
    calories: i.kcal100,
    carbs: i.carbs100,
    protein: i.protein100,
    fat: i.fat100,
    sodium: null,
    sugar: null,
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

/**
 * 레시피 ↔ 서버. 재료 양은 그램이고 서버 필드 이름은 amount다.
 * 기기 안 사진 경로(file://)는 서버에서 못 읽으므로 보내지 않는다. 사진은 업로드 API를 붙일 때 따로 처리한다.
 */
export function toRecipeDto(r: Recipe): RecipeDto {
  return {
    id: r.id,
    name: r.name,
    ingredients: r.ingredients.map((i) => ({
      name: i.name,
      foodId: null,
      customIngredientId: null,
      amount: i.grams,
      calories: i.kcal,
      carbs: null,
      protein: null,
      fat: null,
      sodium: null,
      sugar: null,
    })),
  };
}

/** 사진은 서버에 없어서 기기에 있던 값을 이어 붙인다. */
export function fromRecipeDto(dto: RecipeResponseDto, photoUri: string | null): Recipe {
  return {
    id: dto.id,
    name: dto.name,
    photoUri,
    ingredients: dto.ingredients.map((i) => ({ name: i.name, grams: i.amount, kcal: i.calories })),
    totalKcal: dto.totals.calories,
  };
}

export function toRoutineDto(r: WorkoutRoutine): RoutineDto {
  return {
    id: r.id,
    name: r.name,
    exercises: r.exercises.map((e) => ({ exerciseCode: e.code || null, name: e.name, duration: e.minutes })),
  };
}

export function fromRoutineDto(dto: RoutineDto): WorkoutRoutine {
  return {
    id: dto.id,
    name: dto.name,
    exercises: dto.exercises.map((e) => ({ code: e.exerciseCode ?? '', name: e.name, minutes: e.duration })),
  };
}

export function toCustomIngredientPut(i: CustomIngredient): CustomIngredientPutDto {
  return {
    name: i.name,
    per100g: { calories: i.kcal100, carbs: i.carbs100, protein: i.protein100, fat: i.fat100, sodium: null, sugar: null },
    allergy: !!i.allergy,
  };
}

export function fromCustomIngredientDto(dto: CustomIngredientResponseDto): CustomIngredient {
  return {
    name: dto.name,
    kcal100: dto.per100g.calories,
    carbs100: dto.per100g.carbs ?? 0,
    protein100: dto.per100g.protein ?? 0,
    fat100: dto.per100g.fat ?? 0,
    allergy: dto.allergy,
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
