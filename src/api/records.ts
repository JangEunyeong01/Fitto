import { request } from './client';
import type { MealItemDto, PeriodDailyDto, PeriodSettingsDto, User, WorkoutDto } from './types';

/**
 * 기록 API (명세 7~12장). 아웃박스가 이 함수들을 부른다.
 * 화면은 여기를 직접 쓰지 않는다 — 화면은 기기 저장소만 보고, 서버로 보내는 건 동기화 계층의 일이다.
 */

export function postMeal(item: MealItemDto, token: string): Promise<MealItemDto> {
  return request<MealItemDto>('/diet', { method: 'POST', body: item, token });
}

export function deleteMeal(mealItemId: string, token: string): Promise<void> {
  return request<void>(`/diet/${mealItemId}`, { method: 'DELETE', token });
}

export function putMealMemo(
  params: { date: string; mealType: string; memo: string | null },
  token: string
): Promise<unknown> {
  return request('/diet/memo', { method: 'PUT', body: params, token });
}

export function postWorkout(workout: WorkoutDto, token: string): Promise<WorkoutDto> {
  return request<WorkoutDto>('/workout', { method: 'POST', body: workout, token });
}

export function deleteWorkout(workoutId: string, token: string): Promise<void> {
  return request<void>(`/workout/${workoutId}`, { method: 'DELETE', token });
}

/** 절댓값으로 덮어쓴다(명세 9장). 앱이 더한 결과를 보낸다. */
export function putWater(params: { date: string; amount: number }, token: string): Promise<unknown> {
  return request('/water', { method: 'PUT', body: params, token });
}

export function putSteps(items: { date: string; steps: number }[], token: string): Promise<unknown> {
  return request('/steps', { method: 'PUT', body: { items }, token });
}

/** 가장 최근 날짜면 서버가 프로필 체중과 목표를 다시 계산해 돌려준다(명세 2-6). */
export function putWeight(date: string, weight: number, token: string): Promise<{ user: User }> {
  return request<{ user: User }>(`/weights/${date}`, { method: 'PUT', body: { weight }, token });
}

export function deleteWeight(date: string, token: string): Promise<void> {
  return request<void>(`/weights/${date}`, { method: 'DELETE', token });
}

export function putPeriodSettings(
  settings: PeriodSettingsDto & { today: string },
  token: string
): Promise<unknown> {
  return request('/period', { method: 'PUT', body: settings, token });
}

export function putPeriodDaily(
  date: string,
  daily: Omit<PeriodDailyDto, 'date'>,
  token: string
): Promise<unknown> {
  return request(`/period/daily/${date}`, { method: 'PUT', body: daily, token });
}

export function patchMe(patch: Record<string, unknown>, token: string): Promise<User> {
  return request<User>('/users/me', { method: 'PATCH', body: patch, token });
}

/* ---------- 조회 (서버 → 기기) ---------- */

export interface DietDay {
  date: string;
  totalCalories: number;
  meals: Record<string, MealItemDto[]>;
  memos: Record<string, string | null>;
}

export function getDiet(date: string, token: string): Promise<DietDay> {
  return request<DietDay>('/diet', { query: { date }, token });
}

export interface WorkoutDay {
  date: string;
  totalDuration: number;
  totalCalories: number;
  workouts: WorkoutDto[];
}

export function getWorkout(date: string, token: string): Promise<WorkoutDay> {
  return request<WorkoutDay>('/workout', { query: { date }, token });
}

export function getWater(date: string, token: string): Promise<{ date: string; amount: number }> {
  return request('/water', { query: { date }, token });
}

export function getSteps(
  from: string,
  to: string,
  token: string
): Promise<{ goal: number; items: { date: string; steps: number }[] }> {
  return request('/steps', { query: { from, to }, token });
}

export function getWeights(
  token: string
): Promise<{ targetWeight: number | null; items: { date: string; weight: number }[] }> {
  return request('/weights', { token });
}

/** 주기 설정이 없으면 404 PERIOD_NOT_SET이 온다(명세 12장). 부르는 쪽에서 "미설정"으로 처리한다. */
export function getPeriod(today: string, token: string): Promise<PeriodSettingsDto> {
  return request<PeriodSettingsDto>('/period', { query: { today }, token });
}

export function getPeriodDaily(
  from: string,
  to: string,
  token: string
): Promise<{ items: PeriodDailyDto[] }> {
  return request('/period/daily', { query: { from, to }, token });
}
