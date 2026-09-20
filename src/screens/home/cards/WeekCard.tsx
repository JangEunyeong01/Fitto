import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import GlassCard from '../../../components/GlassCard';
import { useTheme } from '../../../theme/useTheme';
import { useAppStore } from '../../../store/useAppStore';
import { recentDays } from '../../../utils/history';
import { typography, weight } from '../../../theme/tokens';

const MAX_KCAL = 2000;
const CHART_HEIGHT = 70;

/** 한 주의 흐름을 말하려면 최소 이만큼은 있어야 한다. 하루치 막대 하나로는 흐름이 아니다. */
const MIN_DAYS = 3;

export default function WeekCard() {
  const { colors, brand } = useTheme();
  const records = useAppStore((s) => s.dailyRecords);

  const { labels, values: intake, daysWithRecord } = recentDays(records, 'intake');
  const { values: burn } = recentDays(records, 'burn');

  if (daysWithRecord < MIN_DAYS) {
    return (
      <GlassCard>
        <Text style={[styles.title, { color: colors.txt }]}>주간 요약</Text>
        <Text style={[styles.empty, { color: colors.sub }]}>
          3일 이상 기록하면 한 주의 섭취·소모 흐름을 보여드려요. 지금은 {daysWithRecord}일 기록했어요.
        </Text>
      </GlassCard>
    );
  }

  return (
    <GlassCard>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: colors.txt }]}>주간 요약</Text>
        <View style={styles.legend}>
          <LegendDot color={brand.blue} label="섭취" textColor={colors.sub} />
          <LegendDot color={brand.mint} label="소모" textColor={colors.sub} />
        </View>
      </View>

      <View style={styles.chartRow}>
        {labels.map((label, i) => {
          const isToday = i === labels.length - 1;
          const intakeH = Math.min(CHART_HEIGHT, (intake[i] / MAX_KCAL) * CHART_HEIGHT);
          const burnH = Math.min(CHART_HEIGHT, (burn[i] / MAX_KCAL) * CHART_HEIGHT);
          return (
            <View key={i} style={styles.col}>
              <View style={[styles.barsWrap, { height: CHART_HEIGHT }]}>
                <View style={[styles.bar, { height: intakeH, backgroundColor: brand.blue }]} />
                <View style={[styles.bar, { height: burnH, backgroundColor: brand.mint }]} />
              </View>
              <Text style={[styles.dayLabel, { color: isToday ? colors.txt : colors.sub }, weight(isToday ? 700 : 500)]}>{label}</Text>
            </View>
          );
        })}
      </View>
    </GlassCard>
  );
}

function LegendDot({ color, label, textColor }: { color: string; label: string; textColor: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={[styles.legendLabel, { color: textColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: typography.sectionTitle,
  empty: {
    ...typography.bodySm,
    marginTop: 10,
  },
  legend: {
    flexDirection: 'row',
    gap: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  legendLabel: typography.captionSm,
  chartRow: {
    flexDirection: 'row',
    marginTop: 16,
  },
  col: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  barsWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
  },
  bar: {
    width: 9,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
  dayLabel: typography.captionSm,
});
