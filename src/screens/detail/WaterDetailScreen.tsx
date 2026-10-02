import React, { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tabBarSpace } from '../../navigation/TabBar';
import ScreenBackground from '../../components/ScreenBackground';
import DetailHeader from './DetailHeader';
import PeriodChips, { Period } from './PeriodChips';
import PeriodBar from './PeriodBar';
import { usePeriodRange } from './usePeriodRange';
import DetailSummaryCard from './DetailSummaryCard';
import DetailBarChart, { hasChartData } from './DetailBarChart';
import GoalField from './GoalField';
import CupSizeField from './CupSizeField';
import { useAppStore } from '../../store/useAppStore';
import { dateKey } from '../../utils/timeOfDay';
import { recentDays, average } from '../../utils/history';
import { WATER_GOAL_LIMITS } from '../../utils/goals';

export default function WaterDetailScreen() {
  const insets = useSafeAreaInsets();
  const goal = useAppStore((s) => s.goals.water);
  const cup = useAppStore((s) => s.goals.cup);
  const setGoals = useAppStore((s) => s.setGoals);
  const records = useAppStore((s) => s.dailyRecords);
  const today = records[dateKey()]?.water ?? 0;

  const [period, setPeriod] = useState<Period>('day');
  const range = usePeriodRange(records, 'water');

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
    chartLabels = range.labels;
    chartValues = range.values;
    summaryValue = range.dailyAverage;
    summaryDesc = range.summaryDesc;
    emptyMessage = '이 기간에는 물 기록이 없어요.';
  }

  return (
    <ScreenBackground showTimeGradient={false}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 14, paddingBottom: tabBarSpace(insets.bottom) }]}
        showsVerticalScrollIndicator={false}
      >
        <DetailHeader title="물 섭취" />
        <PeriodChips value={period} onChange={setPeriod} />

        {period === 'month' && (
          <PeriodBar {...range.barProps} />
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
