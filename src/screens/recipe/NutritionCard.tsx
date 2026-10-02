import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import GlassCard from '../../components/GlassCard';
import { useTheme } from '../../theme/useTheme';
import { brand, typography, weight } from '../../theme/tokens';
import { calcNutrition, getNutritionComment, type RecipeLine } from '../../data/ingredients';
import { useAppStore } from '../../store/useAppStore';

/**
 * 탄·단·지 막대 색. 파랑·민트·라벤더를 섞지 않고 파랑 한 계열의 진하기로만 나눈다(시안 13, 디자인 방향).
 * 색만으로 구분하지 않도록 아래에 이름·수치를 같이 적는다.
 */
const MACRO_COLORS = { carbs: '#5E9FC8', protein: brand.blue, fat: '#C9E2F0' };

interface NutritionCardProps {
  lines: RecipeLine[];
}

// 영양 분석 카드 — 총 kcal + 100% 스택 비율 바 + 탄/단/지 3칼럼 + 코멘트.
export default function NutritionCard({ lines }: NutritionCardProps) {
  const { colors } = useTheme();
  const avoid = useAppStore((s) => s.profile.allergies);

  const totals = calcNutrition(lines);
  const comment = getNutritionComment(lines, totals, avoid);

  return (
    <GlassCard style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>영양 분석</Text>
        {/* 배지 대신 회색 글씨 한 마디(시안 규칙: 상태는 글씨로). */}
        <Text style={[styles.source, { color: colors.textSecondary }]}>룰 기반 · API 연동 예정</Text>
      </View>

      <View style={styles.totalRow}>
        <Text style={[styles.totalKcal, { color: colors.textPrimary }]}>{totals.kcal.toLocaleString()}</Text>
        <Text style={[styles.totalUnit, { color: colors.textSecondary }]}>kcal</Text>
      </View>

      <View style={[styles.stackBar, { backgroundColor: colors.fillMuted }]}>
        <View style={{ width: `${totals.carbsPct}%`, backgroundColor: MACRO_COLORS.carbs }} />
        <View style={{ width: `${totals.proteinPct}%`, backgroundColor: MACRO_COLORS.protein }} />
        <View style={{ width: `${totals.fatPct}%`, backgroundColor: MACRO_COLORS.fat }} />
      </View>

      <View style={styles.macroRow}>
        <Macro label="탄수화물" dot={MACRO_COLORS.carbs} value={totals.carbs} pct={totals.carbsPct} colors={colors} />
        <Macro label="단백질" dot={MACRO_COLORS.protein} value={totals.protein} pct={totals.proteinPct} colors={colors} />
        <Macro label="지방" dot={MACRO_COLORS.fat} value={totals.fat} pct={totals.fatPct} colors={colors} />
      </View>

      <Text style={[styles.comment, { color: colors.textPrimary }]}>{comment}</Text>
    </GlassCard>
  );
}

function Macro({
  label,
  dot,
  value,
  pct,
  colors,
}: {
  label: string;
  dot: string;
  value: number;
  pct: number;
  colors: any;
}) {
  return (
    <View style={styles.macroCol}>
      <View style={styles.macroLabelRow}>
        <View style={[styles.dot, { backgroundColor: dot }]} />
        <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>{label}</Text>
      </View>
      <Text style={[styles.macroValue, { color: colors.textPrimary }]}>{value}g</Text>
      <Text style={[styles.macroPct, { color: colors.textSecondary }]}>{pct}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    minHeight: 22,
  },
  title: typography.cardTitle,
  source: {
    fontSize: 12,
    ...weight(500),
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 10,
  },
  totalKcal: {
    fontSize: 30,
    ...weight(700),
    letterSpacing: -1.1,
    lineHeight: 32,
  },
  totalUnit: {
    fontSize: 14,
    ...weight(600),
  },
  stackBar: {
    flexDirection: 'row',
    gap: 2,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 14,
  },
  macroRow: {
    flexDirection: 'row',
    marginTop: 14,
  },
  macroCol: {
    flex: 1,
  },
  macroLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  macroLabel: {
    fontSize: 12,
    ...weight(600),
  },
  macroValue: {
    fontSize: 15,
    ...weight(700),
    marginTop: 4,
  },
  macroPct: {
    fontSize: 12,
    ...weight(500),
  },
  comment: {
    fontSize: 13,
    ...weight(400),
    lineHeight: 13 * 1.5,
    marginTop: 12,
  },
});
