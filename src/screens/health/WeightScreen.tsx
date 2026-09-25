import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenBackground from '../../components/ScreenBackground';
import GlassCard from '../../components/GlassCard';
import PrimaryButton from '../../components/PrimaryButton';
import TextField from '../../components/TextField';
import Icon from '../../components/Icon';
import DetailHeader from '../detail/DetailHeader';
import WeightChart from './WeightChart';
import { useTheme } from '../../theme/useTheme';
import { typography, weight } from '../../theme/tokens';
import { useAppStore } from '../../store/useAppStore';
import { useToastStore } from '../../store/useToastStore';
import { dateKey } from '../../utils/timeOfDay';
import { WEIGHT_LIMITS, summarize, toSortedPoints, type WeightSummary } from '../../utils/weight';

export default function WeightScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const weightLog = useAppStore((s) => s.weightLog);
  const profile = useAppStore((s) => s.profile);
  const logWeight = useAppStore((s) => s.logWeight);
  const removeWeight = useAppStore((s) => s.removeWeight);
  const showToast = useToastStore((s) => s.show);

  const [draft, setDraft] = useState('');
  const [chartWidth, setChartWidth] = useState(0);

  const points = useMemo(() => toSortedPoints(weightLog), [weightLog]);
  const summary = useMemo(() => summarize(points, profile.targetWeight), [points, profile.targetWeight]);

  const today = dateKey();
  const alreadyToday = weightLog[today] != null;

  const save = () => {
    const kg = parseFloat(draft);
    if (!Number.isFinite(kg)) {
      showToast('체중을 입력해 주세요');
      return;
    }
    if (kg < WEIGHT_LIMITS.min || kg > WEIGHT_LIMITS.max) {
      showToast(`체중은 ${WEIGHT_LIMITS.min}~${WEIGHT_LIMITS.max}kg 사이로 입력해 주세요`);
      return;
    }
    logWeight(today, Math.round(kg * 10) / 10);
    setDraft('');
    showToast(alreadyToday ? '오늘 기록을 수정했어요' : '체중을 기록했어요');
  };

  // 지우고 바로 되살릴 수 있게 토스트에 실행 취소를 단다(시안 규칙 24). 묻는 창보다 빠르다.
  const remove = (date: string, kg: number) => {
    removeWeight(date);
    showToast(`${formatDate(date)} 기록을 지웠어요`, { label: '실행 취소', onPress: () => logWeight(date, kg) });
  };

  return (
    <ScreenBackground showTimeGradient={false}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <DetailHeader title="체중 기록" />

        <GlassCard style={styles.card}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
            {alreadyToday ? '오늘 기록 수정' : '오늘 체중'}
          </Text>
          <View style={styles.inputRow}>
            <TextField
              value={draft}
              onChangeText={(t) => setDraft(t.replace(/[^0-9.]/g, ''))}
              placeholder={summary.latest ? `${summary.latest.kg}` : '예: 54.2'}
              keyboardType="numeric"
              style={styles.input}
            />
            <Text style={[styles.unit, { color: colors.textSecondary }]}>kg</Text>
            {/* 이 화면에서 칠한 버튼은 이것 하나. 옆 입력칸과 높이(48)를 맞춘다(시안 11). */}
            <PrimaryButton label="기록" onPress={save} style={styles.saveBtn} />
          </View>
          {alreadyToday && (
            <Text style={[styles.hint, { color: colors.textSecondary }]}>
              오늘은 {weightLog[today]}kg으로 기록돼 있어요. 다시 기록하면 덮어써요.
            </Text>
          )}
        </GlassCard>

        {summary.latest ? (
          <>
            <GlassCard style={styles.card}>
              <View style={styles.summaryRow}>
                <Stat label="현재" value={`${summary.latest.kg}`} unit="kg" big colors={colors} />
                <Stat
                  label="직전 대비"
                  value={summary.change == null ? '—' : `${summary.change > 0 ? '+' : ''}${summary.change}`}
                  unit={summary.change == null ? '' : 'kg'}
                  color={changeColor(summary, colors)}
                  colors={colors}
                />
                <Stat
                  label="목표까지"
                  value={
                    summary.toTarget == null ? '—' : summary.reachedTarget ? '달성' : `${Math.abs(summary.toTarget)}`
                  }
                  unit={summary.toTarget == null || summary.reachedTarget ? '' : 'kg'}
                  color={summary.toTarget == null ? colors.textSecondary : colors.textPrimary}
                  colors={colors}
                />
              </View>

              {profile.targetWeight == null && (
                <Text style={[styles.hint, { color: colors.textSecondary }]}>
                  프로필에서 목표 체중을 정하면 남은 양을 알려드려요.
                </Text>
              )}
            </GlassCard>

            <GlassCard style={styles.card}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>추이</Text>
              <View style={styles.chartWrap} onLayout={(e) => setChartWidth(e.nativeEvent.layout.width)}>
                <WeightChart points={points} targetWeight={profile.targetWeight} width={chartWidth} />
              </View>
            </GlassCard>

            <GlassCard style={styles.card}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>기록 {points.length}개</Text>
              <View style={styles.list}>
                {/* 최근 기록이 위로 오게 뒤집는다. */}
                {[...points].reverse().map((p, i) => (
                  <View
                    key={p.date}
                    style={[
                      styles.row,
                      i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderDivider },
                    ]}
                  >
                    <Text style={[styles.rowDate, { color: colors.textSecondary }]}>{formatDate(p.date)}</Text>
                    <Text style={[styles.rowKg, { color: colors.textPrimary }]}>{p.kg}kg</Text>
                    <Pressable
                      onPress={() => remove(p.date, p.kg)}
                      accessibilityRole="button"
                      accessibilityLabel={`${formatDate(p.date)} 기록 삭제`}
                      style={styles.removeBtn}
                    >
                      <Icon name="close" size={16} color={colors.textSecondary} />
                    </Pressable>
                  </View>
                ))}
              </View>
            </GlassCard>
          </>
        ) : (
          <GlassCard style={styles.card}>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>아직 기록이 없어요</Text>
            <Text style={[styles.empty, { color: colors.textSecondary }]}>
              오늘 체중을 남기면 추이와 목표까지 남은 양을 보여드려요.
            </Text>
          </GlassCard>
        )}
      </ScrollView>
    </ScreenBackground>
  );
}

