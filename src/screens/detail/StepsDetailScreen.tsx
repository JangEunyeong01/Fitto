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
import { useAppStore } from '../../store/useAppStore';
import { dateKey } from '../../utils/timeOfDay';
import { recentDays, average } from '../../utils/history';

export default function StepsDetailScreen() {
  const insets = useSafeAreaInsets();
  const goal = useAppStore((s) => s.goals.steps);
  const setGoals = useAppStore((s) => s.setGoals);
  const records = useAppStore((s) => s.dailyRecords);
  const today = records[dateKey()]?.steps ?? 0;

  // 걸음 수는 폰의 건강 데이터에서 와야 한다. 연결 전에는 모든 기간이 0이므로 차트 대신 안내를 띄운다.
  const NOT_CONNECTED = '폰의 건강 데이터를 연결하면 걸음 수가 기록돼요.\n목표는 미리 정해둘 수 있어요.';

  const [period, setPeriod] = useState<Period>('day');
  const range = usePeriodRange(records, 'steps');

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
    chartLabels = range.labels;
    chartValues = range.values;
    summaryValue = range.dailyAverage;
    summaryDesc = range.summaryDesc;
  }

  return (
    <ScreenBackground showTimeGradient={false}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 14, paddingBottom: tabBarSpace(insets.bottom) }]}
        showsVerticalScrollIndicator={false}
      >
        <DetailHeader title="걸음수" />
        <PeriodChips value={period} onChange={setPeriod} />

        {period === 'month' && (
          <PeriodBar {...range.barProps} />
        )}

        <DetailSummaryCard
          value={summaryValue}
          unit=""
          goal={goal}
          periodDesc={summaryDesc}
          note={hasChartData(chartValues) ? undefined : emptyMessage}
        >
          {hasChartData(chartValues) && (
            <DetailBarChart labels={chartLabels} values={chartValues} highlightIndex={highlightIndex} />
          )}
        </DetailSummaryCard>

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
