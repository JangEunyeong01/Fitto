import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { calculateGoals } from '../utils/goals';
import { toDateKey, type PeriodSettings } from '../utils/periodCycle';
import type { WorkoutPreference } from '../utils/workoutRecommend';
import {
  ACTIVITY_OPTIONS,
  AVOID_TAGS,
  DISEASE_TAGS,
  GENDERS,
  GOAL_OPTIONS,
  TASTE_TAGS,
  SYMPTOM_TAGS,
  codeOfLabel,
  type MealSlotCode,
  type MealUnit,
  type TagOption,
  type ActivityCode,
  type GenderCode,
  type GoalCode,
} from '../constants/codes';

export type ThemeMode = 'light' | 'dark' | 'system';
export type Persona = 'friendly' | 'strict' | 'neutral';

export type CardId = 'kcal' | 'water' | 'act' | 'steps' | 'ex' | 'week' | 'period';

// B 히어로 순서: 칼로리 전폭 → 물·걸음 반폭 2열 → 활동 → 운동 → 주간 → 생리.
export const DEFAULT_CARD_ORDER: CardId[] = ['kcal', 'water', 'steps', 'act', 'ex', 'week', 'period'];

/**
 * 숨길 수 없는 기본 카드. 전부 숨겨서 홈이 텅 비는 걸 막는다.
 * 순서는 바꿀 수 있고 숨기기만 제한한다.
 */
export const ESSENTIAL_CARDS: CardId[] = ['kcal', 'steps'];

export interface Profile {
  nickname: string;
  birthdayMonth: number | null;
  birthdayDay: number | null;
  gender: GenderCode | null;
  /** 온보딩 필수값. 나이대별 건강 주의·생리 안내에 쓴다. */
  age: number | null;
  height: number | null;
  weight: number | null;
  targetWeight: number | null;
  activity: ActivityCode | null;
  /**
   * 아래 세 쌍은 목록에서 고른 코드(constants/codes.ts)와 직접 입력한 문자열을 나눠 담는다.
   * 섞어두면 서버에 보낼 때 어느 쪽이 코드인지 구분할 수 없다.
   */
  allergies: string[];
  customAllergies: string[];
  conditions: string[];
  customConditions: string[];
  preferredFoods: string[];
  customPreferredFoods: string[];
  goalType: GoalCode | null;
}

export interface Goals {
  kcal: number;
  water: number;
  steps: number;
  cup: number;
}

export interface ExerciseEntry {
  id: string;
  /** 내장 운동 목록(data/workouts.ts)의 코드. 목록에 없는 운동을 적었으면 없다. */
  code?: string;
  name: string;
  minutes: number;
  kcal: number;
  memo?: string;
}

export interface MealItem {
  id: string;
  name: string;
  /** 먹은 양과 단위. 화면 문구는 utils/meal.ts의 formatAmount가 만든다. */
  amount: number;
  unit: MealUnit;
  /** unit이 serving일 때 1인분이 무엇인지("1공기 210g"). g으로 기록했으면 없다. */
  servingLabel?: string;
  kcal: number;
  allergy?: boolean;
}

export interface DailyRecord {
  water: number;
  meals: Record<MealSlot, MealItem[]>;
  exercises: ExerciseEntry[];
  steps: number;
  periodCondition?: 'good' | 'normal' | 'bad';
  periodSymptoms?: string[];
  /** 끼니별 메모(명세 F-022). 비우면 키를 지운다. */
  mealMemos?: Partial<Record<MealSlot, string>>;
}

export type MealSlot = MealSlotCode;

export interface Alarms {
  water: boolean;
  waterEvery: number;
  meal: boolean;
  mealTimes: string[];
  move: boolean;
  moveAfter: number;
  weigh: boolean;
  report: boolean;
  quiet: boolean;
  quietFrom: string;
  quietTo: string;
}

export interface Recipe {
  id: string;
  name: string;
  photoUri: string | null;
  ingredients: { name: string; grams: number; kcal: number }[];
  totalKcal: number;
}

export interface CustomIngredient {
  name: string;
  kcal100: number;
  carbs100: number;
  protein100: number;
  fat100: number;
  allergy?: boolean;
}

/** 온보딩 기본 정보 입력값. 숫자도 입력 중 상태를 그대로 두기 위해 문자열로 보관한다. */
export interface ObInfo {
  name: string;
  gender: string;
  age: string;
  height: string;
  weight: string;
}

