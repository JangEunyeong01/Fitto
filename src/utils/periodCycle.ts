/**
 * 생리 주기 계산. 실제 예측 알고리즘 대신 표준적인 평균 주기 모델(마지막 시작일 + 평균 주기·생리
 * 기간)을 쓴다 — 실제 헬스 API/센서 연동 전까지의 근사치이며, 오차가 있을 수 있다는 걸 감안한다.
 */

export type DayType = 'period' | 'fertile' | 'ovulation' | null;

const DAY_MS = 24 * 60 * 60 * 1000;

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function daysBetween(fromKey: string, toKey: string): number {
  const a = parseDateKey(fromKey).getTime();
  const b = parseDateKey(toKey).getTime();
  return Math.round((b - a) / DAY_MS);
}

/** lastStart를 기준으로 dateKey가 주기 안에서 며칠째(0-indexed)인지. 과거·미래 날짜에도 주기를 반복해 적용한다. */
function cycleOffset(dateKey: string, lastStart: string, cycleLength: number): number {
  const diff = daysBetween(lastStart, dateKey);
  return ((diff % cycleLength) + cycleLength) % cycleLength;
}

/** 배란일은 다음 생리 시작 14일 전이 표준적인 추정치다. */
function ovulationOffset(cycleLength: number): number {
  return Math.max(0, cycleLength - 14);
}

export interface PeriodSettings {
  lastStartDate: string; // dateKey. 가장 최근 생리 시작일.
  cycleLength: number; // 평균 주기(일)
  periodLength: number; // 생리 지속 기간(일)
}

export function getDayType(dateKey: string, settings: PeriodSettings): DayType {
  const offset = cycleOffset(dateKey, settings.lastStartDate, settings.cycleLength);
  if (offset < settings.periodLength) return 'period';

  const ovul = ovulationOffset(settings.cycleLength);
  if (offset === ovul) return 'ovulation';
  // 가임기: 배란일 기준 5일 전 ~ 당일(정자 생존 기간을 고려한 통상적인 범위).
  if (offset >= ovul - 5 && offset <= ovul) return 'fertile';
  return null;
}

/** 홈 카드의 "D+3" 배지 — 이번 주기 며칠째인지(시작일 = 1일차). */
export function getCycleDayNumber(today: string, settings: PeriodSettings): number {
  return cycleOffset(today, settings.lastStartDate, settings.cycleLength) + 1;
}

/** 오늘부터 다음 가임기 시작일까지 남은 일수. 이미 가임기 안이면 0. */
export function getDaysUntilFertile(today: string, settings: PeriodSettings): number {
  const ovul = ovulationOffset(settings.cycleLength);
  const fertileStart = ((ovul - 5) % settings.cycleLength + settings.cycleLength) % settings.cycleLength;
  const todayOffset = cycleOffset(today, settings.lastStartDate, settings.cycleLength);
  if (todayOffset >= fertileStart && todayOffset <= ovul) return 0;
  const diff = fertileStart - todayOffset;
  return diff > 0 ? diff : diff + settings.cycleLength;
}

/** 달력에 그릴 한 달치 날짜 셀(앞뒤 빈 칸 포함, 일요일 시작). */
export function getMonthGrid(year: number, month: number): (string | null)[] {
  const first = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const leadingBlanks = first.getDay();
  const cells: (string | null)[] = Array(leadingBlanks).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(toDateKey(new Date(year, month - 1, d)));
  }
  return cells;
}

export function addDays(key: string, n: number): string {
  const d = parseDateKey(key);
  d.setDate(d.getDate() + n);
  return toDateKey(d);
}

/**
 * 설정 화면 미리보기(명세 F-044). 오늘(포함) 이후 가장 가까운 배란일과 그 앞 5일 가임기,
 * 다음 생리 시작일을 돌려준다. 달력 색(getDayType)과 같은 규칙이라 두 곳이 어긋나지 않는다.
 * 오늘이 시작일이면 "다음 예정일"은 한 주기 뒤로 본다.
 */
export function getUpcomingDates(today: string, s: PeriodSettings) {
  const todayOffset = cycleOffset(today, s.lastStartDate, s.cycleLength);
  const daysUntil = (target: number) => (target - todayOffset + s.cycleLength) % s.cycleLength;
  const ovulation = addDays(today, daysUntil(ovulationOffset(s.cycleLength)));
  return {
    nextStart: addDays(today, daysUntil(0) || s.cycleLength),
    ovulation,
    fertileStart: addDays(ovulation, -5),
    fertileEnd: ovulation,
  };
}

/** 달력 월 이동. 12월→1월 넘김을 한 곳에서 처리한다. */
export function shiftYearMonth(v: { year: number; month: number }, delta: number) {
  const total = v.year * 12 + (v.month - 1) + delta;
  return { year: Math.floor(total / 12), month: (total % 12) + 1 };
}
