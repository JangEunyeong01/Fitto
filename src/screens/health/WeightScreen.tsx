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
import { semantic, typography } from '../../theme/tokens';
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

  return (
    <ScreenBackground showTimeGradient={false}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <DetailHeader title="체중 기록" />

        <GlassCard style={styles.card}>
          <Text style={[styles.cardTitle, { color: colors.txt }]}>
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
            <Text style={[styles.unit, { color: colors.sub }]}>kg</Text>
            <PrimaryButton small label="기록" onPress={save} style={styles.saveBtn} />
          </View>
          {alreadyToday && (
            <Text style={[styles.hint, { color: colors.sub }]}>
              오늘은 {weightLog[today]}kg으로 기록돼 있어요. 다시 기록하면 덮어써요.
            </Text>
          )}
        </GlassCard>

        {summary.latest ? (
          <>
            <GlassCard style={styles.card}>
              <View style={styles.summaryRow}>
                <View style={styles.summaryCol}>
                  <Text style={[styles.summaryLabel, { color: colors.sub }]}>현재</Text>
                  <Text style={[styles.bigNum, { color: colors.txt }]}>
                    {summary.latest.kg}
                    <Text style={[styles.bigUnit, { color: colors.sub }]}>kg</Text>
                  </Text>
                </View>

                <View style={styles.summaryCol}>
                  <Text style={[styles.summaryLabel, { color: colors.sub }]}>직전 대비</Text>
                  <Text style={[styles.midNum, { color: changeColor(summary, colors.txt, colors.sub) }]}>
                    {summary.change == null
                      ? '—'
                      : `${summary.change > 0 ? '+' : ''}${summary.change}kg`}
                  </Text>
                </View>

                <View style={styles.summaryCol}>
                  <Text style={[styles.summaryLabel, { color: colors.sub }]}>목표까지</Text>
                  <Text style={[styles.midNum, { color: colors.txt }]}>
                    {summary.toTarget == null
                      ? '—'
                      : summary.reachedTarget
                        ? '달성'
                        : `${Math.abs(summary.toTarget)}kg`}
                  </Text>
                </View>
              </View>

              {profile.targetWeight == null && (
                <Text style={[styles.hint, { color: colors.sub }]}>
                  프로필에서 목표 체중을 정하면 남은 양을 알려드려요.
                </Text>
              )}
            </GlassCard>

            <GlassCard style={styles.card}>
              <Text style={[styles.cardTitle, { color: colors.txt }]}>추이</Text>
              <View style={styles.chartWrap} onLayout={(e) => setChartWidth(e.nativeEvent.layout.width)}>
                <WeightChart points={points} targetWeight={profile.targetWeight} width={chartWidth} />
              </View>
            </GlassCard>

            <GlassCard style={styles.card}>
              <Text style={[styles.cardTitle, { color: colors.txt }]}>기록 {points.length}개</Text>
              <View style={styles.list}>
                {/* 최근 기록이 위로 오게 뒤집는다. */}
                {[...points].reverse().map((p) => (
                  <View key={p.date} style={styles.row}>
                    <Text style={[styles.rowDate, { color: colors.sub }]}>{formatDate(p.date)}</Text>
                    <Text style={[styles.rowKg, { color: colors.txt }]}>{p.kg}kg</Text>
                    <Pressable onPress={() => removeWeight(p.date)} hitSlop={8}>
                      <Icon name="close" size={15} color={colors.sub} />
                    </Pressable>
                  </View>
                ))}
              </View>
            </GlassCard>
          </>
        ) : (
          <GlassCard style={styles.card}>
            <Text style={[styles.emptyTitle, { color: colors.txt }]}>아직 기록이 없어요</Text>
            <Text style={[styles.empty, { color: colors.sub }]}>
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
 */
function changeColor(summary: WeightSummary, txt: string, sub: string): string {
  if (summary.change == null) return sub;
  if (summary.movingToTarget == null) return txt;
  return summary.movingToTarget ? semantic.good : semantic.warn;
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
  cardTitle: typography.sectionTitle,
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  input: {
    flex: 1,
  },
  unit: typography.rowLabel,
  saveBtn: {
    width: 72,
  },
  hint: {
    ...typography.caption,
    marginTop: 8,
  },
  summaryRow: {
    flexDirection: 'row',
  },
  summaryCol: {
    flex: 1,
    gap: 4,
  },
  summaryLabel: typography.label,
  bigNum: typography.bigNumber,
  bigUnit: typography.unit,
  midNum: typography.midNumber,
  chartWrap: {
    marginTop: 12,
  },
  list: {
    marginTop: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
  },
  rowDate: {
    ...typography.bodySm,
    flex: 1,
  },
  rowKg: typography.value,
  emptyTitle: typography.itemTitle,
  empty: {
    ...typography.bodySm,
    marginTop: 6,
  },
});
