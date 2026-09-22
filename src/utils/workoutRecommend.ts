import { EXERCISES, calcExerciseKcal, type Exercise } from '../data/workouts';
import type { EquipmentCode, FocusCode, IntensityCode } from '../constants/codes';

/**
 * 오늘의 퍼스널 트레이닝 추천 (명세 F-032). 서버 없이 도는 룰 기반이다.
 * 순서가 중요하다: 먼저 "하면 안 되는 것"을 걸러내고, 남은 것에 점수를 매겨 고른다.
 * 이유 문구는 점수를 준 규칙 중 가장 강한 것 하나만 보여준다. 여러 개를 나열하면 읽지 않는다.
 */

export interface WorkoutPreference {
  intensity: IntensityCode;
  equipment: EquipmentCode;
  focus: FocusCode;
}

export interface RecommendInput {
  preference: WorkoutPreference;
  /** 프로필 값 */
  goal: string | null;
  age: number | null;
  weightKg: number | null;
  diseases: string[];
  /** 오늘 섭취 − 목표. 양수면 초과. */
  kcalDiff: number;
  /** 생리 컨디션. 나쁨이면 가벼운 것만 권한다. */
  periodCondition?: 'good' | 'normal' | 'bad';
}

export interface WorkoutPick {
  code: string;
  name: string;
  minutes: number;
  kcal: number;
  reason: string;
}

/** 강도별 기본 운동 시간(분). */
const MINUTES: Record<IntensityCode, number> = { light: 15, normal: 20, hard: 30 };

const INTENSITY_RANK: Record<IntensityCode, number> = { light: 0, normal: 1, hard: 2 };

// 고혈압은 고강도 금지, 관절염은 충격 큰 운동 금지(명세 F-032).
// 나이는 65세부터 고강도를 빼는데, 이건 의학 기준이 아니라 보수적으로 잡은 값이다.
const SENIOR_AGE = 65;

function isBlocked(e: Exercise, input: RecommendInput): boolean {
  const { diseases, age, periodCondition } = input;
  if (periodCondition === 'bad' && e.intensity !== 'light') return true;
  if (diseases.includes('hypertension') && e.intensity === 'hard') return true;
  if (diseases.includes('arthritis') && e.impact === 'high') return true;
  if (age != null && age >= SENIOR_AGE && e.intensity === 'hard') return true;
  return false;
}

const DEFAULT_REASON = '오늘 설정에 맞춰 골랐어요.';

/** 점수와 이유 후보들을 함께 매긴다. 점수가 높을수록 위에 보여준다. */
function score(e: Exercise, input: RecommendInput): { value: number; reasons: string[] } {
  const { preference, goal, diseases, kcalDiff, periodCondition } = input;
  let value = 0;
  // 이유 후보는 [우선순위, 문구]로 모았다가 앞선 것부터 쓴다.
  const reasons: [number, string][] = [];

  if (periodCondition === 'bad') {
    reasons.push([0, '오늘 컨디션이 좋지 않아 가볍게 움직이는 쪽으로 골랐어요.']);
  }

  if (diseases.includes('diabetes') && e.focus === 'cardio') {
    value += 3;
    reasons.push([1, '식후 가벼운 유산소는 혈당 관리에 도움이 돼요.']);
  }
  if (diseases.includes('hypertension') && e.intensity !== 'hard') {
    value += 1;
    reasons.push([2, '혈압을 생각해 강도를 낮춘 운동이에요.']);
  }

  if (e.focus === preference.focus) {
    value += 4;
    reasons.push([3, `오늘 목적(${labelOfFocus(preference.focus)})에 맞는 운동이에요.`]);
  }
  if (preference.equipment !== 'both' && e.equipment === preference.equipment) {
    value += 2;
  }
  if (e.intensity === preference.intensity) {
    value += 2;
  } else {
    // 설정한 강도에서 멀수록 감점. 가볍게로 두었는데 고강도가 올라오면 안 된다.
    value -= Math.abs(INTENSITY_RANK[e.intensity] - INTENSITY_RANK[preference.intensity]);
  }

  if (kcalDiff > 0 && e.focus === 'cardio') {
    value += 2;
    reasons.push([4, `목표보다 ${Math.round(kcalDiff)}kcal 더 먹었어요. 유산소로 덜어내볼까요?`]);
  }
  if (goal === 'strength' && (e.focus === 'upper' || e.focus === 'lower' || e.code === 'weight_training')) {
    value += 2;
    reasons.push([5, '근력 강화가 목표라 근육을 쓰는 운동을 골랐어요.']);
  }
  if ((goal === 'lose_weight' || goal === 'endurance') && e.focus === 'cardio') {
    value += 2;
    reasons.push([6, goal === 'lose_weight' ? '체중 감량에는 꾸준한 유산소가 잘 맞아요.' : '지구력을 올리기 좋은 운동이에요.']);
  }

  reasons.sort((a, b) => a[0] - b[0]);
  return { value, reasons: reasons.map(([, text]) => text) };
}

function labelOfFocus(focus: FocusCode): string {
  return { upper: '상체', lower: '하체', full: '전신', cardio: '유산소' }[focus];
}

/** 같은 부위만 세 개 뜨지 않게 한 부위당 최대 2개까지만 고른다. */
const MAX_PER_FOCUS = 2;

export function recommendWorkouts(input: RecommendInput, count = 3): WorkoutPick[] {
  const minutes = input.periodCondition === 'bad' ? MINUTES.light : MINUTES[input.preference.intensity];

  const ranked = EXERCISES.filter((e) => !isBlocked(e, input))
    .map((e) => ({ exercise: e, ...score(e, input) }))
    .sort((a, b) => b.value - a.value);

  const picked: typeof ranked = [];
  const usedFocus: Record<string, number> = {};
  for (const item of ranked) {
    if (picked.length === count) break;
    const used = usedFocus[item.exercise.focus] ?? 0;
    if (used >= MAX_PER_FOCUS) continue;
    usedFocus[item.exercise.focus] = used + 1;
    picked.push(item);
  }

  // 세 개가 같은 이유를 달고 있으면 읽을 게 없다. 이미 쓴 문구는 건너뛰고 다음 후보를 쓴다.
  // 남은 후보가 없으면 빈 문자열로 둔다 — 같은 문장을 두 번 적느니 아무 말도 하지 않는 게 낫다.
  const usedReasons = new Set<string>();
  return picked.map(({ exercise, reasons }, index) => {
    const fallback = index === 0 ? reasons[0] ?? DEFAULT_REASON : '';
    const reason = reasons.find((r) => !usedReasons.has(r)) ?? fallback;
    if (reason) usedReasons.add(reason);
    return {
      code: exercise.code,
      name: exercise.name,
      minutes,
      kcal: calcExerciseKcal(exercise.met, minutes, input.weightKg),
      reason,
    };
  });
}