/** 태그 + 직접 입력 단계의 선택값. 목록에서 고른 건 코드로, 직접 입력한 건 문자열 그대로 담는다. */
export interface TagSelection {
  codes: string[];
  custom: string[];
}

export interface ObTags {
  health: TagSelection;
  taste: TagSelection;
  avoid: TagSelection;
}

export interface ObPick {
  activity: string;
  goal: string;
  persona: Persona | null;
}

interface AppState {
  theme: ThemeMode;
  persona: Persona;
  profile: Profile;
  goals: Goals;
  /** 운동 설정(명세 F-031). 추천 규칙이 이 값을 받는다. */
  workoutPreference: WorkoutPreference;
  periodOn: boolean;
  periodSettings: PeriodSettings;
  /**
   * 사용자가 마지막 생리 시작일을 직접 고른 적이 있는지(명세 F-017).
   * periodSettings는 계산이 깨지지 않게 늘 기본값을 들고 있어서, 값만 보고는 입력 여부를 알 수 없다.
   */
  periodSetupDone: boolean;
  cardOrder: CardId[];
  cardHidden: CardId[];
  alarms: Alarms;
  recipes: Recipe[];
  customIngredients: CustomIngredient[];
  dailyRecords: Record<string, DailyRecord>;
  /**
   * 날짜별 체중(kg). 하루에 여러 번 재면 마지막 값으로 덮어쓴다.
   * 일자별 기록(dailyRecords)과 분리한 이유는 매일 재는 값이 아니어서다 —
   * 안 잰 날까지 빈 레코드가 생기면 추이를 그릴 때 구멍을 걸러내야 한다.
   */
  weightLog: Record<string, number>;
  obInfo: ObInfo;
  obTags: ObTags;
  obPick: ObPick;
  onboardingDone: boolean;
  tutorialDone: boolean;
  birthdayShownYear: number | null;
  /** 드러눕기 모달을 띄운 날짜(dateKey). 하루 한 번만 뜨게 한다. */
  layDownShownDate: string | null;
  timeSlotOverride: string | null;

  setTheme: (t: ThemeMode) => void;
  setPersona: (p: Persona) => void;
  setProfile: (patch: Partial<Profile>) => void;
  setGoals: (patch: Partial<Goals>) => void;
  setAlarms: (patch: Partial<Alarms>) => void;
  setWorkoutPreference: (patch: Partial<WorkoutPreference>) => void;
  setPeriodOn: (v: boolean) => void;
  setPeriodSettings: (patch: Partial<PeriodSettings>) => void;
  setDayCondition: (dateKey: string, condition: DailyRecord['periodCondition']) => void;
  toggleDaySymptom: (dateKey: string, symptom: string) => void;
  setCardOrder: (order: CardId[]) => void;
  setCardHidden: (hidden: CardId[]) => void;
  resetCardOrder: () => void;
  /** 체중을 기록하고 프로필의 현재 체중도 함께 갱신한다. */
  logWeight: (dateKey: string, kg: number) => void;
  removeWeight: (dateKey: string) => void;
  setObInfo: (patch: Partial<ObInfo>) => void;
  toggleObTag: (key: keyof ObTags, code: string) => void;
  toggleObCustomTag: (key: keyof ObTags, value: string) => void;
  clearObTags: (key: keyof ObTags) => void;
  setObPick: (patch: Partial<ObPick>) => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
  setTutorialDone: (v: boolean) => void;
  setBirthdayShownYear: (y: number) => void;
  setLayDownShownDate: (dateKey: string) => void;
  addWater: (dateKey: string, deltaMl: number) => void;
  addExercise: (dateKey: string, entry: ExerciseEntry) => void;
  removeExercise: (dateKey: string, id: string) => void;
  addMealItem: (dateKey: string, slot: MealSlot, item: MealItem) => void;
  removeMealItem: (dateKey: string, slot: MealSlot, id: string) => void;
  setMealMemo: (dateKey: string, slot: MealSlot, text: string) => void;
  addRecipe: (recipe: Recipe) => void;
  addCustomIngredient: (ingredient: CustomIngredient) => void;
  seedMockToday: (dateKey: string) => void;
  /** 설정 → 데이터 초기화. 저장된 모든 상태를 처음 설치한 상태로 되돌린다(온보딩부터 다시). */
  resetAll: () => void;
}

export function emptyMeals(): Record<MealSlot, MealItem[]> {
  return { breakfast: [], lunch: [], dinner: [], snack: [] };
}

