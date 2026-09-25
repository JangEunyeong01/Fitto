import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from '../../components/Icon';
import { useTheme } from '../../theme/useTheme';
import { timeSlots, typography, weight } from '../../theme/tokens';
import { dateKey, getTimeSlot } from '../../utils/timeOfDay';
import { useAppStore } from '../../store/useAppStore';
import { getBurnedKcal, sumMealKcal } from '../../utils/health';
import { recordStreak } from '../../utils/history';
import { buildBriefing } from '../../copy/briefing';
import { daysBetween, getCycleDayNumber, getUpcomingDates } from '../../utils/periodCycle';

/**
 * 홈 상단 — 로고 + 인사 + 오늘 브리핑.
 *
 * 색이 있는 영역(ScreenBackground의 시간대 그라데이션)은 여기까지다. 아래는 고정 배경 + 흰 카드.
 * 예전에는 그라데이션이 화면 위 300px에 옅게 깔려서, 같은 회색 글씨가 카드 위치마다 다르게 보였다.
 *
 * 캐릭터는 넣지 않는다. 바로 아래 칼로리 카드에 이미 있어서, 한 화면에 두 번 나오면 시선이 갈라진다.
 */
export default function HomeHeader() {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const slot = getTimeSlot();

  const persona = useAppStore((s) => s.persona);
  const profile = useAppStore((s) => s.profile);
  const goals = useAppStore((s) => s.goals);
  const records = useAppStore((s) => s.dailyRecords);
  const periodOn = useAppStore((s) => s.periodOn);
  const periodSetupDone = useAppStore((s) => s.periodSetupDone);
  const periodSettings = useAppStore((s) => s.periodSettings);

  const today = dateKey();
  const record = records[today];
  const exercises = record?.exercises ?? [];

  // 생리 기능을 켜고 시작일을 입력한 사람에게만 주기 값을 만든다(명세 F-017).
  const cycleReady = periodOn && periodSetupDone;
  const daysUntilPeriod = cycleReady ? daysBetween(today, getUpcomingDates(today, periodSettings).nextStart) : null;

  const briefing = buildBriefing({
    persona,
    name: profile.nickname,
    timeGreeting: timeSlots[slot].greeting,
    water: record?.water ?? 0,
    waterGoal: goals.water,
    consumedKcal: record ? sumMealKcal(record.meals) : 0,
    kcalGoal: goals.kcal,
    exerciseMinutes: exercises.reduce((a, e) => a + e.minutes, 0),
    burnedKcal: getBurnedKcal(exercises),
    periodOn: cycleReady,
    periodCycleDay: cycleReady ? getCycleDayNumber(today, periodSettings) : null,
    daysUntilPeriod,
    streakDays: recordStreak(records),
  });

  return (
    <View style={styles.wrap}>
      <View style={styles.topRow}>
        <Text style={[styles.logo, { color: colors.textPrimary }]}>Fitto</Text>
        <Pressable
          onPress={() => navigation.navigate('Settings')}
          // 상자 없이 아이콘만(시안 02). 보이는 영역 36에 사방 4씩 넓혀 누르는 영역 44.
          hitSlop={4}
          accessibilityRole="button"
          accessibilityLabel="설정"
          style={styles.iconBtn}
        >
          <Icon name="settings" size={20} color={colors.textPrimary} />
        </Pressable>
      </View>

      <Text style={[styles.greeting, { color: colors.textPrimary }]}>{briefing.greeting}</Text>
      <Text style={[styles.base, { color: colors.textSecondary }]}>{briefing.base}</Text>
      {/* 오늘 특별한 일이 있을 때만. 없으면 줄을 만들지 않는다. */}
      {!!briefing.event && <Text style={[styles.event, { color: colors.textSecondary }]}>{briefing.event}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 22,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  logo: {
    fontSize: 20,
    ...weight(700),
    letterSpacing: -0.4,
  },
  iconBtn: {
    width: 36,
    height: 36,
    marginRight: -8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 시안은 25인데 글자 단계에 없는 값이라 24(display-md)로 맞췄다.
  greeting: {
    ...typography.onboardingTitle,
    letterSpacing: -0.8,
    lineHeight: 24 * 1.3,
  },
  base: {
    fontSize: 15,
    ...weight(400),
    lineHeight: 15 * 1.5,
    marginTop: 6,
  },
  event: {
    ...typography.bodySm,
    marginTop: 2,
  },
});
