import { useState } from 'react';
import type { DailyRecord } from '../../store/useAppStore';
import { dateKey } from '../../utils/timeOfDay';
import { addDays, daysBetween } from '../../utils/periodCycle';
import { weeklyTotals, monthlyTotals, daysWithRecordBetween, metricOf, hasRecord, type DailyMetric } from '../../utils/history';
import { rangeSeries } from '../../utils/dateRange';
import { ymAdd, ymRange, ymRangeLabel, ymIndex, YearMonth } from '../../utils/yearMonth';
import type { MonthPreset } from './PeriodBar';

function currentYearMonth(): YearMonth {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

/**
 * 상세 화면(물·걸음)의 "월" 탭 기간 상태와 막대 계산. 두 화면이 같은 코드를 복사해 쓰고 있어 한 곳으로 모았다.
 * - 한 달·3개월·6개월: 끝 달(anchor) 기준으로 거슬러 올라간 달들
 * - 직접 선택: 날짜 두 개(시작~끝, 포함). 구간 길이에 따라 막대 단위가 바뀐다(rangeSeries)
 */
export function usePeriodRange(records: Record<string, DailyRecord>, metric: DailyMetric) {
  const now = currentYearMonth();
  const today = dateKey();
  const [preset, setPreset] = useState<MonthPreset>('1m');
  const [anchor, setAnchor] = useState<YearMonth>(now);
  // 직접 선택의 첫 구간은 최근 30일.
  const [customStart, setCustomStart] = useState(addDays(today, -29));
  const [customEnd, setCustomEnd] = useState(today);

  const windowSize = preset === '1m' ? 1 : preset === '3m' ? 3 : 6;
  const start = ymAdd(anchor, -(windowSize - 1));
  const end = anchor;

  const shift = (delta: number) => {
    if (preset === 'custom') {
      // 구간 길이만큼 통째로 옮긴다. 끝이 오늘을 넘지 않게.
      const len = daysBetween(customStart, customEnd) + 1;
      let s = addDays(customStart, delta * len);
      let e = addDays(customEnd, delta * len);
      if (e > today) {
        e = today;
        s = addDays(today, -(len - 1));
      }
      setCustomStart(s);
      setCustomEnd(e);
      return;
    }
    setAnchor((a) => {
      const next = ymAdd(a, delta);
      return ymIndex(next) > ymIndex(now) ? a : next;
    });
  };

  let labels: string[];
  let values: number[];
  let recordedDays: number;
  let rangeLabel: string;
  if (preset === 'custom') {
    const series = rangeSeries(
      customStart,
      customEnd,
      (k) => metricOf(records[k], metric),
      (k) => hasRecord(records[k]),
    );
    labels = series.labels;
    values = series.values;
    recordedDays = series.recordedDays;
    rangeLabel = `${customStart.replace(/-/g, '.')} – ${customEnd.replace(/-/g, '.')}`;
  } else {
    const months = ymRange(start, end);
    const isSingle = months.length === 1;
    labels = isSingle ? ['1주', '2주', '3주', '4주'] : months.map((m) => `${m.month}월`);
    values = isSingle ? weeklyTotals(records, metric, start.year, start.month) : monthlyTotals(records, metric, months);
    recordedDays = daysWithRecordBetween(records, months);
    rangeLabel = ymRangeLabel(start, end);
  }
  const total = values.reduce((a, v) => a + v, 0);

  return {
    barProps: {
      preset,
      onPresetChange: setPreset,
      start,
      end,
      onShift: shift,
      onPickEndMonth: (ym: YearMonth) => setAnchor(ymIndex(ym) > ymIndex(now) ? now : ym),
      customStart,
      customEnd,
      onCustomChange: (s: string, e: string) => {
        setCustomStart(s);
        setCustomEnd(e);
      },
      currentMonth: now,
    },
    labels,
    values,
    /** 기록한 날의 하루 평균. 기록 안 한 날까지 나누면 실제보다 낮게 나온다. */
    dailyAverage: recordedDays > 0 ? Math.round(total / recordedDays) : 0,
    summaryDesc: `${rangeLabel} · 기록한 날의 하루 평균`,
  };
}
