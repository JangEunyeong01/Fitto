import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { weight } from '../../theme/tokens';

interface DetailBarChartProps {
  labels: string[];
  values: number[];
  /** 오늘/이번 달처럼 강조할 막대의 인덱스. */
  highlightIndex?: number;
  /** 막대가 가장 길 때의 높이. 요약 카드 안은 88, 활동 카드는 72(시안 07·09). */
  maxHeight?: number;
}

/** 값이 다 0이면 차트를 그리지 않는다. 바닥에 붙은 막대만 늘어서면 "0을 기록했다"로 읽힌다. */
export function hasChartData(values: number[]): boolean {
  return values.some((v) => v > 0);
}

/**
 * 막대 차트. 카드는 부르는 쪽이 감싼다 — 요약 카드 안에 붙기도 하고 제목 있는 카드에 들어가기도 한다.
 * 기록 없는 날은 막대와 숫자를 비운다. 강조 막대만 파랑, 나머지는 옅은 회색(규칙: 강조는 하나).
 */
export default function DetailBarChart({ labels, values, highlightIndex, maxHeight = 88 }: DetailBarChartProps) {
  const { colors, brand } = useTheme();
  const maxVal = Math.max(...values, 1);

  return (
    <View style={styles.row}>
      {values.map((v, i) => {
        const h = Math.max(4, (v / maxVal) * maxHeight);
        const on = i === highlightIndex;
        const textStyle = { color: on ? colors.textPrimary : colors.textSecondary, ...weight(on ? 700 : 500) };
        return (
          <View key={i} style={styles.col}>
            <Text style={[styles.text, styles.value, textStyle]} numberOfLines={1}>
              {v === 0 ? '' : v >= 1000 ? `${(v / 1000).toFixed(1)}천` : v.toLocaleString()}
            </Text>
            <View style={[styles.track, { height: maxHeight }]}>
              {v > 0 && (
                <View style={[styles.bar, { height: h, backgroundColor: on ? brand.blue : colors.fillStrong }]} />
              )}
            </View>
            <Text style={[styles.text, textStyle]} numberOfLines={1}>
              {labels[i]}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 4,
  },
  col: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  text: {
    fontSize: 12,
  },
  value: {
    height: 16,
  },
  track: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bar: {
    width: 18,
    borderRadius: 5,
  },
});
