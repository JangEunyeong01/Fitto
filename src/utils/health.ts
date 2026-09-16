import { brand } from '../theme/tokens';

export type WaterStage = 0 | 1 | 2 | 3 | 4;

export interface WaterStageSpec {
  stage: WaterStage;
  name: string;
  grayscale: number;
  saturate: number;
  brightness: number;
  scale: number;
  floatDurationMs: number | null; // null = 정지(부유 없음)
}

const WATER_STAGE_SPECS: WaterStageSpec[] = [
  { stage: 0, name: '바싹 마름', grayscale: 0.5, saturate: 0.55, brightness: 1.04, scale: 0.9, floatDurationMs: null },
  { stage: 1, name: '목마름', grayscale: 0.22, saturate: 0.8, brightness: 1.0, scale: 0.94, floatDurationMs: 7000 },
  { stage: 2, name: '보통', grayscale: 0, saturate: 1.0, brightness: 1.0, scale: 1.0, floatDurationMs: 5500 },
  { stage: 3, name: '촉촉', grayscale: 0, saturate: 1.18, brightness: 1.03, scale: 1.03, floatDurationMs: 4200 },
  { stage: 4, name: '완전 만족', grayscale: 0, saturate: 1.32, brightness: 1.06, scale: 1.06, floatDurationMs: 3200 },
];

export function getWaterStageIndex(current: number, goal: number): WaterStage {
  if (goal <= 0) return 0;
  const idx = Math.floor((current / goal) * 5);
  return Math.max(0, Math.min(4, idx)) as WaterStage;
}

export function getWaterStageSpec(current: number, goal: number): WaterStageSpec {
  return WATER_STAGE_SPECS[getWaterStageIndex(current, goal)];
}

export type KcalStatus = 'lack' | 'good' | 'achieved' | 'caution' | 'over';

export const kcalStatusLabel: Record<KcalStatus, string> = {
  lack: '부족',
  good: '양호',
  achieved: '목표 달성',
  caution: '주의',
  over: '초과',
};

export const kcalStatusColor: Record<KcalStatus, string> = {
  lack: brand.gray,
  good: brand.blue,
  achieved: brand.mint,
  caution: brand.yellow,
  over: brand.peach,
};

export function getKcalStatus(consumed: number, goal: number): KcalStatus {
  if (goal <= 0) return 'good';
  const pct = (consumed / goal) * 100;
  if (pct < 50) return 'lack';
  if (pct < 85) return 'good';
  if (pct <= 100) return 'achieved';
  if (pct <= 115) return 'caution';
  return 'over';
}

export function sumMealKcal(meals: Record<string, { kcal: number }[]>): number {
  return Object.values(meals).reduce((sum, items) => sum + items.reduce((a, m) => a + m.kcal, 0), 0);
}

/**
 * README: 운동 기록이 3일 비면 드러눕기 모달을 띄운다.
 * 기록이 아예 없는 날(= dailyRecords에 키가 없는 날)도 공백으로 센다.
 */
export function hasNoExerciseForDays(
  records: Record<string, { exercises: unknown[] }>,
  days: number,
  today: Date = new Date()
): boolean {
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if ((records[key]?.exercises.length ?? 0) > 0) return false;
  }
  return true;
}

const BASE_BURN = 320;

export function getBurnedKcal(exercises: { kcal: number }[]): number {
  return BASE_BURN + exercises.reduce((a, e) => a + e.kcal, 0);
}
