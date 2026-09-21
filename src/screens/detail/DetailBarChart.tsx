import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import GlassCard from '../../components/GlassCard';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/tokens';

const BAR_MAX_HEIGHT = 88;

interface DetailBarChartProps {
  labels: string[];
  values: number[];
  /** 오늘/이번 달처럼 강조할 막대의 인덱스. */
  highlightIndex?: number;
  /** 보여줄 기록이 없을 때 막대 대신 띄울 문구. 없으면 값이 전부 0인 차트를 그대로 그린다. */
  emptyMessage?: string;
}

// README: 막대 차트. 최대값 기준 스케일, 값 위에 라벨.
export default function DetailBarChart({ labels, values, highlightIndex, emptyMessage }: DetailBarChartProps) {
  const { colors, brand } = useTheme();
  const maxVal = Math.max(...values, 1);

  // 기록이 하나도 없으면 바닥에 붙은 막대만 늘어선다. 그건 "0을 기록했다"로 읽혀서 문구로 바꾼다.
  if (emptyMessage && values.every((v) => v === 0)) {
    return (
      <GlassCard style={styles.card}>
        <Text style={[styles.empty, { color: colors.textSecondary }]}>{emptyMessage}</Text>
      </GlassCard>
    );
  }

  return (
    <GlassCard style={styles.card}>
      <View style={styles.row}>
        {values.map((v, i) => {
          const h = Math.max(4, (v / maxVal) * BAR_MAX_HEIGHT);
          const highlight = i === highlightIndex;
          return (
            <View key={i} style={styles.col}>
              <Text style={[styles.value, { color: colors.textSecondary }]} numberOfLines={1}>
                {v >= 1000 ? `${(v / 1000).toFixed(1)}천` : v.toLocaleString()}
              </Text>
              <View style={[styles.track, { height: BAR_MAX_HEIGHT }]}>
                {highlight ? (
                  <LinearGradient colors={[brand.blue, brand.blueDeep]} style={[styles.bar, { height: h }]} />
                ) : (
                  <View style={[styles.bar, { height: h, backgroundColor: colors.fillMuted }]} />
                )}
              </View>
              <Text style={[styles.label, { color: colors.textSecondary }]} numberOfLines={1}>
                {labels[i]}
              </Text>
            </View>
          );
        })}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  col: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  value: typography.micro,
  track: {
    width: '100%',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    borderRadius: 5,
  },
  label: typography.captionSm,
  empty: {
    ...typography.bodySm,
    textAlign: 'center',
    paddingVertical: 24,
  },
});
