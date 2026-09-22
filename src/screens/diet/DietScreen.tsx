import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import ScreenBackground, { TITLE_GRADIENT_HEIGHT } from '../../components/ScreenBackground';
import GlassCard from '../../components/GlassCard';
import PrimaryButton from '../../components/PrimaryButton';
import ProgressBar from '../../components/ProgressBar';
import Badge from '../../components/Badge';
import FittoCharacter from '../../components/FittoCharacter';
import DateNavigator from '../../components/DateNavigator';
import MealSlotCard from './MealSlotCard';
import RecommendCard from './RecommendCard';
import { useTheme } from '../../theme/useTheme';
import { emptyMeals, useAppStore, type MealSlot } from '../../store/useAppStore';
import { MEAL_SLOTS } from '../../constants/codes';
import { useFoodSearchStore } from '../../store/useFoodSearchStore';
import { dateKey } from '../../utils/timeOfDay';
import { usePastRecord } from '../../hooks/usePastRecord';
import { sumMealKcal } from '../../utils/health';
import { brand, typography } from '../../theme/tokens';

const SLOTS: MealSlot[] = MEAL_SLOTS.map((s) => s.code);

export default function DietScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { colors, typography } = useTheme();
  // 명세 F-020: 날짜별 조회·입력. 탭이 계속 마운트돼 있어 다른 탭에 다녀와도 보던 날짜가 유지된다.
  const [date, setDate] = useState(dateKey());
  const isToday = date === dateKey();
  const record = useAppStore((s) => s.dailyRecords[date]);
  // 지난 날짜는 로그인 때 안 받아온다. 화면을 열 때 그 날짜만 받아온다.
  const loading = usePastRecord(date);
  const goal = useAppStore((s) => s.goals.kcal);
  const openSearch = useFoodSearchStore((s) => s.show);
  // onPress에 show를 그대로 넘기면 이벤트 객체가 옵션 자리로 들어가므로 감싸서 넘긴다.
  const openSearchForDate = () => openSearch({ date });
  const openSearchForSlot = (slot: MealSlot) => openSearch({ date, slot });

  const meals = record?.meals ?? emptyMeals();
  const totalKcal = sumMealKcal(meals);
  const isEmpty = totalKcal === 0;
  const over = totalKcal > goal;

  return (
    <ScreenBackground gradientHeight={TITLE_GRADIENT_HEIGHT}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 14, paddingBottom: 108 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerRow}>
          <Text style={[typography.screenTitle, { color: colors.textPrimary }]}>식단</Text>
          <PrimaryButton small label="+ 음식 기록" onPress={openSearchForDate} style={styles.recordBtn} />
        </View>

        <DateNavigator date={date} onChange={setDate} />

        {isEmpty ? (
          <GlassCard style={styles.card}>
            <View style={styles.emptyInner}>
              <View style={styles.emptyChar}>
                <FittoCharacter current={1} goal={5} size={96} glow={false} />
              </View>
              {/* 명세 F-051 빈 상태 문구. 서버에서 받아오는 중이면 "없다"고 단정하지 않는다. */}
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                {loading ? '기록을 불러오는 중이에요' : isToday ? '오늘 뭐 드셨나요?' : '이날 뭐 드셨나요?'}
              </Text>
              {!loading && (
                <>
                  <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
                    먹은 음식을 한 개만 추가해도 피또가 상태를 알려줄 수 있어요.
                  </Text>
                  <PrimaryButton label="첫 기록 시작하기" onPress={openSearchForDate} style={styles.emptyBtn} />
                </>
              )}
            </View>
          </GlassCard>
        ) : (
          <>
            {/* 명세 F-021: 총 섭취 칼로리와 목표 대비 진행 바, 넘으면 "목표 초과!" */}
            <GlassCard style={styles.card}>
              <View style={styles.summaryTop}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{isToday ? '오늘 섭취' : '이날 섭취'}</Text>
                {over && <Badge label="조금 넘었어요" tone="warn" />}
              </View>
              <Text style={[styles.summaryNum, { color: colors.textPrimary }]}>
                {totalKcal.toLocaleString()}
                <Text style={[styles.summaryGoal, { color: colors.textSecondary }]}> / {goal.toLocaleString()} kcal</Text>
              </Text>
              <View style={styles.summaryBar}>
                <ProgressBar progress={totalKcal / goal} height={8} radius={5} color={over ? brand.peach : brand.blue} />
              </View>
            </GlassCard>

            {SLOTS.map((slot) => (
              <MealSlotCard
                key={slot}
                date={date}
                slot={slot}
                items={meals[slot]}
                memo={record?.mealMemos?.[slot]}
                onAdd={openSearchForSlot}
              />
            ))}
          </>
        )}

        <RecommendCard />

        <View style={styles.bottomRow}>
          <Pressable
            onPress={() => navigation.navigate('Recipe')}
            style={[styles.bottomBtn, { borderColor: colors.borderDivider, backgroundColor: colors.surfaceSubtle }]}
          >
            <Text style={[styles.bottomLabel, { color: colors.textPrimary }]}>나만의 레시피</Text>
          </Pressable>
          <Pressable
            onPress={() => navigation.navigate('DietAnalysis')}
            style={[styles.bottomBtn, { borderColor: colors.borderDivider, backgroundColor: colors.surfaceSubtle }]}
          >
            <Text style={[styles.bottomLabel, { color: colors.textPrimary }]}>식단 분석</Text>
          </Pressable>
        </View>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  recordBtn: {
    height: 36,
    paddingHorizontal: 14,
  },
  card: {
    marginBottom: 12,
  },
  emptyInner: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  emptyChar: {
    opacity: 0.72,
  },
  emptyTitle: {
    ...typography.itemTitle,
    marginTop: 12,
  },
  emptyDesc: {
    ...typography.body,
    textAlign: 'center',
    marginTop: 6,
  },
  emptyBtn: {
    alignSelf: 'stretch',
    marginTop: 16,
  },
  summaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: typography.label,
  summaryNum: {
    ...typography.midNumber,
    marginTop: 6,
  },
  summaryGoal: typography.unit,
  summaryBar: {
    marginTop: 12,
  },
  bottomRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  bottomBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomLabel: typography.rowLabel,
});
