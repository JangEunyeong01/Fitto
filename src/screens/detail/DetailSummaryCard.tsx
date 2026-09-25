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
  /** 같은 카드 아래쪽에 붙일 차트. 숫자와 흐름을 한 장에서 본다(시안 07). */
  children?: React.ReactNode;
  /** 차트 대신 카드 밑에 적을 안내. 기록이 없거나 연결 전일 때(시안 08). */
  note?: string;
}

// 큰 숫자 + 목표 + 얇은 진행 바. 차트가 있으면 같은 카드 안에 이어 붙인다.
export default function DetailSummaryCard({ value, unit, goal, periodDesc, children, note }: DetailSummaryCardProps) {
  const { colors, brand } = useTheme();
  const progress = goal > 0 ? value / goal : 0;

  return (
    <>
      <GlassCard style={styles.card}>
        <Text style={[styles.desc, { color: colors.textSecondary }]} numberOfLines={1}>
          {periodDesc}
        </Text>
        <View style={styles.numRow}>
          <Text style={[styles.bigNum, { color: colors.textPrimary }]}>{value.toLocaleString()}</Text>
          <Text style={[styles.unit, { color: colors.textSecondary }]}>
            {unit ? `${unit} ` : ''}/ {goal.toLocaleString()}
            {unit}
          </Text>
        </View>
        <View style={styles.barWrap}>
          <ProgressBar progress={progress} height={6} radius={3} color={brand.blue} />
        </View>
        {children && <View style={styles.chartWrap}>{children}</View>}
      </GlassCard>
      {note ? <Text style={[styles.note, { color: colors.textSecondary }]}>{note}</Text> : null}
    </>
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
    gap: 4,
    marginTop: 8,
  },
  bigNum: {
    fontSize: 32,
    ...weight(700),
    letterSpacing: -1.1,
    lineHeight: 34,
  },
  unit: {
    fontSize: 14,
    ...weight(600),
  },
  barWrap: {
    marginTop: 14,
  },
  chartWrap: {
    marginTop: 14,
  },
  note: {
    ...typography.bodySm,
    lineHeight: 13 * 1.55,
    paddingHorizontal: 4,
    paddingTop: 2,
    paddingBottom: 16,
  },
});
