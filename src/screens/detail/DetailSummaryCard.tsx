import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import GlassCard from '../../components/GlassCard';
import ProgressBar from '../../components/ProgressBar';
import { useTheme } from '../../theme/useTheme';
import { typography, weight } from '../../theme/tokens';

interface DetailSummaryCardProps {
  value: number;
  unit: string;
  goal: number;
  periodDesc: string;
}

// README: 요약 카드 — 큰 수치 + 목표 + 기간 설명.
export default function DetailSummaryCard({ value, unit, goal, periodDesc }: DetailSummaryCardProps) {
  const { colors, brand } = useTheme();
  const progress = goal > 0 ? value / goal : 0;

  return (
    <GlassCard style={styles.card}>
      <Text style={[styles.desc, { color: colors.textSecondary }]}>{periodDesc}</Text>
      <View style={styles.numRow}>
        <Text style={[styles.bigNum, { color: colors.textPrimary }]}>
          {value.toLocaleString()}
          {unit}
        </Text>
        <Text style={[styles.unit, { color: colors.textSecondary }]}>
          {' '}
          / {goal.toLocaleString()}
          {unit}
        </Text>
      </View>
      <View style={styles.barWrap}>
        <ProgressBar progress={progress} height={9} radius={6} gradientColors={[brand.blue, brand.blueDeep]} />
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  desc: typography.label,
  numRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 6,
  },
  bigNum: {
    fontSize: 27,
    ...weight(700),
    letterSpacing: -1,
  },
  unit: typography.unit,
  barWrap: {
    marginTop: 12,
  },
});
