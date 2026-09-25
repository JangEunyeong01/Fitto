import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenBackground from '../../components/ScreenBackground';
import GlassCard from '../../components/GlassCard';
import DetailHeader from './DetailHeader';
import DetailBarChart, { hasChartData } from './DetailBarChart';
import GoalField from './GoalField';
import { useTheme } from '../../theme/useTheme';
import { useAppStore } from '../../store/useAppStore';
import { dateKey } from '../../utils/timeOfDay';
import { addDays } from '../../utils/periodCycle';
import { getBurnedKcal } from '../../utils/health';
import { recentDays } from '../../utils/history';
import { typography, weight } from '../../theme/tokens';

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
const DAYS = 7;

/**
 * 활동 상세 (명세 F-013). 홈 활동 카드에서 들어온다.
 * 물·걸음 상세와 달리 예시 데이터를 안 쓴다 — 운동 기록은 사용자가 직접 남긴 값이라
 * 없는 날은 0으로 두는 게 맞다.
 */
export default function ActivityDetailScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const records = useAppStore((s) => s.dailyRecords);
  const stepsGoal = useAppStore((s) => s.goals.steps);
  const setGoals = useAppStore((s) => s.setGoals);

  const today = dateKey();
  const days = Array.from({ length: DAYS }, (_, i) => addDays(today, i - (DAYS - 1)));
  const burnedByDay = days.map((k) => getBurnedKcal(records[k]?.exercises ?? []));
  const labels = days.map((k) => WEEKDAY_LABELS[new Date(k).getDay()]);

  const todayRecord = records[today];
  const exercises = todayRecord?.exercises ?? [];
  const minutes = exercises.reduce((a, e) => a + e.minutes, 0);
  const weekAvg = Math.round(burnedByDay.reduce((a, v) => a + v, 0) / DAYS);
  const stepsConnected = recentDays(records, 'steps').values.some((v) => v > 0);

  return (
    <ScreenBackground showTimeGradient={false}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <DetailHeader title="활동" />

        <GlassCard style={styles.card}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>오늘</Text>
          <View style={styles.statRow}>
            {/* 걸음은 폰 건강 데이터에서만 들어온다. 한 번도 안 들어왔으면 0보가 아니라 "연결 전"(홈 활동 카드와 같은 기준). */}
            <Stat
              label="걸음수"
              value={stepsConnected ? (todayRecord?.steps ?? 0).toLocaleString() : '연결 전'}
              unit={stepsConnected ? '보' : ''}
              muted={!stepsConnected}
              colors={colors}
            />
            <Stat label="운동 시간" value={`${minutes}`} unit="분" colors={colors} />
            <Stat label="소모" value={burnedByDay[DAYS - 1].toLocaleString()} unit="kcal" colors={colors} />
          </View>
        </GlassCard>

        {/* 차트 제목과 평균을 카드 안으로 넣었다. 카드 밖 회색 글씨는 어느 카드 얘기인지 흐려진다(시안 09). */}
        <GlassCard style={styles.card}>
          <View style={styles.titleRow}>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>최근 7일 소모 칼로리</Text>
            <Text style={[styles.titleSide, { color: colors.textSecondary }]}>하루 평균 {weekAvg.toLocaleString()}kcal</Text>
          </View>
          {hasChartData(burnedByDay) ? (
            <View style={styles.chartWrap}>
              <DetailBarChart labels={labels} values={burnedByDay} highlightIndex={DAYS - 1} maxHeight={72} />
            </View>
          ) : (
            <Text style={[styles.empty, { color: colors.textSecondary }]}>최근 7일 운동 기록이 없어요.</Text>
          )}
        </GlassCard>

        <GlassCard style={styles.card}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>오늘 운동</Text>
          {exercises.length === 0 ? (
            <Text style={[styles.empty, { color: colors.textSecondary }]}>오늘 운동 기록이 없어요.</Text>
          ) : (
            <View style={styles.list}>
              {exercises.map((e, i) => (
                <View
                  key={e.id}
                  style={[
                    styles.row,
                    i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderDivider },
                  ]}
                >
                  <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
                    {e.name}
                  </Text>
                  <Text style={[styles.detail, { color: colors.textSecondary }]}>
                    {e.minutes}분 · {e.kcal}kcal
                  </Text>
                </View>
              ))}
            </View>
          )}
        </GlassCard>

        <GoalField title="걸음 목표" value={stepsGoal} min={3000} max={20000} unit="보" onCommit={(v) => setGoals({ steps: v })} />
      </ScrollView>
    </ScreenBackground>
  );
}

function Stat({
  label,
  value,
  unit,
  muted,
  colors,
}: {
  label: string;
  value: string;
  unit: string;
  muted?: boolean;
  colors: any;
}) {
  return (
    <View style={styles.statCol}>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
      <View style={styles.statValueRow}>
        <Text style={[styles.statValue, { color: muted ? colors.textSecondary : colors.textPrimary }]}>{value}</Text>
        {!!unit && <Text style={[styles.statUnit, { color: colors.textSecondary }]}>{unit}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
  },
  card: {
    marginBottom: 12,
  },
  cardTitle: typography.cardTitle,
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    minHeight: 22,
  },
  titleSide: {
    fontSize: 12,
    ...weight(600),
  },
  chartWrap: {
    marginTop: 14,
  },
  statRow: {
    flexDirection: 'row',
    marginTop: 14,
  },
  statCol: {
    flex: 1,
    gap: 4,
  },
  statLabel: {
    fontSize: 12,
    ...weight(600),
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  statValue: {
    fontSize: 18,
    ...weight(700),
  },
  statUnit: {
    fontSize: 12,
    ...weight(500),
  },
  empty: {
    ...typography.bodySm,
    marginTop: 10,
  },
  // 마지막 줄 높이(44)가 아래 여백 몫을 해서 카드 바닥 여백을 10 줄인다(시안 09: 아래 8).
  list: {
    marginTop: 4,
    marginBottom: -10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 44,
  },
  name: {
    fontSize: 14,
    ...weight(600),
    flex: 1,
  },
  detail: {
    fontSize: 13,
    ...weight(400),
  },
});
