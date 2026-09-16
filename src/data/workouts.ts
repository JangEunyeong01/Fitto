import type { EquipmentCode, FocusCode, IntensityCode } from '../constants/codes';

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
  /** 운동 설정(F-031)과 맞춰보는 값들. 추천 규칙은 utils/workoutRecommend.ts에 있다. */
  focus: FocusCode;
  equipment: Exclude<EquipmentCode, 'both'>;
  intensity: IntensityCode;
  /** 무릎·관절에 충격이 큰 운동. 관절염이 있으면 추천에서 뺀다. */
  impact?: 'high';
}

export const EXERCISES: Exercise[] = [
  { code: 'walking', name: '걷기', met: 3.5, focus: 'cardio', equipment: 'bodyweight', intensity: 'light' },
  { code: 'brisk_walking', name: '빠르게 걷기', met: 4.3, focus: 'cardio', equipment: 'bodyweight', intensity: 'normal' },
  { code: 'running', name: '달리기', met: 8.0, focus: 'cardio', equipment: 'bodyweight', intensity: 'hard', impact: 'high' },
  { code: 'cycling', name: '자전거', met: 6.8, focus: 'cardio', equipment: 'machine', intensity: 'normal' },
  { code: 'swimming', name: '수영', met: 6.0, focus: 'cardio', equipment: 'machine', intensity: 'normal' },
  { code: 'hiking', name: '등산', met: 6.0, focus: 'cardio', equipment: 'bodyweight', intensity: 'hard', impact: 'high' },
  { code: 'stair_climbing', name: '계단 오르기', met: 4.0, focus: 'lower', equipment: 'bodyweight', intensity: 'normal', impact: 'high' },
  { code: 'jump_rope', name: '줄넘기', met: 11.0, focus: 'cardio', equipment: 'bodyweight', intensity: 'hard', impact: 'high' },
  { code: 'weight_training', name: '웨이트 트레이닝', met: 5.0, focus: 'full', equipment: 'machine', intensity: 'hard' },
  { code: 'home_training', name: '홈트', met: 3.8, focus: 'full', equipment: 'bodyweight', intensity: 'normal' },
  { code: 'pilates', name: '필라테스', met: 3.0, focus: 'full', equipment: 'bodyweight', intensity: 'normal' },
  { code: 'yoga', name: '요가', met: 2.5, focus: 'full', equipment: 'bodyweight', intensity: 'light' },
  { code: 'stretching', name: '스트레칭', met: 2.3, focus: 'full', equipment: 'bodyweight', intensity: 'light' },
  { code: 'chair_squat', name: '의자 스쿼트', met: 3.5, focus: 'lower', equipment: 'bodyweight', intensity: 'normal' },
  { code: 'lunge', name: '런지', met: 4.0, focus: 'lower', equipment: 'bodyweight', intensity: 'normal' },
  { code: 'push_up', name: '푸시업', met: 3.8, focus: 'upper', equipment: 'bodyweight', intensity: 'normal' },
  { code: 'dumbbell_row', name: '덤벨 로우', met: 3.5, focus: 'upper', equipment: 'machine', intensity: 'normal' },
  { code: 'plank', name: '플랭크', met: 3.3, focus: 'full', equipment: 'bodyweight', intensity: 'normal' },
];

export function findExercise(code: string): Exercise | undefined {
  return EXERCISES.find((e) => e.code === code);
}

// 프로필 체중이 없을 때 쓴다. goals.ts의 기본 체중과 같은 값.
const DEFAULT_WEIGHT_KG = 58;

export function calcExerciseKcal(met: number, minutes: number, weightKg: number | null): number {
  return Math.round((met * (weightKg ?? DEFAULT_WEIGHT_KG) * minutes) / 60);
}
