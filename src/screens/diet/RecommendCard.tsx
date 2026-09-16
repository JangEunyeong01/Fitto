import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import GlassCard from '../../components/GlassCard';
import Badge from '../../components/Badge';
import Icon from '../../components/Icon';
import { useTheme } from '../../theme/useTheme';
import { alpha, brand, typography } from '../../theme/tokens';
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
        <Text style={[styles.title, { color: colors.txt }]}>퍼스널 추천 식단</Text>
        <Badge
          label={badge}
          color={alpha(brand.lavender, 0.28)}
          textColor={colors.txt}
          style={styles.badge}
        />
      </View>

      <View style={styles.list}>
        {meals.map(({ meal: m, caution }) => (
          <View key={m.id} style={styles.row}>
            {/* 실제 음식 사진이 준비되면 이 자리를 Image로 바꾼다. */}
            <View style={[styles.thumb, { backgroundColor: colors.ink, borderColor: colors.line }]}>
              <Icon name="diet" size={20} color={colors.sub} />
            </View>
            <View style={styles.rowText}>
              <Text style={[styles.name, { color: colors.txt }]}>{m.name}</Text>
              <Text style={[styles.amount, { color: colors.sub }]}>
                {m.amount}
                {caution ? ` · ${labelOf(DISEASE_TAGS, caution)} 주의(${cautionReason(caution)})` : ''}
              </Text>
            </View>
            <Text style={[styles.kcal, { color: colors.txt }]}>{m.kcal}</Text>
          </View>
        ))}
        {meals.length === 0 && (
          <Text style={[styles.empty, { color: colors.sub }]}>제외 조건에 맞는 추천이 아직 없어요.</Text>
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
  title: typography.sectionTitle,
  badge: {
    maxWidth: '55%',
  },
  list: {
    marginTop: 12,
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  thumb: {
    width: 46,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  name: typography.rowLabel,
  amount: typography.caption,
  kcal: typography.sectionTitle,
  empty: typography.bodySm,
});
