// README "1. 온보딩 — 목표 계산식"을 그대로 옮긴 것. 수치를 임의로 바꾸지 않는다.
// 계수는 constants/codes.ts의 선택지에 붙어 있다. 라벨·계수·코드가 흩어지면 한쪽만 고치는 실수가 난다.

import { ACTIVITY_OPTIONS, GOAL_OPTIONS } from '../constants/codes';

function factorMap<K extends 'factor' | 'waterFactor'>(key: K): Record<string, number> {
  return Object.fromEntries(ACTIVITY_OPTIONS.map((o) => [o.code, o[key]]));
}

export const ACTIVITY_FACTORS = factorMap('factor');

/**
 * 물 목표 활동 보정(명세 F-008: 체중 × 30ml × 보정계수).
 * 위 칼로리용 계수(1.2~1.9)를 그대로 쓰면 거의 안 움직이는 사람도 체중당 36ml가 돼
 * 일반 권장량(30~35ml)을 넘는다. 물은 활동량에 따라 10%씩만 올린다.
 */
export const WATER_FACTORS = factorMap('waterFactor');
// 활동량 미입력 시 기본값. 칼로리 기본 계수(가볍게 1.375)와 같은 단계로 맞춘다.
const DEFAULT_WATER_FACTOR = 1.1;

export const GOAL_ADJUSTMENTS: Record<string, number> = Object.fromEntries(
  GOAL_OPTIONS.map((o) => [o.code, o.adjust])
);

// 값이 비었을 때 기본값 (README 명시)
const DEFAULT_AGE = 28;
const DEFAULT_HEIGHT = 165;
const DEFAULT_WEIGHT = 58;
const DEFAULT_ACTIVITY_FACTOR = 1.375;

/**
 * 입력 허용 범위. 물·걸음 목표는 상세 화면에서 이 범위로 다시 제한하므로,
 * 계산 결과가 그 범위를 벗어나지 않도록 여기서부터 맞춰둔다.
 */
export const INPUT_LIMITS = {
  age: { min: 10, max: 100 },
  height: { min: 100, max: 250 },
  weight: { min: 25, max: 250 },
};

/** 나이 범위를 태어난 연도로 옮긴 것. 올해 기준이라 해가 바뀌면 같이 움직인다. */
export function birthYearLimits(now: Date = new Date()) {
  const y = now.getFullYear();
  return { min: y - INPUT_LIMITS.age.max, max: y - INPUT_LIMITS.age.min };
}

/**
 * 만 나이. 월·일을 모르면 올해 생일이 지났다고 본다(한 살 차이는 목표 칼로리로 5kcal 남짓이다).
 * 연도가 없으면 계산할 수 없어서 null.
 */
export function ageFromBirth(
  year: number | null,
  month: number | null,
  day: number | null,
  now: Date = new Date()
): number | null {
  if (!year) return null;
  let age = now.getFullYear() - year;
  if (month && day) {
    const m = now.getMonth() + 1;
    if (m < month || (m === month && now.getDate() < day)) age -= 1;
  }
  return age;
}

/** 물 상세(GoalField)와 같은 범위. 온보딩 계산 결과도 이 안으로 들어와야 한다. */
export const WATER_GOAL_LIMITS = { min: 500, max: 4000 };
/** 하루 목표 칼로리 상·하한. 하한 1200은 README 명시값. */
export const KCAL_GOAL_LIMITS = { min: 1200, max: 5000 };

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export interface GoalInput {
  /** 성별·활동량·목표는 코드(constants/codes.ts). 온보딩 입력 중에는 비어 있을 수 있다. */
  gender: string | null;
  age: string | number | null;
  height: string | number | null;
  weight: string | number | null;
  activity: string | null;
  goal: string | null;
}

export interface GoalResult {
  bmr: number;
  tdee: number;
  kcal: number;
  water: number;
  /**
   * 계산에 실제로 쓰인 값들. 빈 입력은 기본값으로, 범위를 벗어난 값은 잘린 뒤라
   * 화면에 근거를 보여줄 때 입력 원본이 아니라 이쪽을 써야 숫자와 어긋나지 않는다.
   */
  weight: number;
  age: number;
  height: number;
}

function num(value: string | number | null, fallback: number): number {
  if (value == null) return fallback;
  const n = typeof value === 'number' ? value : parseFloat(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function calculateGoals(input: GoalInput): GoalResult {
  // 온보딩 입력은 자릿수 실수(예: 몸무게 300)가 그대로 들어올 수 있어 범위로 자른다.
  const age = clamp(num(input.age, DEFAULT_AGE), INPUT_LIMITS.age.min, INPUT_LIMITS.age.max);
  const height = clamp(num(input.height, DEFAULT_HEIGHT), INPUT_LIMITS.height.min, INPUT_LIMITS.height.max);
  const weight = clamp(num(input.weight, DEFAULT_WEIGHT), INPUT_LIMITS.weight.min, INPUT_LIMITS.weight.max);

  // Mifflin-St Jeor. 남성 +5, 여성 -161.
  const bmr = Math.round(
    10 * weight + 6.25 * height - 5 * age + (input.gender === 'male' ? 5 : -161)
  );

  const factor = ACTIVITY_FACTORS[input.activity ?? ''] ?? DEFAULT_ACTIVITY_FACTOR;
  const tdee = Math.round(bmr * factor);

  const adjust = GOAL_ADJUSTMENTS[input.goal ?? ''] ?? 0;
  const kcal = clamp(tdee + adjust, KCAL_GOAL_LIMITS.min, KCAL_GOAL_LIMITS.max);

  const waterFactor = WATER_FACTORS[input.activity ?? ''] ?? DEFAULT_WATER_FACTOR;
  const rawWater = Math.round((weight * 30 * waterFactor) / 50) * 50;
  const water = clamp(rawWater, WATER_GOAL_LIMITS.min, WATER_GOAL_LIMITS.max);

  return { bmr, tdee, kcal, water, weight, age, height };
}
