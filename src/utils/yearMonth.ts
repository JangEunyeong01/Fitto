/**
 * 상세 화면의 월 단위 기간 선택에 쓰는 연·월 계산.
 *
 * 예전에는 이 파일에 월간 차트를 채우는 예시 데이터 생성기도 함께 있었다.
 * 기록에서 실제 합계를 내도록 바꾸면서(utils/history.ts) 예시 부분은 지웠다.
 */

export interface YearMonth {
  year: number;
  month: number; // 1-12
}

export function ymAdd(ym: YearMonth, delta: number): YearMonth {
  const total = ym.year * 12 + (ym.month - 1) + delta;
  return { year: Math.floor(total / 12), month: (((total % 12) + 12) % 12) + 1 };
}

export function ymIndex(ym: YearMonth): number {
  return ym.year * 12 + (ym.month - 1);
}

export function ymFromIndex(index: number): YearMonth {
  return { year: Math.floor(index / 12), month: (((index % 12) + 12) % 12) + 1 };
}

export function ymRange(start: YearMonth, end: YearMonth): YearMonth[] {
  const s = ymIndex(start);
  const e = ymIndex(end);
  const out: YearMonth[] = [];
  for (let i = s; i <= e; i++) out.push({ year: Math.floor(i / 12), month: (i % 12) + 1 });
  return out;
}

export function ymLabel(ym: YearMonth): string {
  return `${ym.year}년 ${ym.month}월`;
}

/** README 예시 형식: 단월 "2026년 8월", 복수월 "5월 – 8월 (4개월)". */
export function ymRangeLabel(start: YearMonth, end: YearMonth): string {
  const months = ymRange(start, end);
  if (months.length === 1) return ymLabel(start);
  const startLabel = start.year === end.year ? `${start.month}월` : `${start.year}년 ${start.month}월`;
  return `${startLabel} – ${end.month}월 (${months.length}개월)`;
}
