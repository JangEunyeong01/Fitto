import React, { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenBackground from '../../components/ScreenBackground';
import DetailHeader from './DetailHeader';
import PeriodChips, { Period } from './PeriodChips';
import PeriodBar, { MonthPreset } from './PeriodBar';
import DetailSummaryCard from './DetailSummaryCard';
import DetailBarChart from './DetailBarChart';
import GoalField from './GoalField';
import { useAppStore } from '../../store/useAppStore';
import { dateKey } from '../../utils/timeOfDay';
import { recentDays, weeklyTotals, monthlyTotals, daysWithRecordBetween, average } from '../../utils/history';
import { ymAdd, ymRange, ymRangeLabel, YearMonth } from '../../utils/yearMonth';

function currentYearMonth(): YearMonth {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export default function StepsDetailScreen() {
  const insets = useSafeAreaInsets();
  const goal = useAppStore((s) => s.goals.steps);
  const setGoals = useAppStore((s) => s.setGoals);
  const records = useAppStore((s) => s.dailyRecords);
  const today = records[dateKey()]?.steps ?? 0;

  // 걸음 수는 폰의 건강 데이터에서 와야 한다. 연결 전에는 모든 기간이 0이므로 차트 대신 안내를 띄운다.
  const NOT_CONNECTED = '폰의 건강 데이터를 연결하면 걸음 수가 기록돼요. 목표는 미리 정해둘 수 있어요.';

  const [period, setPeriod] = useState<Period>('day');
  const [preset, setPreset] = useState<MonthPreset>('1m');
  const now = currentYearMonth();
  const [anchor, setAnchor] = useState<YearMonth>(now);
  const [customStart, setCustomStart] = useState<YearMonth>(ymAdd(now, -3));
  const [customEnd, setCustomEnd] = useState<YearMonth>(now);

  const windowSize = preset === '1m' ? 1 : preset === '3m' ? 3 : preset === '6m' ? 6 : null;
  const start = preset === 'custom' ? customStart : ymAdd(anchor, -((windowSize ?? 1) - 1));
  const end = preset === 'custom' ? customEnd : anchor;

  const shift = (delta: number) => {
    if (preset === 'custom') {
      setCustomStart((s) => ymAdd(s, delta));
      setCustomEnd((e) => ymAdd(e, delta));
      return;
    }
    setAnchor((a) => {
      const next = ymAdd(a, delta);
      return next.year * 12 + next.month > now.year * 12 + now.month ? a : next;
    });
  };

  let chartLabels: string[] = [];
  let chartValues: number[] = [];
  let highlightIndex: number | undefined;
  let summaryValue = 0;
  let summaryDesc = '';

  let emptyMessage = NOT_CONNECTED;

  if (period === 'day') {
    // 걸음 수는 하루 합계로만 들어온다. 시간대별로 나누려면 원본 기록이 있어야 한다.
    chartLabels = [];
    chartValues = [];
    summaryValue = today;
    summaryDesc = '오늘';
  } else if (period === 'week') {
    const week = recentDays(records, 'steps');
    chartLabels = week.labels;
    chartValues = week.values;
    highlightIndex = week.values.length - 1;
    summaryValue = average(week.values);
    summaryDesc = '기록한 날의 하루 평균';
  } else {
    const months = ymRange(start, end);
    const isSingle = months.length === 1;
    chartLabels = isSingle ? ['1주', '2주', '3주', '4주'] : months.map((m) => `${m.month}월`);
    chartValues = isSingle
      ? weeklyTotals(records, 'steps', start.year, start.month)
      : monthlyTotals(records, 'steps', months);
    const recordedDays = daysWithRecordBetween(records, months);
    const total = chartValues.reduce((a, v) => a + v, 0);
    summaryValue = recordedDays > 0 ? Math.round(total / recordedDays) : 0;
    summaryDesc = `${ymRangeLabel(start, end)} · 기록한 날의 하루 평균`;
  }

  return (
    <ScreenBackground showTimeGradient={false}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <DetailHeader title="걸음수" />
        <PeriodChips value={period} onChange={setPeriod} />

        {period === 'month' && (
          <PeriodBar
            preset={preset}
            onPresetChange={setPreset}
            start={start}
            end={end}
            onShift={shift}
            onCustomChange={(s, e) => {
              setCustomStart(s);
              setCustomEnd(e);
            }}
            currentMonth={now}
          />
        )}

        <DetailSummaryCard value={summaryValue} unit="" goal={goal} periodDesc={summaryDesc} />
        <DetailBarChart
          labels={chartLabels}
          values={chartValues}
          highlightIndex={highlightIndex}
          emptyMessage={emptyMessage}
        />

        <GoalField title="걸음 목표" value={goal} min={3000} max={20000} unit="보" onCommit={(v) => setGoals({ steps: v })} />
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
  },
});
