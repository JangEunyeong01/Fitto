import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import ScreenBackground from '../../components/ScreenBackground';
import GlassCard from '../../components/GlassCard';
import ProgressBar from '../../components/ProgressBar';
import Icon from '../../components/Icon';
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
import { brand, typography, weight } from '../../theme/tokens';
import { slotLabel } from '../../utils/meal';

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

  // 기록된 끼니만 카드로 만들고, 빈 끼니는 한 줄 글씨 버튼으로 모은다(시안 규칙 11).
  const filledSlots = SLOTS.filter((slot) => meals[slot].length > 0);
  const emptySlots = SLOTS.filter((slot) => meals[slot].length === 0);

  return (
    <ScreenBackground showTimeGradient={false}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 14, paddingBottom: 108 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerRow}>
          <Text style={[typography.screenTitle, { color: colors.textPrimary }]}>식단</Text>
          {/* 탭 화면의 기록 버튼은 진한 글씨 + 아이콘(시안 규칙 1). */}
          <Pressable
            onPress={openSearchForDate}
            accessibilityRole="button"
            style={({ pressed }) => [styles.recordBtn, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Icon name="plus" size={20} color={colors.textPrimary} strokeWidth={2} />
            <Text style={[styles.recordBtnLabel, { color: colors.textPrimary }]}>음식 기록</Text>
          </Pressable>
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
                <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
                  먹은 음식을 한 개만 추가해도 피또가 상태를 알려줄 수 있어요.
                </Text>
              )}
            </View>
          </GlassCard>
        ) : (
          // 명세 F-021: 총 섭취 칼로리와 목표 대비 진행 바.
          <GlassCard style={styles.card}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
              {isToday ? '오늘 섭취' : '이날 섭취'}
              {/* 넘쳐도 빨강·배지로 몰아세우지 않는다. 회색 글씨 한 마디(기준서 표기 원칙). */}
              {over ? ' · 조금 넘었어요' : ''}
            </Text>
            <View style={styles.summaryNumRow}>
              <Text style={[styles.summaryNum, { color: colors.textPrimary }]}>{totalKcal.toLocaleString()}</Text>
              <Text style={[styles.summaryGoal, { color: colors.textSecondary }]}>/ {goal.toLocaleString()} kcal</Text>
            </View>
            <View style={styles.summaryBar}>
              <ProgressBar progress={totalKcal / goal} height={6} radius={3} color={over ? brand.peach : brand.blue} />
            </View>
          </GlassCard>
        )}

        {filledSlots.map((slot) => (
          <MealSlotCard
            key={slot}
            date={date}
            slot={slot}
            items={meals[slot]}
            memo={record?.mealMemos?.[slot]}
            onAdd={openSearchForSlot}
          />
        ))}

        {emptySlots.length > 0 && !loading && (
          <View style={styles.otherSlots}>
            <Text style={[styles.otherLabel, { color: colors.textSecondary }]}>
              {filledSlots.length > 0 ? '다른 끼니' : '끼니 추가'}
            </Text>
            {emptySlots.map((slot) => (
              <Pressable
                key={slot}
                onPress={() => openSearchForSlot(slot)}
                accessibilityRole="button"
                accessibilityLabel={`${slotLabel(slot)}에 음식 추가`}
                style={({ pressed }) => [styles.slotBtn, { opacity: pressed ? 0.6 : 1 }]}
              >
                <Icon name="plus" size={16} color={colors.textPrimary} strokeWidth={2} />
                <Text style={[styles.slotBtnLabel, { color: colors.textPrimary }]}>{slotLabel(slot)}</Text>
              </Pressable>
            ))}
          </View>
        )}

        <RecommendCard />

        {/* 다른 화면으로 가는 문 두 개. 박스 버튼 둘 대신 카드 한 장에 줄 두 개(시안 04). */}
        <GlassCard style={styles.card} noPadding>
          <LinkRow label="나만의 레시피" onPress={() => navigation.navigate('Recipe')} colors={colors} />
          <LinkRow label="식단 분석" onPress={() => navigation.navigate('DietAnalysis')} colors={colors} divider />
        </GlassCard>
      </ScrollView>
    </ScreenBackground>
  );
}

function LinkRow({ label, onPress, colors, divider }: { label: string; onPress: () => void; colors: any; divider?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={[styles.linkRow, divider && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderDivider }]}
    >
      <Text style={[styles.linkLabel, { color: colors.textPrimary }]}>{label}</Text>
      <Icon name="chevronRight" size={16} color={colors.textSecondary} />
    </Pressable>
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
    minHeight: 40,
    marginBottom: 12,
  },
  recordBtn: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  recordBtnLabel: {
    fontSize: 15,
    ...weight(600),
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
  summaryLabel: typography.unit,
  summaryNumRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 8,
  },
  // 시안은 30인데 글자 단계에 없어 28(display-lg)로 맞췄다.
  summaryNum: {
    ...typography.bigNumber,
    lineHeight: 28 * 1.1,
  },
  summaryGoal: {
    fontSize: 14,
    ...weight(600),
  },
  summaryBar: {
    marginTop: 14,
  },
  otherSlots: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    columnGap: 18,
    paddingHorizontal: 4,
    marginTop: -2,
    marginBottom: 10,
  },
  otherLabel: typography.unit,
  slotBtn: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  slotBtnLabel: {
    fontSize: 14,
    ...weight(600),
  },
  linkRow: {
    height: 52,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  linkLabel: {
    fontSize: 15,
    ...weight(600),
  },
});
