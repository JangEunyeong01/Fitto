import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenBackground from '../../components/ScreenBackground';
import GlassCard from '../../components/GlassCard';
import DetailHeader from '../detail/DetailHeader';
import DetailBarChart from '../detail/DetailBarChart';
import { useTheme } from '../../theme/useTheme';
import { typography, weight } from '../../theme/tokens';
import { useAppStore } from '../../store/useAppStore';
import { recentDays, average } from '../../utils/history';

/** 한 주의 흐름을 말하려면 최소 이만큼은 기록돼 있어야 한다. */
const MIN_DAYS = 3;

/**
 * 식단 분석(명세 F-025).
 *
 * 예전에는 탄·단·지 비율을 그렸는데, 앱이 기록하는 건 칼로리뿐이라 그 비율은 칼로리에서 만들어낸 값이었다.
 * 먹은 걸 바꾸지 않아도 화면의 비율이 그럴듯하게 움직이는 상태였다.
 * 지금은 기록에서 나오는 것(날짜별 섭취 칼로리)만 보여주고, 영양소는 식품 영양 정보를 붙인 뒤에 되살린다.
 */
export default function DietAnalysisScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const records = useAppStore((s) => s.dailyRecords);
  const goal = useAppStore((s) => s.goals.kcal);

  const { labels, values, daysWithRecord } = recentDays(records, 'intake');
  const avgKcal = average(values);

  return (
    <ScreenBackground showTimeGradient={false}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <DetailHeader title="식단 분석" />

        <GlassCard style={styles.card}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>최근 7일 섭취</Text>

          {daysWithRecord < MIN_DAYS ? (
            <Text style={[styles.empty, { color: colors.textSecondary }]}>
              3일 이상 기록하면 한 주의 흐름을 보여드려요. 지금은 {daysWithRecord}일 기록했어요.
            </Text>
          ) : (
            <>
              <View style={styles.avgRow}>
                <Text style={[styles.avgKcal, { color: colors.textPrimary }]}>{avgKcal.toLocaleString()}</Text>
                <Text style={[styles.avgUnit, { color: colors.textSecondary }]}>kcal · 기록한 날의 하루 평균</Text>
              </View>

              {/* 물·걸음 상세와 같은 막대. 오늘만 파랑, 기록 없는 날은 막대를 비운다(시안 12). */}
              <View style={styles.chartWrap}>
                <DetailBarChart labels={labels} values={values} highlightIndex={labels.length - 1} maxHeight={96} />
              </View>

              <Text style={[styles.caption, { color: colors.textSecondary }]}>
                목표 {goal.toLocaleString()}kcal · 기록이 없는 날은 막대가 없어요
              </Text>
            </>
          )}
        </GlassCard>

        <GlassCard style={styles.card}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>영양소 분석</Text>
          <Text style={[styles.empty, { color: colors.textSecondary }]}>
            지금은 음식의 칼로리만 기록해요. 식품 영양 정보를 연결하면 탄수화물·단백질·지방 비율과
            나트륨·식이섬유를 함께 보여드릴게요.
          </Text>
        </GlassCard>

        {/* 안내 한 줄은 카드 없이. 카드로 싸면 내용 카드와 무게가 같아진다(시안 12). */}
        <Text style={[styles.notice, { color: colors.textSecondary }]}>
          분석은 기록된 식단만 반영해요. 의료 진단을 대체하지 않아요.
        </Text>
      </ScrollView>
    </ScreenBackground>
  );
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
  empty: {
    fontSize: 13,
    ...weight(400),
    lineHeight: 13 * 1.5,
    marginTop: 6,
  },
  avgRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 10,
  },
  avgKcal: {
    fontSize: 30,
    ...weight(700),
    letterSpacing: -1.1,
    lineHeight: 32,
  },
  avgUnit: {
    fontSize: 14,
    ...weight(600),
  },
  chartWrap: {
    marginTop: 14,
  },
  caption: {
    fontSize: 12,
    ...weight(400),
    lineHeight: 18,
    marginTop: 10,
  },
  notice: {
    fontSize: 12,
    ...weight(400),
    lineHeight: 18,
    paddingHorizontal: 4,
    paddingTop: 4,
  },
});