function emptyRecord(): DailyRecord {
  return {
    water: 0,
    meals: emptyMeals(),
    exercises: [],
    steps: 0,
  };
}

const defaultProfile: Profile = {
  nickname: '은영',
  birthdayMonth: null,
  birthdayDay: null,
  gender: null,
  age: null,
  height: null,
  weight: null,
  targetWeight: null,
  activity: null,
  allergies: [],
  customAllergies: [],
  conditions: [],
  customConditions: [],
  preferredFoods: [],
  customPreferredFoods: [],
  goalType: null,
};

function emptyTags(): ObTags {
  return {
    health: { codes: [], custom: [] },
    taste: { codes: [], custom: [] },
    avoid: { codes: [], custom: [] },
  };
}

const defaultGoals: Goals = { kcal: 1850, water: 1900, steps: 8000, cup: 250 };

// 실제 생리 시작일을 입력받기 전까지 홈 카드의 예시 문구("3일차")와 맞춘 기본값.
function defaultPeriodSettings(): PeriodSettings {
  const start = new Date();
  start.setDate(start.getDate() - 2);
  return { lastStartDate: toDateKey(start), cycleLength: 28, periodLength: 5 };
}

const defaultAlarms: Alarms = {
  water: true,
  waterEvery: 2,
  meal: true,
  mealTimes: ['08:00', '12:30', '19:00'],
  move: true,
  moveAfter: 60,
  weigh: false,
  report: true,
  quiet: true,
  quietFrom: '22:30',
  quietTo: '07:00',
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get, api) => ({
      theme: 'system',
      persona: 'neutral',
      profile: defaultProfile,
      goals: defaultGoals,
      workoutPreference: { intensity: 'normal', equipment: 'bodyweight', focus: 'full' },
      periodOn: true,
      periodSettings: defaultPeriodSettings(),
      periodSetupDone: false,
      // 전역 상수를 그대로 상태에 넣으면 어딘가에서 배열을 직접 수정했을 때 기본값이 오염된다.
      cardOrder: [...DEFAULT_CARD_ORDER],
      cardHidden: [],
      obInfo: { name: '', gender: '', age: '', height: '', weight: '' },
      obTags: emptyTags(),
      obPick: { activity: '', goal: '', persona: null },
      alarms: defaultAlarms,
      recipes: [],
      customIngredients: [],
      dailyRecords: {},
      weightLog: {},
      onboardingDone: false,
      tutorialDone: false,
      birthdayShownYear: null,
      layDownShownDate: null,
      timeSlotOverride: null,

      setTheme: (t) => set({ theme: t }),
      setPersona: (p) => set({ persona: p }),
      // 계산에 쓰는 값이 바뀌면 목표 칼로리를 다시 잡는다(명세 F-040·F-041).
      // 모든 프로필 수정이 여기를 지나므로 화면마다 재계산을 부를 필요가 없다.
      // 물 목표는 물 상세에서 직접 바꾼 값을 덮어쓰지 않도록 건드리지 않는다.
      setProfile: (patch) =>
        set((s) => {
          const profile = { ...s.profile, ...patch };
          const calcKeys: (keyof Profile)[] = ['gender', 'age', 'height', 'weight', 'activity', 'goalType'];
          if (!calcKeys.some((k) => k in patch)) return { profile };
          const { kcal } = calculateGoals({
            gender: profile.gender,
            age: profile.age,
            height: profile.height,
            weight: profile.weight,
            activity: profile.activity,
            goal: profile.goalType,
          });
          return { profile, goals: { ...s.goals, kcal } };
        }),

      // 기록과 프로필 체중을 항상 같이 움직인다. 따로 두면 프로필엔 옛날 값이,
      // 추이 그래프엔 최신 값이 남아 같은 화면에서 숫자가 어긋난다.
      logWeight: (dateKey, kg) =>
        set((s) => ({
          weightLog: { ...s.weightLog, [dateKey]: kg },
          profile: { ...s.profile, weight: kg },
        })),

      removeWeight: (dateKey) =>
        set((s) => {
          const next = { ...s.weightLog };
          delete next[dateKey];
          // 가장 최근 기록을 프로필 체중으로 되돌린다. 남은 기록이 없으면 그대로 둔다.
          const latest = Object.keys(next).sort().pop();
          return {
            weightLog: next,
            profile: latest ? { ...s.profile, weight: next[latest] } : s.profile,
          };
        }),
      setGoals: (patch) => set((s) => ({ goals: { ...s.goals, ...patch } })),
      setAlarms: (patch) => set((s) => ({ alarms: { ...s.alarms, ...patch } })),
      setWorkoutPreference: (patch) =>
        set((s) => ({ workoutPreference: { ...s.workoutPreference, ...patch } })),
      setPeriodOn: (v) => set({ periodOn: v }),
      // 주기·기간 숫자만 바꾼 건 입력 완료로 보지 않는다. 시작일이 없으면 예측 자체가 기본값 기준이라서.
      setPeriodSettings: (patch) =>
        set((s) => ({
          periodSettings: { ...s.periodSettings, ...patch },
          periodSetupDone: s.periodSetupDone || 'lastStartDate' in patch,
        })),
      setDayCondition: (dateKey, condition) =>
        set((s) => {
          const rec = s.dailyRecords[dateKey] ?? emptyRecord();
          return { dailyRecords: { ...s.dailyRecords, [dateKey]: { ...rec, periodCondition: condition } } };
        }),
      toggleDaySymptom: (dateKey, symptom) =>
        set((s) => {
          const rec = s.dailyRecords[dateKey] ?? emptyRecord();
          const cur = rec.periodSymptoms ?? [];
          const next = cur.includes(symptom) ? cur.filter((v) => v !== symptom) : [...cur, symptom];
          return { dailyRecords: { ...s.dailyRecords, [dateKey]: { ...rec, periodSymptoms: next } } };
        }),
      setCardOrder: (order) => set({ cardOrder: order }),
      // 기본 카드는 어떤 경로로 들어와도 숨김 목록에 들어가지 않게 걸러낸다.
      setCardHidden: (hidden) => set({ cardHidden: hidden.filter((id) => !ESSENTIAL_CARDS.includes(id)) }),
      resetCardOrder: () => set({ cardOrder: [...DEFAULT_CARD_ORDER], cardHidden: [] }),
      setObInfo: (patch) => set((s) => ({ obInfo: { ...s.obInfo, ...patch } })),
      // 선택 배열을 통째로 받으면 리렌더 전에 두 번 누를 때 앞선 선택이 덮어써진다.
      // 항상 스토어의 최신 값을 기준으로 토글한다.
      toggleObTag: (key, code) =>
        set((s) => {
          const cur = s.obTags[key];
          const codes = cur.codes.includes(code) ? cur.codes.filter((v) => v !== code) : [...cur.codes, code];
          return { obTags: { ...s.obTags, [key]: { ...cur, codes } } };
        }),
      toggleObCustomTag: (key, value) =>
        set((s) => {
          const cur = s.obTags[key];
          const custom = cur.custom.includes(value) ? cur.custom.filter((v) => v !== value) : [...cur.custom, value];
          return { obTags: { ...s.obTags, [key]: { ...cur, custom } } };
        }),
      // "해당사항 없음"은 고른 것과 직접 적은 것을 함께 비운다.
      clearObTags: (key) => set((s) => ({ obTags: { ...s.obTags, [key]: { codes: [], custom: [] } } })),
      setObPick: (patch) => set((s) => ({ obPick: { ...s.obPick, ...patch } })),

      // 온보딩 완료: 계산된 목표를 홈 목표치로, 입력값을 프로필로 옮긴다.
      completeOnboarding: () =>
        set((s) => {
          const result = calculateGoals({
            gender: s.obInfo.gender,
            age: s.obInfo.age,
            height: s.obInfo.height,
            weight: s.obInfo.weight,
            activity: s.obPick.activity,
            goal: s.obPick.goal,
          });
          return {
            onboardingDone: true,
            goals: { ...s.goals, kcal: result.kcal, water: result.water },
            profile: {
              ...s.profile,
              nickname: s.obInfo.name.trim() || s.profile.nickname,
              gender: (s.obInfo.gender || null) as GenderCode | null,
              age: s.obInfo.age ? Number(s.obInfo.age) : null,
              height: s.obInfo.height ? Number(s.obInfo.height) : null,
              weight: s.obInfo.weight ? Number(s.obInfo.weight) : null,
              activity: (s.obPick.activity || null) as ActivityCode | null,
              goalType: (s.obPick.goal || null) as GoalCode | null,
              conditions: s.obTags.health.codes,
              customConditions: s.obTags.health.custom,
              preferredFoods: s.obTags.taste.codes,
              customPreferredFoods: s.obTags.taste.custom,
              allergies: s.obTags.avoid.codes,
              customAllergies: s.obTags.avoid.custom,
            },
            persona: s.obPick.persona ?? s.persona,
          };
        }),
      // 설정 → 온보딩 다시 보기. 처음 온보딩 때 입력한 obInfo는 그 뒤로 갱신되지 않으므로,
      // 프로필에서 바뀐 최신 값을 다시 채워 넣고 첫 화면으로 돌려보낸다.
      resetOnboarding: () =>
        set((s) => ({
          onboardingDone: false,
          obInfo: {
            name: s.profile.nickname,
            gender: s.profile.gender ?? '',
            age: s.profile.age != null ? String(s.profile.age) : s.obInfo.age,
            height: s.profile.height ? String(s.profile.height) : '',
            weight: s.profile.weight ? String(s.profile.weight) : '',
          },
          obTags: {
            health: { codes: s.profile.conditions, custom: s.profile.customConditions },
            taste: { codes: s.profile.preferredFoods, custom: s.profile.customPreferredFoods },
            avoid: { codes: s.profile.allergies, custom: s.profile.customAllergies },
          },
          obPick: { activity: s.profile.activity ?? '', goal: s.profile.goalType ?? '', persona: s.persona },
        })),
      setTutorialDone: (v) => set({ tutorialDone: v }),
      setBirthdayShownYear: (y) => set({ birthdayShownYear: y }),
      setLayDownShownDate: (dateKey) => set({ layDownShownDate: dateKey }),

      addWater: (dateKey, deltaMl) =>
        set((s) => {
          const rec = s.dailyRecords[dateKey] ?? emptyRecord();
          const nextWater = Math.max(0, rec.water + deltaMl);
          return { dailyRecords: { ...s.dailyRecords, [dateKey]: { ...rec, water: nextWater } } };
        }),

      addExercise: (dateKey, entry) =>
        set((s) => {
          const rec = s.dailyRecords[dateKey] ?? emptyRecord();
          return {
            dailyRecords: {
              ...s.dailyRecords,
              [dateKey]: { ...rec, exercises: [...rec.exercises, entry] },
            },
          };
        }),

      removeExercise: (dateKey, id) =>
        set((s) => {
          const rec = s.dailyRecords[dateKey] ?? emptyRecord();
          return {
            dailyRecords: {
              ...s.dailyRecords,
              [dateKey]: { ...rec, exercises: rec.exercises.filter((e) => e.id !== id) },
            },
          };
        }),

      addMealItem: (dateKey, slot, item) =>
        set((s) => {
          const rec = s.dailyRecords[dateKey] ?? emptyRecord();
          return {
            dailyRecords: {
              ...s.dailyRecords,
              [dateKey]: { ...rec, meals: { ...rec.meals, [slot]: [...rec.meals[slot], item] } },
            },
          };
        }),

      removeMealItem: (dateKey, slot, id) =>
        set((s) => {
          const rec = s.dailyRecords[dateKey];
          if (!rec) return s;
          return {
            dailyRecords: {
              ...s.dailyRecords,
              [dateKey]: { ...rec, meals: { ...rec.meals, [slot]: rec.meals[slot].filter((m) => m.id !== id) } },
            },
          };
        }),

      // 빈 문자열로 저장하면 메모를 지운 것으로 보고 키째 뺀다. 빈 메모가 기록에 쌓이지 않게.
      setMealMemo: (dateKey, slot, text) =>
        set((s) => {
          const rec = s.dailyRecords[dateKey] ?? emptyRecord();
          const mealMemos = { ...rec.mealMemos };
          const t = text.trim();
          if (t) mealMemos[slot] = t;
          else delete mealMemos[slot];
          return { dailyRecords: { ...s.dailyRecords, [dateKey]: { ...rec, mealMemos } } };
        }),

      addRecipe: (recipe) => set((s) => ({ recipes: [recipe, ...s.recipes] })),
      // 직접 입력한 재료는 칩 목록에 남아 재사용된다(README 5장). 같은 이름이면 최신 값으로 덮어쓴다.
      addCustomIngredient: (ingredient) =>
        set((s) => ({
          customIngredients: [ingredient, ...s.customIngredients.filter((c) => c.name !== ingredient.name)],
        })),

      // 실제 데이터 소스(건강 API·음식 영양성분 API) 연동 전까지 홈 화면을 채우는
      // 예시 데이터. README 화면 명세의 예시 수치를 그대로 사용한다.
      // 날짜가 바뀌면 그날 기록이 없으므로 다시 채운다.
      seedMockToday: (dateKey) =>
        set((s) => {
          const patch: Partial<AppState> = {};

          if (!s.dailyRecords[dateKey]) {
            const rec: DailyRecord = {
              water: 950,
              meals: {
                breakfast: [{ id: 'm1', name: '그릭요거트', amount: 150, unit: 'g', kcal: 130 }],
                lunch: [
                  { id: 'm2', name: '현미밥 · 닭가슴살 구이', amount: 1, unit: 'serving', kcal: 475 },
                ],
                dinner: [],
                snack: [{ id: 'm3', name: '아몬드 한 줌', amount: 25, unit: 'g', kcal: 145, allergy: true }],
              },
              exercises: [{ id: 'e1', code: 'walking', name: '아침 걷기', minutes: 20, kcal: 130 }],
              steps: 6420,
              periodCondition: undefined,
              periodSymptoms: [],
            };
            patch.dailyRecords = { ...s.dailyRecords, [dateKey]: rec };
          }

          return patch;
        }),

      // getInitialState는 이 함수가 처음 만든 상태(액션 포함)라 replace로 통째로 바꿔도 액션이 사라지지 않는다.
      // persist가 바뀐 상태를 그대로 저장소에 다시 쓰므로 AsyncStorage를 따로 지울 필요는 없다.
      resetAll: () => set(api.getInitialState(), true),
    }),
    {
      name: 'fitto-app-storage',
      storage: createJSONStorage(() => AsyncStorage),
      version: 4,
      // 기본 병합은 얕은 병합이라 profile 같은 객체는 저장본이 통째로 덮어쓴다.
      // 그러면 나중에 필드를 추가했을 때 기존 사용자에게만 undefined가 남으므로,
      // 객체 필드는 기본값 위에 저장본을 얹는다.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<AppState>;
        return {
          ...current,
          ...p,
          profile: { ...current.profile, ...(p.profile ?? {}) },
          goals: { ...current.goals, ...(p.goals ?? {}) },
          alarms: { ...current.alarms, ...(p.alarms ?? {}) },
          periodSettings: { ...current.periodSettings, ...(p.periodSettings ?? {}) },
          workoutPreference: { ...current.workoutPreference, ...(p.workoutPreference ?? {}) },
          obInfo: { ...current.obInfo, ...(p.obInfo ?? {}) },
          obTags: { ...current.obTags, ...(p.obTags ?? {}) },
          obPick: { ...current.obPick, ...(p.obPick ?? {}) },
        };
      },
      // 이미 저장된 상태에는 기본값 변경이 자동 반영되지 않아 버전별로 옮겨준다.
      // 옛 구조를 다루는 자리라 필드 타입을 느슨하게 둔다(지금 타입으로 읽으면 옛 값이 들어오지 않는다).
      migrate: (persisted: unknown, version: number) => {
        const state = persisted as
          | {
              profile?: any;
              obInfo?: any;
              obPick?: any;
              obTags?: any;
              dailyRecords?: any;
              cardOrder?: CardId[];
              cardHidden?: CardId[];
            }
          | undefined;
        if (!state) return state as unknown as AppState;

        // 기본 카드를 숨김 목록에 넣어둔 채로 저장된 상태가 있을 수 있어 걸러낸다.
        if (state.cardHidden) {
          state.cardHidden = state.cardHidden.filter((id) => !ESSENTIAL_CARDS.includes(id));
        }

        // v1: 사용자가 직접 바꾼 적 없는 초기 닉네임만 새 기본값으로.
        if (version < 1 && state.profile?.nickname === '피또 친구') {
          state.profile.nickname = defaultProfile.nickname;
        }

        // v2: 홈 레이아웃 확정안이 A 스택 → B 히어로로 바뀌면서 기본 카드 순서도 바뀌었다.
        // 사용자가 순서를 건드리지 않았을 때만(= 예전 기본 순서 그대로일 때) 새 순서로 옮긴다.
        if (version < 2) {
          const oldDefault = ['kcal', 'water', 'act', 'steps', 'ex', 'week', 'period'];
          if (state.cardOrder && state.cardOrder.join() === oldDefault.join()) {
            state.cardOrder = [...DEFAULT_CARD_ORDER];
          }
        }

        // v3: 화면 라벨을 그대로 저장하던 값을 API 코드로 옮긴다(API 명세 v1.1).
        // 목록에 없던 값(직접 입력한 질환·음식)은 코드가 없으니 custom 쪽으로 보낸다.
        if (version < 3) {
          const toSelection = (labels: string[] | undefined, options: readonly TagOption[]): TagSelection => {
            const codes: string[] = [];
            const custom: string[] = [];
            (labels ?? []).forEach((label) => {
              const code = codeOfLabel(options, label);
              if (code) codes.push(code);
              else custom.push(label);
            });
            return { codes, custom };
          };

          const p = state.profile;
          if (p) {
            p.gender = codeOfLabel(GENDERS, p.gender ?? '');
            p.activity = codeOfLabel(ACTIVITY_OPTIONS, p.activity ?? '');
            p.goalType = codeOfLabel(GOAL_OPTIONS, p.goalType ?? '');
            const conditions = toSelection(p.conditions, DISEASE_TAGS);
            p.conditions = conditions.codes;
            p.customConditions = conditions.custom;
            const allergies = toSelection(p.allergies, AVOID_TAGS);
            p.allergies = allergies.codes;
            p.customAllergies = allergies.custom;
            // 식단 취향은 프로필에 없던 값이라 온보딩에서 고른 걸 옮겨온다.
            const taste = toSelection(state.obTags?.taste, TASTE_TAGS);
            p.preferredFoods = taste.codes;
            p.customPreferredFoods = taste.custom;
          }

          if (state.obInfo) state.obInfo.gender = codeOfLabel(GENDERS, state.obInfo.gender ?? '') ?? '';
          if (state.obPick) {
            state.obPick.activity = codeOfLabel(ACTIVITY_OPTIONS, state.obPick.activity ?? '') ?? '';
            state.obPick.goal = codeOfLabel(GOAL_OPTIONS, state.obPick.goal ?? '') ?? '';
          }
          if (state.obTags) {
            state.obTags = {
              health: toSelection(state.obTags.health, DISEASE_TAGS),
              taste: toSelection(state.obTags.taste, TASTE_TAGS),
              avoid: toSelection(state.obTags.avoid, AVOID_TAGS),
            };
          }
        }

        // v4: 끼니 키·증상도 코드로, 음식 양은 "1공기 210g × 2" 같은 문장에서 숫자+단위로 옮긴다.
        if (version < 4) {
          const SLOT_BY_LABEL: Record<string, MealSlot> = {
            아침: 'breakfast',
            점심: 'lunch',
            저녁: 'dinner',
            간식: 'snack',
          };

          const parseAmount = (raw: unknown) => {
            if (typeof raw !== 'string') return { amount: 1, unit: 'serving' as MealUnit };
            // "1공기 210g × 2"처럼 배수가 붙어 있으면 앞쪽이 1회 제공량 설명이다.
            const times = /^(.+?)\s*[×x]\s*([\d.]+)\s*$/.exec(raw.trim());
            const label = (times ? times[1] : raw).trim();
            const count = times ? Number(times[2]) : 1;
            const grams = /^([\d.]+)\s*g$/.exec(label);
            if (grams && count === 1) return { amount: Number(grams[1]), unit: 'g' as MealUnit };
            return { amount: count, unit: 'serving' as MealUnit, servingLabel: label };
          };

          const records = state.dailyRecords ?? {};
          Object.values(records).forEach((rec: any) => {
            if (rec?.meals) {
              const meals: Record<string, any[]> = emptyMeals();
              Object.entries(rec.meals).forEach(([key, items]) => {
                const slot = SLOT_BY_LABEL[key] ?? (key as MealSlot);
                meals[slot] = (items as any[]).map((item) => ({ ...item, ...parseAmount(item.amount) }));
              });
              rec.meals = meals;
            }
            if (rec?.mealMemos) {
              const memos: Record<string, string> = {};
              Object.entries(rec.mealMemos).forEach(([key, memo]) => {
                memos[SLOT_BY_LABEL[key] ?? key] = memo as string;
              });
              rec.mealMemos = memos;
            }
            if (rec?.periodSymptoms) {
              rec.periodSymptoms = rec.periodSymptoms.map(
                (s: string) => codeOfLabel(SYMPTOM_TAGS, s) ?? s
              );
            }
          });
        }

        return state as AppState;
      },
    }
  )
);
