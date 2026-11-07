import { CONDITION_TO_MOOD } from '../constants/periodTags';
import {
  ACTIVITY_OPTIONS,
  AVOID_TAGS,
  DISEASE_TAGS,
  GENDERS,
  GOAL_OPTIONS,
  SYMPTOM_TAGS,
  TASTE_TAGS,
  codeOfLabel,
  type MealSlotCode,
  type MealUnit,
  type TagOption,
} from '../constants/codes';
import { DEFAULT_CARD_HIDDEN, DEFAULT_CARD_ORDER, ESSENTIAL_CARDS, type CardId } from '../constants/homeCards';
import { isUuid, newId } from '../utils/id';
import { addDays, toDateKey, type PeriodLog, type PeriodSettings } from '../utils/periodCycle';

/** 기기 저장소(fitto-app-storage)의 지금 버전. useAppStore의 persist version과 같다. */
export const APP_STORAGE_VERSION = 10;

type TagSelection = { codes: string[]; custom: string[] };

/**
 * 옛 버전으로 저장된 기기 상태를 지금 모양으로 옮긴다(persist의 migrate).
 *
 * 이미 저장된 상태에는 기본값 변경이 자동 반영되지 않아 버전별로 옮겨준다. 사용자 기록을 직접 바꾸는 곳이라
 * 저장소에서 떼어 순수 함수로 두고 `npm run check:migrate`가 버전별 옛 저장본으로 결과 모양을 확인한다.
 * 옛 구조를 다루는 자리라 필드 타입을 느슨하게 둔다(지금 타입으로 읽으면 옛 값이 들어오지 않는다).
 *
 * (v1은 기본 닉네임을 같은 값으로 다시 넣는 일이라 지웠다. 버전 번호는 그대로 둔다.)
 */
