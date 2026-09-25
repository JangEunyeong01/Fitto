import React, { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenBackground from '../../components/ScreenBackground';
import DetailHeader from './DetailHeader';
import PeriodChips, { Period } from './PeriodChips';
import PeriodBar, { MonthPreset } from './PeriodBar';
import DetailSummaryCard from './DetailSummaryCard';
import DetailBarChart, { hasChartData } from './DetailBarChart';
import GoalField from './GoalField';
import CupSizeField from './CupSizeField';
import { useAppStore } from '../../store/useAppStore';
import { dateKey } from '../../utils/timeOfDay';
import { recentDays, weeklyTotals, monthlyTotals, daysWithRecordBetween, average } from '../../utils/history';
import { WATER_GOAL_LIMITS } from '../../utils/goals';
import { ymAdd, ymRange, ymRangeLabel, YearMonth } from '../../utils/yearMonth';

function currentYearMonth(): YearMonth {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export default function WaterDetailScreen() {
  const insets = useSafeAreaInsets();
  const goal = useAppStore((s) => s.goals.water);
  const cup = useAppStore((s) => s.goals.cup);
  const setGoals = useAppStore((s) => s.setGoals);
  const records = useAppStore((s) => s.dailyRecords);
  const today = records[dateKey()]?.water ?? 0;

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
  let emptyMessage = '';

  if (period === 'day') {
    // 물은 하루 총량만 기록한다. 마신 시각을 남기지 않으므로 시간대별로 나눠 보여줄 수 없다.
    chartLabels = [];
    chartValues = [];
    summaryValue = today;
    summaryDesc = '오늘';
    emptyMessage = '물은 하루 총량으로 기록해요. 주 단위로 바꾸면 흐름을 볼 수 있어요.';
  } else if (period === 'week') {
    const week = recentDays(records, 'water');
    chartLabels = week.labels;
    chartValues = week.values;
    highlightIndex = week.values.length - 1;
    // 기록하지 않은 날까지 나누면 평균이 실제보다 낮게 나온다. 기록한 날로만 나눈다.
    summaryValue = average(week.values);
    summaryDesc = '기록한 날의 하루 평균';
    emptyMessage = '아직 물 기록이 없어요. 한 잔을 기록하면 여기에 쌓여요.';
  } else {
    const months = ymRange(start, end);
    const isSingle = months.length === 1;
    chartLabels = isSingle ? ['1주', '2주', '3주', '4주'] : months.map((m) => `${m.month}월`);
    chartValues = isSingle
      ? weeklyTotals(records, 'water', start.year, start.month)
      : monthlyTotals(records, 'water', months);
    const recordedDays = daysWithRecordBetween(records, months);
    const total = chartValues.reduce((a, v) => a + v, 0);
    summaryValue = recordedDays > 0 ? Math.round(total / recordedDays) : 0;
    summaryDesc = `${ymRangeLabel(start, end)} · 기록한 날의 하루 평균`;
    emptyMessage = '이 기간에는 물 기록이 없어요.';
  }

  return (
    <ScreenBackground showTimeGradient={false}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <DetailHeader title="물 섭취" />
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

        <DetailSummaryCard
          value={summaryValue}
          unit="ml"
          goal={goal}
          periodDesc={summaryDesc}
          note={hasChartData(chartValues) ? undefined : emptyMessage}
        >
          {hasChartData(chartValues) && (
            <DetailBarChart labels={chartLabels} values={chartValues} highlightIndex={highlightIndex} />
          )}
        </DetailSummaryCard>

        <GoalField
          title="물 목표"
          value={goal}
          min={WATER_GOAL_LIMITS.min}
          max={WATER_GOAL_LIMITS.max}
          unit="ml"
          onCommit={(v) => setGoals({ water: v })}
        />
        <CupSizeField value={cup} onChange={(v) => setGoals({ cup: v })} />
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
