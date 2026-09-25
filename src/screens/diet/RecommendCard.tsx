import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import GlassCard from '../../components/GlassCard';
import Icon from '../../components/Icon';
import { useTheme } from '../../theme/useTheme';
import { typography, weight } from '../../theme/tokens';
import { RECOMMENDED_MEALS, findAllergyHit } from '../../data/foods';
import { AVOID_TAGS, DISEASE_TAGS, labelOf, labelsOf } from '../../constants/codes';
import { cautionReason, findCautionHit } from '../../utils/foodCaution';
import { useAppStore } from '../../store/useAppStore';

/**
 * README: 퍼스널 추천 식단 카드. 배지는 온보딩에서 받은 못 먹는 음식 목록을 그대로 보여준다.
 * 썸네일은 아이콘 플레이스홀더 — 실제 음식 사진으로 교체 대상.
 */
const MAX_ROWS = 3;

export default function RecommendCard() {
  const { colors } = useTheme();
  const avoid = useAppStore((s) => s.profile.allergies);
  const conditions = useAppStore((s) => s.profile.conditions);

  // 못 먹는 음식에 걸리는 항목은 추천에서 뺀다.
  // 질환에 걸리는 항목(당뇨→고당, 고혈압→고염 등)은 빼지 않고 뒤로 민다. 다 빼면 보여줄 게 없어진다.
  const meals = RECOMMENDED_MEALS.filter((m) => !findAllergyHit(m, avoid))
    .map((m) => ({ meal: m, caution: findCautionHit(m, conditions) }))
    .sort((a, b) => Number(!!a.caution) - Number(!!b.caution))
    .slice(0, MAX_ROWS);

  // 배지에는 실제로 걸러낸 태그만 적는다. 사용자가 등록한 항목을 전부 나열하면
  // 추천 음식과 무관한 것까지 "제외"라고 표시돼 실제 동작과 어긋난다.
  const excluded = [
    ...new Set(RECOMMENDED_MEALS.map((m) => findAllergyHit(m, avoid)).filter((t): t is string => !!t)),
  ];
  const badge = excluded.length > 0 ? `${labelsOf(AVOID_TAGS, excluded).join('·')} 제외` : '전체 추천';

  return (
    <GlassCard style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>퍼스널 추천 식단</Text>
        {/* 칠한 배지 대신 회색 글씨(시안 규칙 2). */}
        <Text style={[styles.badge, { color: colors.textSecondary }]} numberOfLines={1}>
          {badge}
        </Text>
      </View>

      <View style={styles.list}>
        {meals.map(({ meal: m, caution }, i) => (
          // 줄 사이는 얇은 선(시안 규칙 5). 첫 줄 위에는 긋지 않는다.
          <View key={m.id} style={[styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderDivider }]}>
            {/* 실제 음식 사진이 준비되면 이 자리를 Image로 바꾼다. */}
            <View style={[styles.thumb, { backgroundColor: colors.fillMuted }]}>
              <Icon name="diet" size={20} color={colors.textSecondary} />
            </View>
            <View style={styles.rowText}>
              <Text style={[styles.name, { color: colors.textPrimary }]}>{m.name}</Text>
              <Text style={[styles.amount, { color: colors.textSecondary }]}>
                {m.amount}
                {caution ? ` · ${labelOf(DISEASE_TAGS, caution)} 주의(${cautionReason(caution)})` : ''}
              </Text>
            </View>
            <Text style={[styles.kcal, { color: colors.textPrimary }]}>{m.kcal}</Text>
          </View>
        ))}
        {meals.length === 0 && (
          <Text style={[styles.empty, { color: colors.textSecondary }]}>제외 조건에 맞는 추천이 아직 없어요.</Text>
        )}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  title: typography.cardTitle,
  badge: {
    ...typography.micro,
    maxWidth: '55%',
  },
  list: {
    marginTop: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
  },
  thumb: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 14,
    ...weight(600),
  },
  amount: typography.caption,
  kcal: {
    fontSize: 14,
    ...weight(600),
  },
  empty: typography.bodySm,
});
