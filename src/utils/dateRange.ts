/**
 * 직접 고른 날짜 구간(start~end, 둘 다 포함)을 막대로 묶는다.
 * 구간 길이에 따라 막대 하나가 맡는 단위를 바꾼다 — 한 달 이하는 하루, 반년 이하는 일주일, 그 위는 한 달.
 * 하루 막대가 60개면 손가락보다 가늘어서 읽을 수 없다. 라벨은 막대가 많으면 몇 개만 남기고 비운다.
 *
 * 값은 바깥에서 받는다(valueOf, recorded). 기록 계산(history.ts)은 화면용 모듈까지 끌고 와서
 * 이 파일만 떼어 두면 scripts/check-range.mjs로 Node에서 바로 검사할 수 있다.
 */
export function rangeSeries(
  startKey: string,
  endKey: string,
  valueOf: (dateKey: string) => number,
  recorded: (dateKey: string) => boolean,
): { labels: string[]; values: number[]; unit: 'day' | 'week' | 'month'; recordedDays: number } {
  const days: string[] = [];
  for (let d = parseKey(startKey); toKey(d) <= endKey; d.setDate(d.getDate() + 1)) days.push(toKey(d));
  const recordedDays = days.filter(recorded).length;
  const md = (k: string) => `${Number(k.slice(5, 7))}/${Number(k.slice(8, 10))}`;
  const sparse = (labels: string[]) => {
    const every = Math.ceil(labels.length / 7);
    return labels.map((l, i) => (i % every === 0 ? l : ''));
  };

  if (days.length <= 31) {
    return { labels: sparse(days.map(md)), values: days.map(valueOf), unit: 'day', recordedDays };
  }

  if (days.length <= 183) {
    const labels: string[] = [];
    const values: number[] = [];
    for (let i = 0; i < days.length; i += 7) {
      const week = days.slice(i, i + 7);
      labels.push(md(week[0]));
      values.push(week.reduce((a, k) => a + valueOf(k), 0));
    }
    return { labels: sparse(labels), values, unit: 'week', recordedDays };
  }

  const byMonth = new Map<string, number>();
  days.forEach((k) => byMonth.set(k.slice(0, 7), (byMonth.get(k.slice(0, 7)) ?? 0) + valueOf(k)));
  return {
    labels: [...byMonth.keys()].map((ym) => `${Number(ym.slice(5, 7))}월`),
    values: [...byMonth.values()],
    unit: 'month',
    recordedDays,
  };
}

function parseKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function toKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
