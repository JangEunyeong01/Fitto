/**
 * 서버와 주고받는 값의 모양 (docs/피또_API_명세서_v1.1.md).
 * 화면이 쓰는 스토어 타입(store/useAppStore.ts)과 일부러 분리했다 —
 * 서버 응답이 바뀌어도 화면 타입이 흔들리지 않게 두고, 변환은 api/mappers.ts 한 곳에서만 한다.
 *
 * 영양소처럼 "값 없음"이 의미 있는 필드는 0이 아니라 null이다(명세 0-5).
 */

/** 날짜는 기기 기준 YYYY-MM-DD. 서버도 시간대 변환 없이 문자열 그대로 쓴다(명세 0-1). */
export type DateKey = string;

export interface UserGoals {
  /** 읽기 전용. 서버가 계산한다. */
  targetCalorie: number;
  waterGoal: number;
  /** 사용자가 물 목표를 직접 정했는지. */
  waterGoalCustom: boolean;
  stepGoal: number;
  cupSize: number;
}

export interface WorkoutPreferenceDto {
  intensity: string;
  equipment: string;
  focus: string;
}

export interface User {
  userId: string;
  email: string;
  name: string;
  gender: string | null;
  age: number | null;
  height: number | null;
  weight: number | null;
  targetWeight: number | null;
  birthday: { month: number; day: number } | null;
  activityLevel: string | null;
  goal: string | null;
  diseases: string[];
  customDiseases: string[];
  preferredFoods: string[];
  customPreferredFoods: string[];
  allergies: string[];
  customAllergies: string[];
  personality: string;
  workoutPreference: WorkoutPreferenceDto;
  periodEnabled: boolean;
  goals: UserGoals;
  /** 앱을 쓰기 시작한 시점(명세 F-008). */
  startedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface MealItemDto {
  id: string;
  date: DateKey;
  mealType: string;
  name: string;
  /** 내장 음식·레시피에서 담았으면 그 출처. 직접 입력이면 둘 다 null. */
  foodId: string | null;
  recipeId: string | null;
  amount: number;
  unit: string;
  servingLabel: string | null;
  calories: number;
  carbs: number | null;
  protein: number | null;
  fat: number | null;
  sodium: number | null;
  sugar: number | null;
}

export interface MealMemoDto {
  date: DateKey;
  mealType: string;
  memo: string;
}

export interface WorkoutDto {
  id: string;
  date: DateKey;
  /** 내장 운동 목록의 코드. 직접 적은 운동이면 null. */
  exerciseCode: string | null;
  name: string;
  duration: number;
  calories: number;
  memo: string | null;
}

export interface WaterDto {
  date: DateKey;
  amount: number;
}

export interface StepsDto {
  date: DateKey;
  steps: number;
}

export interface WeightDto {
  date: DateKey;
  weight: number;
}

export interface PeriodSettingsDto {
  startDate: DateKey;
  cycleLength: number;
  periodLength: number;
}

export interface PeriodDailyDto {
  date: DateKey;
  condition: string | null;
  symptoms: string[];
  medication: string | null;
  memo: string | null;
}

export interface RecipeDto {
  id: string;
  name: string;
  photoUrl: string | null;
  ingredients: { name: string; grams: number; calories: number }[];
  totalCalories: number;
}

export interface RoutineDto {
  id: string;
  name: string;
  exercises: { exerciseCode: string; name: string; duration: number }[];
}

export interface CustomIngredientDto {
  name: string;
  caloriesPer100g: number;
  carbsPer100g: number;
  proteinPer100g: number;
  fatPer100g: number;
  allergy: boolean;
}

/** POST /me/import — 게스트로 쓰던 기기 기록을 계정에 합칠 때 올리는 묶음(명세 6). */
export interface ImportPayload {
  meals: MealItemDto[];
  mealMemos: MealMemoDto[];
  workouts: WorkoutDto[];
  water: WaterDto[];
  steps: StepsDto[];
  weights: WeightDto[];
  period?: { settings?: PeriodSettingsDto; daily: PeriodDailyDto[] };
  recipes: RecipeDto[];
  routines: RoutineDto[];
  customIngredients: CustomIngredientDto[];
}

export type ImportCounts = Record<string, number>;

export interface ImportResult {
  imported: ImportCounts;
  skipped: ImportCounts;
  user: User;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/** 에러 응답 본문(명세 0-6). message는 그대로 화면에 띄울 수 있는 한국어 문장이다. */
export interface ApiErrorBody {
  status: number;
  code: string;
  message: string;
  errors?: { field: string; reason: string }[];
}
