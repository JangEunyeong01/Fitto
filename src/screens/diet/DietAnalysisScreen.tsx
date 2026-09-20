import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import ScreenBackground from '../../components/ScreenBackground';
import GlassCard from '../../components/GlassCard';
import DetailHeader from '../detail/DetailHeader';
import { useTheme } from '../../theme/useTheme';
import { typography, weight } from '../../theme/tokens';
import { useAppStore } from '../../store/useAppStore';
import { recentDays, average } from '../../utils/history';

const BAR_HEIGHT = 104;

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
  const { colors, brand } = useTheme();
  const records = useAppStore((s) => s.dailyRecords);
  const goal = useAppStore((s) => s.goals.kcal);

  const { labels, values, daysWithRecord } = recentDays(records, 'intake');
  const avgKcal = average(values);
  const maxVal = Math.max(...values, goal);

  return (
    <ScreenBackground showTimeGradient={false}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <DetailHeader title="식단 분석" />

        <GlassCard style={styles.card}>
          <Text style={[styles.cardTitle, { color: colors.txt }]}>최근 7일 섭취</Text>

          {daysWithRecord < MIN_DAYS ? (
            <Text style={[styles.empty, { color: colors.sub }]}>
              3일 이상 기록하면 한 주의 흐름을 보여드려요. 지금은 {daysWithRecord}일 기록했어요.
            </Text>
          ) : (
            <>
              <Text style={[styles.avgKcal, { color: colors.txt }]}>
                {avgKcal.toLocaleString()}
                <Text style={[styles.avgUnit, { color: colors.sub }]}> kcal · 기록한 날의 하루 평균</Text>
              </Text>

              <View style={styles.stackRow}>
                {labels.map((label, i) => {
                  const value = values[i];
                  const h = value > 0 ? Math.max(6, (value / maxVal) * BAR_HEIGHT) : 0;
                  const isToday = i === labels.length - 1;
                  return (
                    <View key={`${label}-${i}`} style={styles.stackCol}>
                      {/* 빈 칸에 배경을 깔면 기록이 없는 날도 막대가 꽉 찬 것처럼 보인다. 바닥선만 둔다. */}
                      <View style={[styles.stackTrack, { height: BAR_HEIGHT, borderBottomColor: colors.line }]}>
                        {value > 0 &&
                          (isToday ? (
                            <LinearGradient colors={[brand.blue, brand.blueDeep]} style={{ height: h }} />
                          ) : (
                            <View style={{ height: h, backgroundColor: brand.blue }} />
                          ))}
                      </View>
                      <Text style={[styles.stackLabel, { color: isToday ? colors.txt : colors.sub }]}>{label}</Text>
                    </View>
                  );
                })}
              </View>

              <Text style={[styles.caption, { color: colors.sub }]}>
                목표 {goal.toLocaleString()}kcal · 기록이 없는 날은 막대가 없어요
              </Text>
            </>
          )}
        </GlassCard>

        <GlassCard style={styles.card}>
          <Text style={[styles.cardTitle, { color: colors.txt }]}>영양소 분석</Text>
          <Text style={[styles.empty, { color: colors.sub }]}>
            지금은 음식의 칼로리만 기록해요. 식품 영양 정보를 연결하면 탄수화물·단백질·지방 비율과
            나트륨·식이섬유를 함께 보여드릴게요.
          </Text>
        </GlassCard>

        <GlassCard style={styles.card}>
          <Text style={[styles.notice, { color: colors.sub }]}>
            분석은 기록된 식단만 반영해요. 의료 진단을 대체하지 않아요.
          </Text>
        </GlassCard>
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
  cardTitle: typography.sectionTitle,
  empty: {
    ...typography.bodySm,
    marginTop: 10,
  },
  avgKcal: {
    fontSize: 26,
    ...weight(700),
    letterSpacing: -1,
    marginTop: 10,
  },
  avgUnit: typography.unit,
  stackRow: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 6,
  },
  stackCol: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  stackTrack: {
    width: '100%',
    borderRadius: 5,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    borderBottomWidth: 1,
  },
  stackLabel: typography.captionSm,
  caption: {
    ...typography.caption,
    marginTop: 12,
  },
  notice: typography.caption,
});
