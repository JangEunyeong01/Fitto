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

/** 두 dateKey 사이의 일수. toKey가 뒤면 양수. */
export function daysBetween(fromKey: string, toKey: string): number {
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

/** 실제로 입력한 생리 한 번. end가 null이면 진행 중(서버 period_logs와 같은 모양). */
export interface PeriodLog {
  start: string;
  end: string | null;
}

/** 생리 한 번의 최대 길이. 서버 PeriodService.MAX_LOG_DAYS와 같다. */
export const MAX_LOG_DAYS = 15;

/** 평균을 낼 때 보는 최근 기록 수. 오래된 주기까지 섞으면 요즘 몸 상태가 묻힌다. */
const RECENT = 6;

/**
 * 기록 목록 검사. 서버(PeriodService.validateLogs)와 같은 규칙이라, 앱에서 막으면 서버에서 다시 막힐 일이 없다.
 * @return 문제가 있으면 보여줄 문구, 없으면 null
 */
export function checkLogs(logs: PeriodLog[], today: string): string | null {
  const sorted = [...logs].sort((a, b) => (a.start < b.start ? -1 : 1));
  for (let i = 0; i < sorted.length; i++) {
    const { start, end } = sorted[i];
    if (start > today || (end && end > today)) return '오늘 이후 날짜는 고를 수 없어요';
    if (end && (end < start || daysBetween(start, end) >= MAX_LOG_DAYS)) return `생리 기간은 1일부터 ${MAX_LOG_DAYS}일까지예요`;
    const next = sorted[i + 1];
    if (!next) continue;
    if (!end) return '진행 중인 생리는 가장 최근 기록만 될 수 있어요';
    if (next.start <= end) return '다른 생리 기록과 날짜가 겹쳐요';
  }
  return null;
}

export const sortLogs = (logs: PeriodLog[]) => [...logs].sort((a, b) => (a.start < b.start ? -1 : 1));

/** 끝난 기록의 길이(시작·끝 포함). */
const logLength = (l: PeriodLog) => (l.end ? daysBetween(l.start, l.end) + 1 : null);

const mean = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);

export interface CycleStats {
  /** 최근 주기 길이들(시작일 → 다음 시작일). 오래된 것부터. */
  cycles: number[];
  avgCycle: number | null;
  avgLength: number | null;
  /** 가장 최근에 끝난 주기가 평균과 며칠 차이 나는지. 평균은 그 주기를 뺀 앞 주기들로 낸다. */
  change: number | null;
}

export function cycleStats(logs: PeriodLog[]): CycleStats {
  const sorted = sortLogs(logs);
  const cycles = sorted.slice(1).map((l, i) => daysBetween(sorted[i].start, l.start)).slice(-RECENT);
  const lengths = sorted.map(logLength).filter((n): n is number => n !== null).slice(-RECENT);
  const before = cycles.slice(0, -1);
  const prevAvg = mean(before);
  return {
    cycles,
    avgCycle: mean(cycles),
    avgLength: mean(lengths),
    change: prevAvg !== null ? cycles[cycles.length - 1] - prevAvg : null,
  };
}

/**
 * 평소와 같은지. 의학적 판정이 아니라 일반 범위와의 비교다.
 * - 평균 주기 21~35일, 평균 생리 2~7일이면 일반 범위
 * - 최근 주기가 평균과 7일 넘게 차이 나면 "평소와 다름"(주기 변동이 7~9일을 넘으면 불규칙으로 보는 게 일반적)
 */
export const isTypicalCycle = (n: number) => n >= 21 && n <= 35;
export const isTypicalLength = (n: number) => n >= 2 && n <= 7;
export const isTypicalChange = (n: number) => Math.abs(n) <= 7;

/**
 * 기록이 바뀌면 예측에 쓰는 설정을 다시 맞춘다. 마지막 시작일은 가장 최근 기록,
 * 주기·기간은 기록이 있으면 평균(서버 범위 21~45, 2~10 안으로), 없으면 사용자가 정한 값을 그대로.
 */
export function deriveSettings(logs: PeriodLog[], s: PeriodSettings): PeriodSettings {
  const sorted = sortLogs(logs);
  if (!sorted.length) return s;
  const { avgCycle, avgLength } = cycleStats(sorted);
  const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
  return {
    lastStartDate: sorted[sorted.length - 1].start,
    cycleLength: avgCycle !== null ? clamp(avgCycle, 21, 45) : s.cycleLength,
    periodLength: avgLength !== null ? clamp(avgLength, 2, 10) : s.periodLength,
  };
}

