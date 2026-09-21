import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenBackground from '../../components/ScreenBackground';
import GlassCard from '../../components/GlassCard';
import DetailHeader from './DetailHeader';
import DetailBarChart from './DetailBarChart';
import GoalField from './GoalField';
import { useTheme } from '../../theme/useTheme';
import { useAppStore } from '../../store/useAppStore';
import { dateKey } from '../../utils/timeOfDay';
import { addDays } from '../../utils/periodCycle';
import { getBurnedKcal } from '../../utils/health';
import { typography } from '../../theme/tokens';

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
const DAYS = 7;

/**
 * 활동 상세 (명세 F-013). 홈 활동 카드에서 들어온다.
 * 물·걸음 상세와 달리 예시 데이터를 안 쓴다 — 운동 기록은 사용자가 직접 남긴 값이라
 * 없는 날은 0으로 두는 게 맞다.
 */
export default function ActivityDetailScreen() {
  const insets = useSafeAreaInsets();
  const { colors, brand } = useTheme();
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
            <Stat label="걸음수" value={(todayRecord?.steps ?? 0).toLocaleString()} unit="보" colors={colors} />
            <Stat label="운동 시간" value={`${minutes}`} unit="분" colors={colors} />
            <Stat label="소모" value={burnedByDay[DAYS - 1].toLocaleString()} unit="kcal" colors={colors} />
          </View>
        </GlassCard>

        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>최근 7일 소모 칼로리 · 하루 평균 {weekAvg.toLocaleString()}kcal</Text>
        <DetailBarChart labels={labels} values={burnedByDay} highlightIndex={DAYS - 1} />

        <GlassCard style={styles.card}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>오늘 운동</Text>
          {exercises.length === 0 ? (
            <Text style={[styles.empty, { color: colors.textSecondary }]}>오늘 운동 기록이 없어요.</Text>
          ) : (
            <View style={styles.list}>
              {exercises.map((e) => (
                <View key={e.id} style={styles.row}>
                  <View style={[styles.dot, { backgroundColor: brand.mint }]} />
                  <Text style={[styles.name, { color: colors.textPrimary }]}>{e.name}</Text>
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

function Stat({ label, value, unit, colors }: { label: string; value: string; unit: string; colors: any }) {
  return (
    <View style={styles.statCol}>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
      <View style={styles.statValueRow}>
        <Text style={[styles.statValue, { color: colors.textPrimary }]}>{value}</Text>
        <Text style={[styles.statUnit, { color: colors.textSecondary }]}>{unit}</Text>
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
  cardTitle: typography.sectionTitle,
  sectionLabel: {
    ...typography.label,
    marginBottom: 8,
  },
  statRow: {
    flexDirection: 'row',
    marginTop: 12,
  },
  statCol: {
    flex: 1,
    gap: 4,
  },
  statLabel: typography.label,
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  statValue: typography.itemTitle,
  statUnit: typography.caption,
  empty: {
    ...typography.body,
    marginTop: 10,
  },
  list: {
    marginTop: 10,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  name: {
    ...typography.rowLabel,
    flex: 1,
  },
  detail: typography.caption,
});
