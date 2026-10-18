import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import FittoCharacter from '../../components/FittoCharacter';
import { useTheme } from '../../theme/useTheme';
import { timeSlots, typography, weight } from '../../theme/tokens';
import { dateKey, getTimeSlot } from '../../utils/timeOfDay';
import { useAppStore } from '../../store/useAppStore';
import { getBurnedKcal, getWaterStageSpec, sumMealKcal } from '../../utils/health';
import { recordStreak } from '../../utils/history';
import { buildBriefing } from '../../copy/briefing';
import { daysBetween, getCycleDayNumber, getUpcomingDates } from '../../utils/periodCycle';

/**
 * 홈 상단 — 로고 + 피또 + 인사 + 오늘 브리핑.
 *
 * 색이 있는 영역(ScreenBackground의 시간대 그라데이션)은 여기까지다. 아래는 고정 배경 + 흰 카드.
 * 예전에는 그라데이션이 화면 위 300px에 옅게 깔려서, 같은 회색 글씨가 카드 위치마다 다르게 보였다.
 *
 * 피또는 여기 한 번만 나온다. 예전엔 칼로리 카드 구석의 30px 얼굴이 전부라 "숫자 대신 표정으로"라는
 * 앱 소개와 달리 36px 숫자가 주인공이었다. 첫 줄로 올려 물 단계(크기·떠다니는 속도·흐림)를 보여 준다.
 * 설정 아이콘은 뺐다 — 탭바 설정 탭과 같은 곳으로 가는 길이 두 개였다.
 */
export default function HomeHeader() {
  const { colors } = useTheme();
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
  // 생리 예측을 끈 사람에겐 브리핑에서도 "생리까지 N일"을 꺼낸다.
  const predictPeriod = useAppStore((s) => s.periodDisplay.predictPeriod);
  const daysUntilPeriod =
    cycleReady && predictPeriod ? daysBetween(today, getUpcomingDates(today, periodSettings).nextStart) : null;

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

  const water = record?.water ?? 0;
  const stage = getWaterStageSpec(water, goals.water);

  return (
    <View style={styles.wrap}>
      <Text style={[styles.logo, { color: colors.textPrimary }]}>Fitto</Text>

      <View style={styles.heroRow}>
        {/* 그림만으로는 상태가 전달되지 않으니 스크린리더에는 단계 이름을 읽어 준다. */}
        <View accessible accessibilityRole="image" accessibilityLabel={`피또, ${stage.name}`}>
          {/* 뒤 동그라미(glow)는 끈다. 그라데이션 위에서 동그라미가 피또를 가두는 판처럼 보였다. */}
          <FittoCharacter current={water} goal={goals.water} size={HERO_SIZE} glow={false} />
        </View>
        <View style={styles.textCol}>
          <Text style={[styles.greeting, { color: colors.textPrimary }]}>{briefing.greeting}</Text>
          <Text style={[styles.base, { color: colors.textSecondary }]}>{briefing.base}</Text>
          {/* 오늘 특별한 일이 있을 때만. 없으면 줄을 만들지 않는다. */}
          {!!briefing.event && <Text style={[styles.event, { color: colors.textSecondary }]}>{briefing.event}</Text>}
        </View>
      </View>
    </View>
  );
}

/** 칼로리 카드 큰 숫자(36)보다 확실히 커야 피또가 먼저 읽힌다. */
const HERO_SIZE = 96;

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 22,
  },
  logo: {
    fontSize: 20,
    ...weight(700),
    letterSpacing: -0.4,
    // 예전 설정 아이콘 줄 높이(36)를 지켜 아래 내용이 위로 당겨지지 않게.
    lineHeight: 36,
    marginBottom: 8,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  // 글씨가 길거나 폰 글꼴을 키워도 피또 옆에서 줄바꿈되게. minWidth 0이 없으면 웹에서 칸을 넘는다.
  textCol: {
    flex: 1,
    minWidth: 0,
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