/** 그날을 포함하는 기록. 진행 중이면 오늘까지 포함한다. */
export function findLog(logs: PeriodLog[], key: string, today: string): PeriodLog | undefined {
  return logs.find((l) => key >= l.start && key <= (l.end ?? (today > l.start ? today : l.start)));
}

export interface BandDay {
  type: 'period' | 'fertile' | 'ovulation';
  /** 예측이면 옅게. 사용자가 입력한 생리만 기록으로 본다. */
  predicted: boolean;
}

/**
 * 달력 띠용. getDayType과 같은 규칙이지만 다른 점이 있다.
 * - 입력한 생리 기록은 그대로 진하게 칠한다(평균 기간이 아니라 실제 시작·끝)
 * - 마지막 시작일 **이전**은 기록만 칠한다. 평균 주기를 뒤로 되풀이하면 가짜 기록이 된다
 * - 마지막 주기 안의 생리일은 기록이 정한다. 끝났으면 거기까지, 진행 중이면 오늘 뒤는 예측
 * - 기록이 아예 없으면(예전 데이터) 마지막 시작일부터 평균 기간을 기록으로 본다
 */
export function getBandDay(
  dateKey: string,
  s: PeriodSettings,
  logs: PeriodLog[],
  today: string,
  show: PredictShow = SHOW_ALL
): BandDay | null {
  const b = bandDay(dateKey, s, logs, today);
  // 예측을 끈 사람에겐 기록만 남긴다(설정 › 표시할 정보).
  if (b?.predicted && b.type === 'period' && !show.period) return null;
  if (b && b.type !== 'period' && !show.fertile) return null;
  return b;
}

/** 무엇을 예측해서 보여줄지. 기록한 생리는 늘 보인다. */
export interface PredictShow {
  period: boolean;
  fertile: boolean;
}
const SHOW_ALL: PredictShow = { period: true, fertile: true };

function bandDay(dateKey: string, s: PeriodSettings, logs: PeriodLog[], today: string): BandDay | null {
  if (findLog(logs, dateKey, today)) return { type: 'period', predicted: false };
  const diff = daysBetween(s.lastStartDate, dateKey);
  if (diff < 0) return null;
  const type = getDayType(dateKey, s);
  if (!type) return null;
  if (type !== 'period' || diff >= s.cycleLength) return { type, predicted: true };
  // 마지막 주기 안의 생리일
  const last = logs.find((l) => l.start === s.lastStartDate);
  if (!last) return { type, predicted: logs.length > 0 };
  if (last.end) return null;
  return { type, predicted: true };
}

/** 띠가 이어지는 묶음. 배란일은 가임기 띠의 끝이라 같은 묶음이다. */
export function bandGroup(b: BandDay | null): string | null {
  if (!b) return null;
  return `${b.type === 'period' ? 'period' : 'fertile'}-${b.predicted ? 'p' : 'r'}`;
}

/** 생리 화면 맨 위 한 줄. 생리 중이면 며칠째, 아니면 다음 예정일까지. */
export function getPeriodHeadline(today: string, s: PeriodSettings, logs: PeriodLog[] = [], show: PredictShow = SHOW_ALL): string {
  const band = getBandDay(today, s, logs, today, show);
  const n = getCycleDayNumber(today, s);
  if (band?.type === 'period') {
    // 예측한 날을 "생리 중"이라고 단정하지 않는다. 아직 입력이 없으면 예정일 뿐이다.
    if (!band.predicted) return `생리 ${n}일째`;
    return n === 1 ? '오늘 생리 예정일이에요' : `생리 예정 ${n}일째`;
  }
  // 예측을 끄면 "언제 올지" 대신 지금 주기 며칠째인지만.
  // 평균 주기로 되풀이하지 않고 마지막 시작일부터 그대로 센다. 늦어지는 중이면 그게 사실이다(45일째 등).
  if (!show.period) return `이번 주기 ${daysBetween(s.lastStartDate, today) + 1}일째`;
  return `다음 생리까지 ${daysBetween(today, getUpcomingDates(today, s).nextStart)}일`;
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
