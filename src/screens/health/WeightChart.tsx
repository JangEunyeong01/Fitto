import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Polyline, Circle, Line } from 'react-native-svg';
import { useTheme } from '../../theme/useTheme';
import { alpha, brand, typography } from '../../theme/tokens';
import { buildChartData, type WeightPoint } from '../../utils/weight';

const HEIGHT = 120;

interface WeightChartProps {
  points: WeightPoint[];
  /** 목표 체중. 범위 안에 들어오면 점선으로 같이 그린다. */
  targetWeight: number | null;
  /** 그릴 너비. 부모에서 onLayout으로 재서 넘긴다. */
  width: number;
}

// 체중 추이 꺾은선. 축 눈금 대신 최고·최저값만 양 끝에 적어 카드가 복잡해지지 않게 한다.
export default function WeightChart({ points, targetWeight, width }: WeightChartProps) {
  const { colors } = useTheme();

  if (points.length === 0 || width <= 0) {
    return <View style={{ height: HEIGHT }} />;
  }

  const chart = buildChartData(points, targetWeight);
  const pad = 10;
  const innerW = Math.max(1, width - pad * 2);
  const innerH = HEIGHT - pad * 2;
  // SVG는 위가 0이라 뒤집는다.
  const toPx = (p: { x: number; y: number }) => ({ x: pad + p.x * innerW, y: pad + (1 - p.y) * innerH });

  const xy = chart.points.map(toPx);
  const polyline = xy.map((p) => `${p.x},${p.y}`).join(' ');
  const targetY = chart.targetY == null ? null : toPx({ x: 0, y: chart.targetY }).y;

  const kgs = points.map((p) => p.kg);

  return (
    <View>
      <Svg width={width} height={HEIGHT}>
        {targetY != null && (
          <Line
            x1={pad}
            y1={targetY}
            x2={width - pad}
            y2={targetY}
            stroke={alpha(brand.mint, 0.9)}
            strokeWidth={1.5}
            strokeDasharray="4 4"
          />
        )}
        <Polyline
          points={polyline}
          fill="none"
          stroke={brand.blue}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {xy.map((p, i) => (
          <Circle
            key={points[i].date}
            cx={p.x}
            cy={p.y}
            // 마지막 기록만 크게 찍어 "지금 여기"를 보여준다.
            r={i === xy.length - 1 ? 4.5 : 2.5}
            fill={i === xy.length - 1 ? brand.blue : colors.solid}
            stroke={brand.blue}
            strokeWidth={1.5}
          />
        ))}
      </Svg>

      <View style={styles.axisRow}>
        <Text style={[styles.axis, { color: colors.sub }]}>최저 {Math.min(...kgs)}kg</Text>
        {targetWeight != null && (
          <Text style={[styles.axis, { color: brand.mint }]}>목표 {targetWeight}kg</Text>
        )}
        <Text style={[styles.axis, { color: colors.sub }]}>최고 {Math.max(...kgs)}kg</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  axisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  axis: typography.captionSm,
});
