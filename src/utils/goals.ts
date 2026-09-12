// README "1. 온보딩 — 목표 계산식"을 그대로 옮긴 것. 수치를 임의로 바꾸지 않는다.

export const ACTIVITY_FACTORS: Record<string, number> = {
  '거의 안 움직여요': 1.2,
  '가볍게 움직여요': 1.375,
  '보통이에요': 1.55,
  '많이 움직여요': 1.725,
  '매우 활동적이에요': 1.9,
};

export const GOAL_ADJUSTMENTS: Record<string, number> = {
  '체중 감량': -350,
  '체중 증가': 350,
  '체중 유지': 0,
  '건강 관리': 0,
  '근력 강화': 200,
  '체력 증진': 100,
};

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

/** 물 상세(GoalField)와 같은 범위. 온보딩 계산 결과도 이 안으로 들어와야 한다. */
export const WATER_GOAL_LIMITS = { min: 500, max: 4000 };
/** 하루 목표 칼로리 상·하한. 하한 1200은 README 명시값. */
export const KCAL_GOAL_LIMITS = { min: 1200, max: 5000 };

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export interface GoalInput {
  gender: string;
  age: string | number;
  height: string | number;
  weight: string | number;
  activity: string;
  goal: string;
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

function num(value: string | number, fallback: number): number {
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
    10 * weight + 6.25 * height - 5 * age + (input.gender === '남성' ? 5 : -161)
  );

  const factor = ACTIVITY_FACTORS[input.activity] ?? DEFAULT_ACTIVITY_FACTOR;
  const tdee = Math.round(bmr * factor);

  const adjust = GOAL_ADJUSTMENTS[input.goal] ?? 0;
  const kcal = clamp(tdee + adjust, KCAL_GOAL_LIMITS.min, KCAL_GOAL_LIMITS.max);

  const rawWater = Math.round((weight * 33) / 50) * 50;
  const water = clamp(rawWater, WATER_GOAL_LIMITS.min, WATER_GOAL_LIMITS.max);

  return { bmr, tdee, kcal, water, weight, age, height };
}
