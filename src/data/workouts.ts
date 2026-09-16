/**
 * 오늘의 퍼스널 트레이닝 추천 (README 7장). 지금은 룰 기반 고정 목록이고,
 * 나중에 활동량·목표·기록을 반영한 추천 로직으로 바꾼다.
 */
export interface WorkoutSuggestion {
  id: string;
  name: string;
  detail: string;
  minutes: number;
  kcal: number;
  reason: string;
}

export const WORKOUT_SUGGESTIONS: WorkoutSuggestion[] = [
  {
    id: 'w1',
    name: '빠르게 걷기',
    detail: '20분 · 130kcal',
    minutes: 20,
    kcal: 130,
    reason: '어제보다 걸음이 적어요. 가장 부담 없는 운동이에요.',
  },
  {
    id: 'w2',
    name: '의자 스쿼트',
    detail: '3세트 × 12회',
    minutes: 10,
    kcal: 60,
    reason: '하체 근력은 기초대사량을 올려줘요.',
  },
  {
    id: 'w3',
    name: '상체 스트레칭',
    detail: '8분',
    minutes: 8,
    kcal: 25,
    reason: '앉은 시간이 길어 어깨가 굳어 있어요.',
  },
];

/** 운동 기록 퀵칩 (홈 운동 카드와 동일한 3종). 기록은 코드로 남긴다. */
export const QUICK_WORKOUTS = ['walking', 'stretching', 'home_training'] as const;

/** 퀵칩 한 번에 기록되는 시간(분). 짧게 한 번 눌러 남기는 용도라 고정값이다. */
export const QUICK_WORKOUT_MINUTES = 15;

/**
 * 운동 추가 모달(명세 F-034) 목록. met는 Compendium of Physical Activities(2011) 대표값.
 * 소모 칼로리 = MET × 체중(kg) × 시간(h). code는 API 명세 v1.1의 exerciseCode.
 */
export interface Exercise {
  code: string;
  name: string;
  met: number;
}

export const EXERCISES: Exercise[] = [
  { code: 'walking', name: '걷기', met: 3.5 },
  { code: 'brisk_walking', name: '빠르게 걷기', met: 4.3 },
  { code: 'running', name: '달리기', met: 8.0 },
  { code: 'cycling', name: '자전거', met: 6.8 },
  { code: 'swimming', name: '수영', met: 6.0 },
  { code: 'hiking', name: '등산', met: 6.0 },
  { code: 'stair_climbing', name: '계단 오르기', met: 4.0 },
  { code: 'jump_rope', name: '줄넘기', met: 11.0 },
  { code: 'weight_training', name: '웨이트 트레이닝', met: 5.0 },
  { code: 'home_training', name: '홈트', met: 3.8 },
  { code: 'pilates', name: '필라테스', met: 3.0 },
  { code: 'yoga', name: '요가', met: 2.5 },
  { code: 'stretching', name: '스트레칭', met: 2.3 },
];

export function findExercise(code: string): Exercise | undefined {
  return EXERCISES.find((e) => e.code === code);
}

// 프로필 체중이 없을 때 쓴다. goals.ts의 기본 체중과 같은 값.
const DEFAULT_WEIGHT_KG = 58;

export function calcExerciseKcal(met: number, minutes: number, weightKg: number | null): number {
  return Math.round((met * (weightKg ?? DEFAULT_WEIGHT_KG) * minutes) / 60);
}