/**
 * 증감 색. "줄었으니 좋다"로 칠하면 증량이 목표인 사람에게 반대로 읽힌다.
 * 목표가 있을 때만 목표 쪽으로 갔는지로 칠하고, 목표가 없으면 색을 쓰지 않는다.
 * 글씨라서 면 색(semantic) 말고 대비를 맞춘 글씨 색을 쓴다.
 */
function changeColor(summary: WeightSummary, colors: any): string {
  if (summary.change == null) return colors.textSecondary;
  if (summary.movingToTarget == null) return colors.textPrimary;
  return summary.movingToTarget ? colors.textGood : colors.textWarn;
}

function Stat({
  label,
  value,
  unit,
  big,
  color,
  colors,
}: {
  label: string;
  value: string;
  unit: string;
  big?: boolean;
  color?: string;
  colors: any;
}) {
  return (
    <View style={styles.summaryCol}>
      <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{label}</Text>
      <View style={styles.statValueRow}>
        <Text style={[big ? styles.bigNum : styles.midNum, { color: color ?? colors.textPrimary }]}>{value}</Text>
        {!!unit && <Text style={[styles.statUnit, { color: colors.textSecondary }]}>{unit}</Text>}
      </View>
    </View>
  );
}

// 2026-09-08 → 9월 8일
function formatDate(key: string): string {
  const [, m, d] = key.split('-');
  return `${Number(m)}월 ${Number(d)}일`;
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
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  input: {
    flex: 1,
  },
  unit: {
    fontSize: 14,
    ...weight(600),
  },
  saveBtn: {
    width: 72,
    height: 48,
  },
  hint: {
    fontSize: 12,
    ...weight(400),
    lineHeight: 18,
    marginTop: 8,
  },
  summaryRow: {
    flexDirection: 'row',
  },
  summaryCol: {
    flex: 1,
    gap: 4,
  },
  summaryLabel: {
    fontSize: 12,
    ...weight(600),
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  bigNum: {
    fontSize: 28,
    ...weight(700),
  },
  midNum: {
    fontSize: 20,
    ...weight(700),
  },
  statUnit: {
    fontSize: 12,
    ...weight(500),
  },
  chartWrap: {
    marginTop: 12,
  },
  // 마지막 줄 높이(44)가 아래 여백 몫을 해서 카드 바닥 여백을 10 줄인다(시안 11: 아래 8).
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
  rowDate: {
    fontSize: 13,
    flex: 1,
  },
  rowKg: {
    fontSize: 14,
    ...weight(700),
  },
  removeBtn: {
    width: 44,
    height: 44,
    marginRight: -14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: typography.itemTitle,
  empty: {
    ...typography.bodySm,
    marginTop: 6,
  },
});
