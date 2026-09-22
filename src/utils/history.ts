import type { DailyRecord } from '../store/useAppStore';
import { dateKey } from './timeOfDay';
import { sumMealKcal, getBurnedKcal } from './health';

/**
 * 기록해 둔 날짜에서 차트 값을 뽑는다.
 *
 * 예전에는 최근 6일치를 예시 숫자 배열로 채우고 오늘 값만 실제 기록을 썼다.
 * 그러면 어제 아무것도 기록하지 않은 사람에게도 막대가 그려져서, 화면이 사실이 아닌 걸 말하게 된다.
 * 기록이 없는 날은 0으로 두고, 판단할 만큼 쌓였는지는 `daysWithRecord`로 화면이 직접 정한다.
 */

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

export type DailyMetric = 'water' | 'steps' | 'intake' | 'burn';

/** 하루치 기록에서 지표 하나를 꺼낸다. 기록이 없는 날은 0이다. */
export function metricOf(record: DailyRecord | undefined, metric: DailyMetric): number {
  if (!record) return 0;
  switch (metric) {
    case 'water':
      return record.water;
    case 'steps':
      return record.steps;
    case 'intake':
      return sumMealKcal(record.meals);
    case 'burn':
      return getBurnedKcal(record.exercises);
  }
}

/** 그날 무언가라도 기록했는지. 값이 0인 것과 기록 자체가 없는 것은 다르다. */
export function hasRecord(record: DailyRecord | undefined): boolean {
  if (!record) return false;
  return (
    record.water > 0 ||
    record.steps > 0 ||
    record.exercises.length > 0 ||
    Object.values(record.meals).some((list) => list.length > 0)
  );
}

/** 오늘을 마지막으로 하는 최근 n일의 날짜 키. 기록 맵에서 직접 꺼내 쓸 때 쓴다. */
export function recentDateKeys(days = 7, today = new Date()): string[] {
  const keys: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    keys.push(dateKey(d));
  }
  return keys;
}

export interface DaySeries {
  /** 요일 한 글자. 마지막 칸이 오늘이다 */
  labels: string[];
  values: number[];
  /** 기록이 있는 날 수. 화면이 "보여줄 만큼 쌓였는지" 판단하는 기준 */
  daysWithRecord: number;
}

/** 오늘을 마지막 칸으로 두고 최근 n일을 뽑는다. */
export function recentDays(
  records: Record<string, DailyRecord>,
  metric: DailyMetric,
  days = 7,
  today = new Date()
): DaySeries {
  const labels: string[] = [];
  const values: number[] = [];
  let daysWithRecord = 0;

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const record = records[dateKey(d)];
    labels.push(WEEKDAY_LABELS[d.getDay()]);
    values.push(metricOf(record, metric));
    if (hasRecord(record)) daysWithRecord++;
  }

  return { labels, values, daysWithRecord };
}

/** 한 달을 1~4주로 묶어 합계를 낸다. 5주차가 생기면 4주차에 더한다. */
export function weeklyTotals(
  records: Record<string, DailyRecord>,
  metric: DailyMetric,
  year: number,
  month: number
): number[] {
  const totals = [0, 0, 0, 0];
  const lastDay = new Date(year, month, 0).getDate();

  for (let day = 1; day <= lastDay; day++) {
    const week = Math.min(3, Math.floor((day - 1) / 7));
    totals[week] += metricOf(records[dateKey(new Date(year, month - 1, day))], metric);
  }
  return totals;
}

/** 달마다 합계 하나. 차트의 월별 막대에 쓴다. */
export function monthlyTotals(
  records: Record<string, DailyRecord>,
  metric: DailyMetric,
  months: { year: number; month: number }[]
): number[] {
  return months.map((m) => weeklyTotals(records, metric, m.year, m.month).reduce((a, v) => a + v, 0));
}

/**
 * 값이 있는 날만 골라 평균을 낸다.
 * 기록하지 않은 날을 0으로 세어 나누면 "하루 평균"이 실제보다 낮게 나온다.
 */
export function average(values: number[]): number {
  const recorded = values.filter((v) => v > 0);
  if (recorded.length === 0) return 0;
  return Math.round(recorded.reduce((a, v) => a + v, 0) / recorded.length);
}

/**
 * 오늘까지 이어서 기록한 날 수(오늘 포함).
 *
 * 오늘 아직 기록이 없으면 0이다 — 어제까지의 연속을 "지금 이어지는 중"이라고 말하면
 * 오늘 아무것도 안 한 사람에게 칭찬이 뜬다.
 */
export function recordStreak(records: Record<string, DailyRecord>, today = new Date()): number {
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    if (!hasRecord(records[dateKey(d)])) break;
    streak++;
  }
  return streak;
}

/** 기간 안에 기록이 있는 날 수. 0이면 화면은 차트 대신 빈 상태를 보여준다. */
export function daysWithRecordBetween(
  records: Record<string, DailyRecord>,
  months: { year: number; month: number }[]
): number {
  let count = 0;
  months.forEach(({ year, month }) => {
    const lastDay = new Date(year, month, 0).getDate();
    for (let day = 1; day <= lastDay; day++) {
      if (hasRecord(records[dateKey(new Date(year, month - 1, day))])) count++;
    }
  });
  return count;
}
