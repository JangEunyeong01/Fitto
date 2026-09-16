import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { calculateGoals } from '../utils/goals';
import { toDateKey, type PeriodSettings } from '../utils/periodCycle';

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
  gender: string | null;
  height: number | null;
  weight: number | null;
  targetWeight: number | null;
  activity: string | null;
  allergies: string[];
  conditions: string[];
  goalType: string | null;
}

export interface Goals {
  kcal: number;
  water: number;
  steps: number;
  cup: number;
}

export interface ExerciseEntry {
  id: string;
  name: string;
  minutes: number;
  kcal: number;
}

export interface MealItem {
  id: string;
  name: string;
  amount: string;
  kcal: number;
  allergy?: boolean;
}

export interface DailyRecord {
  water: number;
  meals: { 아침: MealItem[]; 점심: MealItem[]; 저녁: MealItem[]; 간식: MealItem[] };
  exercises: ExerciseEntry[];
  steps: number;
  periodCondition?: 'good' | 'normal' | 'bad';
  periodSymptoms?: string[];
}

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

/** 태그 + 직접 입력 단계의 선택값. 태그 목록에 없던 직접 입력값도 그대로 저장된다. */
export interface ObTags {
  health: string[];
  taste: string[];
  avoid: string[];
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
  periodOn: boolean;
  periodSettings: PeriodSettings;
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
  toggleObTag: (key: keyof ObTags, value: string) => void;
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
  addMealItem: (dateKey: string, slot: keyof DailyRecord['meals'], item: MealItem) => void;
  addRecipe: (recipe: Recipe) => void;
  addCustomIngredient: (ingredient: CustomIngredient) => void;
  seedMockToday: (dateKey: string) => void;
}

function emptyRecord(): DailyRecord {
  return {
    water: 0,
    meals: { 아침: [], 점심: [], 저녁: [], 간식: [] },
    exercises: [],
    steps: 0,
  };
}

const defaultProfile: Profile = {
  nickname: '은영',
  birthdayMonth: null,
  birthdayDay: null,
  gender: null,
  height: null,
  weight: null,
  targetWeight: null,
  activity: null,
  allergies: [],
  conditions: [],
  goalType: null,
};

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
    (set, get) => ({
      theme: 'system',
      persona: 'neutral',
      profile: defaultProfile,
      goals: defaultGoals,
      periodOn: true,
      periodSettings: defaultPeriodSettings(),
      // 전역 상수를 그대로 상태에 넣으면 어딘가에서 배열을 직접 수정했을 때 기본값이 오염된다.
      cardOrder: [...DEFAULT_CARD_ORDER],
      cardHidden: [],
      obInfo: { name: '', gender: '', age: '', height: '', weight: '' },
      obTags: { health: [], taste: [], avoid: [] },
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
      setProfile: (patch) => set((s) => ({ profile: { ...s.profile, ...patch } })),

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
      setPeriodOn: (v) => set({ periodOn: v }),
      setPeriodSettings: (patch) => set((s) => ({ periodSettings: { ...s.periodSettings, ...patch } })),
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
      toggleObTag: (key, value) =>
        set((s) => {
          const cur = s.obTags[key];
          const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value];
          return { obTags: { ...s.obTags, [key]: next } };
        }),
      clearObTags: (key) => set((s) => ({ obTags: { ...s.obTags, [key]: [] } })),
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
              gender: s.obInfo.gender || null,
              height: s.obInfo.height ? Number(s.obInfo.height) : null,
              weight: s.obInfo.weight ? Number(s.obInfo.weight) : null,
              activity: s.obPick.activity || null,
              goalType: s.obPick.goal || null,
              conditions: s.obTags.health,
              allergies: s.obTags.avoid,
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
            age: s.obInfo.age,
            height: s.profile.height ? String(s.profile.height) : '',
            weight: s.profile.weight ? String(s.profile.weight) : '',
          },
          obTags: { health: s.profile.conditions, taste: s.obTags.taste, avoid: s.profile.allergies },
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
                아침: [{ id: 'm1', name: '그릭요거트', amount: '150g', kcal: 130 }],
                점심: [{ id: 'm2', name: '현미밥 · 닭가슴살 구이', amount: '1인분', kcal: 475 }],
                저녁: [],
                간식: [{ id: 'm3', name: '아몬드 한 줌', amount: '25g', kcal: 145, allergy: true }],
              },
              exercises: [{ id: 'e1', name: '아침 걷기', minutes: 20, kcal: 130 }],
              steps: 6420,
              periodCondition: undefined,
              periodSymptoms: [],
            };
            patch.dailyRecords = { ...s.dailyRecords, [dateKey]: rec };
          }

          return patch;
        }),
    }),
    {
      name: 'fitto-app-storage',
      storage: createJSONStorage(() => AsyncStorage),
      version: 2,
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
          obInfo: { ...current.obInfo, ...(p.obInfo ?? {}) },
          obTags: { ...current.obTags, ...(p.obTags ?? {}) },
          obPick: { ...current.obPick, ...(p.obPick ?? {}) },
        };
      },
      // 이미 저장된 상태에는 기본값 변경이 자동 반영되지 않아 버전별로 옮겨준다.
      migrate: (persisted: unknown, version: number) => {
        const state = persisted as { profile?: Profile; cardOrder?: CardId[]; cardHidden?: CardId[] } | undefined;
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

        return state as AppState;
      },
    }
  )
);