export function migrateAppState(persisted: unknown, version: number): unknown {
  const state = persisted as
    | {
        profile?: any;
        obInfo?: any;
        obPick?: any;
        obTags?: any;
        dailyRecords?: any;
        cardOrder?: CardId[];
        cardHidden?: CardId[];
        onboardingDone?: boolean;
        accountPromptSeen?: boolean;
        startDate?: string | null;
        recipes?: any[];
        routines?: any[];
        periodSettings?: PeriodSettings;
        periodSetupDone?: boolean;
        periodLogs?: PeriodLog[];
      }
    | undefined;
  if (!state) return state;

  // 기본 카드를 숨김 목록에 넣어둔 채로 저장된 상태가 있을 수 있어 걸러낸다.
  if (state.cardHidden) {
    state.cardHidden = state.cardHidden.filter((id) => !ESSENTIAL_CARDS.includes(id));
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
    // 이미 코드로 저장된 값은 그대로 둔다. 라벨로 안 읽힌다고 null로 밀면
    // 성별·활동량이 사라져 목표 칼로리가 기본값으로 돌아간다.
    const toCode = (value: unknown, options: readonly TagOption[]) => {
      const raw = typeof value === 'string' ? value : '';
      if (options.some((o) => o.code === raw)) return raw;
      return codeOfLabel(options, raw);
    };

    const toSelection = (labels: unknown, options: readonly TagOption[]): TagSelection => {
      // 이미 {codes, custom}으로 옮겨진 값이 들어올 수 있다(버전이 어긋난 저장본).
      // 여기서 예외가 나면 persist가 복구를 통째로 포기해 기록이 다 날아간 것처럼 보인다.
      if (!Array.isArray(labels)) return (labels as TagSelection) ?? { codes: [], custom: [] };
      const codes: string[] = [];
      const custom: string[] = [];
      labels.forEach((label) => {
        const code = toCode(label, options);
        if (code) codes.push(code);
        else custom.push(label);
      });
      return { codes, custom };
    };

    const p = state.profile;
    if (p) {
      p.gender = toCode(p.gender, GENDERS);
      p.activity = toCode(p.activity, ACTIVITY_OPTIONS);
      p.goalType = toCode(p.goalType, GOAL_OPTIONS);
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

    if (state.obInfo) state.obInfo.gender = toCode(state.obInfo.gender, GENDERS) ?? '';
    if (state.obPick) {
      state.obPick.activity = toCode(state.obPick.activity, ACTIVITY_OPTIONS) ?? '';
      state.obPick.goal = toCode(state.obPick.goal, GOAL_OPTIONS) ?? '';
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
    const SLOT_BY_LABEL: Record<string, MealSlotCode> = {
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
        const meals: Record<string, any[]> = { breakfast: [], lunch: [], dinner: [], snack: [] };
        Object.entries(rec.meals).forEach(([key, items]) => {
          const slot = SLOT_BY_LABEL[key] ?? (key as MealSlotCode);
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
        rec.periodSymptoms = rec.periodSymptoms.map((s: string) => codeOfLabel(SYMPTOM_TAGS, s) ?? s);
      }
    });
  }

  // v5: 시작일(F-008)을 뒤늦게 넣었다. 언제 깔았는지는 알 수 없으니
  // 기록이 남아 있는 가장 오래된 날을 시작일로 본다. 기록이 없으면 오늘부터 센다.
  if (version < 5 && state.onboardingDone) {
    const keys = Object.keys(state.dailyRecords ?? {}).sort();
    state.startDate = keys[0] ?? toDateKey(new Date());
  }

  // v6: 기록 ID를 UUID로 맞춘다. 예전에는 `${Date.now()}` 형태로 만들었는데,
  // 서버가 UUID만 받아서(명세 0-2) 그대로 두면 이미 쌓인 기록이 영영 안 올라간다.
  if (version < 6) {
    Object.values(state.dailyRecords ?? {}).forEach((rec: any) => {
      rec?.exercises?.forEach((e: any) => {
        if (!isUuid(e.id)) e.id = newId();
      });
      Object.values(rec?.meals ?? {}).forEach((items: any) => {
        (items as any[]).forEach((item) => {
          if (!isUuid(item.id)) item.id = newId();
        });
      });
    });
    (state.recipes ?? []).forEach((r: any) => {
      if (!isUuid(r.id)) r.id = newId();
    });
    (state.routines ?? []).forEach((r: any) => {
      if (!isUuid(r.id)) r.id = newId();
    });
  }

  // v7: 온보딩 끝 계정 선택 화면을 뒤늦게 넣었다. 이미 온보딩을 마친 사람에게
  // 앱을 열자마자 가입 화면을 띄우면 쓰던 흐름이 끊긴다. 물어본 것으로 친다.
  if (version < 7 && state.onboardingDone) {
    state.accountPromptSeen = true;
  }

  // v8: 생리 기록을 목록으로 쌓기 시작했다. 예전엔 마지막 시작일 하나뿐이라 그걸 기록 한 건으로 옮긴다.
  // 끝날은 평균 기간으로 채우되, 아직 안 지났으면 진행 중으로 둔다(오늘 뒤 끝날은 서버가 안 받는다).
  if (version < 8 && state.periodSetupDone && state.periodSettings && !state.periodLogs?.length) {
    const { lastStartDate, periodLength } = state.periodSettings;
    const end = addDays(lastStartDate, periodLength - 1);
    state.periodLogs = [{ start: lastStartDate, end: end < toDateKey(new Date()) ? end : null }];
  }

  // v9: 컨디션 3택(좋음·보통·나쁨)을 기분 칩으로 옮긴다(사용자 결정). 이미 기분을 고른 날은 건드리지 않는다.
  if (version < 9) {
    Object.values(state.dailyRecords ?? {}).forEach((rec: any) => {
      const mood = rec?.periodCondition && CONDITION_TO_MOOD[rec.periodCondition as keyof typeof CONDITION_TO_MOOD];
      if (mood) {
        const codes: string[] = rec.periodSymptoms ?? [];
        if (!codes.some((c) => c.startsWith('mood.'))) rec.periodSymptoms = [...codes, mood];
      }
      if (rec) delete rec.periodCondition;
    });
  }

  // v10: 활동 카드를 기본 숨김으로. v2처럼 홈 카드를 한 번도 안 건드린 사람(기본 순서 + 숨긴 것 없음)만 옮긴다.
  if (version < 10) {
    if (state.cardOrder?.join() === DEFAULT_CARD_ORDER.join() && (state.cardHidden ?? []).length === 0) {
      state.cardHidden = [...DEFAULT_CARD_HIDDEN];
    }
  }

  return state;
}
