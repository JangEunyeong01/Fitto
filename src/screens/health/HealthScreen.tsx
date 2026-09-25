import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import ScreenBackground from '../../components/ScreenBackground';
import GlassCard from '../../components/GlassCard';
import Icon from '../../components/Icon';
import DateNavigator from '../../components/DateNavigator';
import QuickWorkoutRow from '../../components/QuickWorkoutRow';
import { useTheme } from '../../theme/useTheme';
import { typography, weight } from '../../theme/tokens';
import { useAppStore } from '../../store/useAppStore';
import { useExerciseSheetStore } from '../../store/useExerciseSheetStore';
import { useToastStore } from '../../store/useToastStore';
import { newId } from '../../utils/id';
import { dateKey } from '../../utils/timeOfDay';
import { personaCopy } from '../../copy/persona';
import { QUICK_WORKOUT_MINUTES, calcExerciseKcal, findExercise } from '../../data/workouts';
import { recommendWorkouts } from '../../utils/workoutRecommend';
import { sumMealKcal } from '../../utils/health';
import { recentDays, recentDateKeys } from '../../utils/history';
import { usePastRecord } from '../../hooks/usePastRecord';
import WorkoutSettingRow from './WorkoutSettingRow';
import RoutineCard from './RoutineCard';

export default function HealthScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { colors, typography } = useTheme();
  // 명세 F-030: 날짜별 운동 기록 조회. 움직임 현황·추천은 오늘 기준이라 날짜와 무관하다.
  const [date, setDate] = useState(dateKey());
  const isToday = date === dateKey();
  const persona = useAppStore((s) => s.persona);
  const periodOn = useAppStore((s) => s.periodOn);
  const periodSetupDone = useAppStore((s) => s.periodSetupDone);
  const records = useAppStore((s) => s.dailyRecords);
  const todayRecord = records[dateKey()];
  const record = records[date];
  // 지난 날짜는 로그인 때 안 받아온다. 화면을 열 때 그 날짜만 받아온다.
  const loading = usePastRecord(date);
  const weightLog = useAppStore((s) => s.weightLog);
  const profile = useAppStore((s) => s.profile);
  const weightKg = profile.weight;
  const kcalGoal = useAppStore((s) => s.goals.kcal);
  const preference = useAppStore((s) => s.workoutPreference);
  const addExercise = useAppStore((s) => s.addExercise);
  const removeExercise = useAppStore((s) => s.removeExercise);
  const openExerciseSheet = useExerciseSheetStore((s) => s.show);
  const showToast = useToastStore((s) => s.show);

  const exercises = record?.exercises ?? [];
  const totalMinutes = exercises.reduce((a, e) => a + e.minutes, 0);
  const totalKcal = exercises.reduce((a, e) => a + e.kcal, 0);

  // 카드 부제에 보여줄 최근 체중. 기록이 없으면 프로필 값도 쓰지 않는다 —
  // 온보딩에서 한 번 적은 값을 "최근 기록"처럼 보여주면 오해를 준다.
  const weightDates = Object.keys(weightLog).sort();
  const latestWeight = weightDates.length > 0 ? weightLog[weightDates[weightDates.length - 1]] : null;

  // 움직임 현황은 최근 7일 기록으로만 계산한다. 걸음은 건강 데이터를 연결해야 들어온다.
  const weekSteps = recentDays(records, 'steps');
  const stepsConnected = weekSteps.values.some((v) => v > 0);
  const avgSteps = Math.round(weekSteps.values.reduce((a, v) => a + v, 0) / weekSteps.values.length);
  const workoutDays = recentDays(records, 'burn').values.filter((v) => v > 0).length;
  const weekMinutes = recentDateKeys().reduce(
    (sum, key) => sum + (records[key]?.exercises ?? []).reduce((a, e) => a + e.minutes, 0),
    0
  );

  const trainingComment = personaCopy.exerciseComment[persona]();

  // 명세 F-032: 설정·목표·질환·칼로리 상태·생리 컨디션을 반영한 추천. 오늘 기준으로만 계산한다.
  const suggestions = useMemo(
    () =>
      recommendWorkouts({
        preference,
        goal: profile.goalType,
        age: profile.age,
        weightKg: profile.weight,
        diseases: profile.conditions,
        kcalDiff: (todayRecord ? sumMealKcal(todayRecord.meals) : 0) - kcalGoal,
        periodCondition: todayRecord?.periodCondition,
      }),
    [preference, profile, todayRecord, kcalGoal]
  );

  const handleAdd = (name: string, minutes: number, kcal: number, code?: string) => {
    addExercise(date, { id: newId(), code, name, minutes, kcal });
    showToast(`${name} 기록 완료`);
  };

  const handleRemove = (exercise: (typeof exercises)[number]) => {
    removeExercise(date, exercise.id);
    showToast(`${exercise.name} 기록을 지웠어요`, {
      label: '실행 취소',
      onPress: () => addExercise(date, exercise),
    });
  };

  // 퀵칩은 내장 운동이라 소모 칼로리를 MET로 계산한다(고정값을 쓰면 체중과 어긋난다).
  const handleQuickAdd = (code: string) => {
    const exercise = findExercise(code);
    if (!exercise) return;
    const kcal = calcExerciseKcal(exercise.met, QUICK_WORKOUT_MINUTES, weightKg);
    handleAdd(exercise.name, QUICK_WORKOUT_MINUTES, kcal, exercise.code);
  };

  return (
    <ScreenBackground showTimeGradient={false}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 14, paddingBottom: 108 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleRow}>
          <Text style={[typography.screenTitle, { color: colors.textPrimary }]}>헬스</Text>
          {/* 탭 화면의 기록 버튼은 진한 글씨 + 아이콘(시안 규칙 1). 운동·시간·메모를 받는 시트를 연다(명세 F-034). */}
          <Pressable
            // onPress에 show를 그대로 넘기면 이벤트 객체가 날짜 자리로 들어가서 감싼다.
            onPress={() => openExerciseSheet(date)}
            accessibilityRole="button"
            style={({ pressed }) => [styles.recordBtn, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Icon name="plus" size={20} color={colors.textPrimary} strokeWidth={2} />
            <Text style={[styles.recordBtnLabel, { color: colors.textPrimary }]}>운동 기록</Text>
          </Pressable>
        </View>

        <DateNavigator date={date} onChange={setDate} />

        {/* 이 탭에 오는 이유는 "오늘 운동을 남기는 것"이라, 기록과 빠른 기록을 맨 위에 둔다. */}
        <GlassCard style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>운동 기록</Text>
            {/* 명세 F-033: 그날 총 운동 시간·소모 칼로리 */}
            {exercises.length > 0 && (
              <Text style={[styles.meta, { color: colors.textSecondary }]}>
                총 {totalMinutes}분 · {totalKcal.toLocaleString()}kcal
              </Text>
            )}
          </View>
          {exercises.length === 0 ? (
            // 서버에서 받아오는 중이면 "없다"고 단정하지 않는다.
            <Text style={[styles.empty, { color: colors.textSecondary }]}>
              {loading ? '기록을 불러오는 중이에요.' : isToday ? '오늘 운동 기록이 없어요.' : '이날은 운동 기록이 없어요.'}
            </Text>
          ) : (
            <View style={styles.recordList}>
              {exercises.map((e) => (
                <View key={e.id} style={styles.recordRow}>
                  <View style={styles.recordText}>
                    <Text style={[styles.recordName, { color: colors.textPrimary }]}>{e.name}</Text>
                    {!!e.memo && (
                      <Text style={[styles.recordMemo, { color: colors.textSecondary }]} numberOfLines={1}>
                        {e.memo}
                      </Text>
                    )}
                  </View>
                  <Text style={[styles.recordDetail, { color: colors.textSecondary }]}>
                    {e.minutes}분 · {e.kcal}kcal
                  </Text>
                  {/* 한 줄 기록은 묻지 않고 바로 지우고, 토스트에서 되살린다(시안 규칙 24). */}
                  <Pressable
                    onPress={() => handleRemove(e)}
                    accessibilityRole="button"
                    accessibilityLabel={`${e.name} 삭제`}
                    style={styles.removeBtn}
                  >
                    <Icon name="close" size={16} color={colors.textSecondary} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}

          <QuickWorkoutRow onAdd={handleQuickAdd} />
        </GlassCard>

        {/* 추천과 움직임 현황은 "오늘"을 위한 카드라, 지난 날짜를 볼 때는 기록만 보여준다. */}
        {isToday && (
          <>
            <GlassCard style={styles.card}>
              <View style={styles.headerRow}>
                <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>오늘의 퍼스널 트레이닝</Text>
                {/* 판단의 주체를 과장하지 않으려는 표시. 배지 대신 회색 글씨(시안 규칙 2). */}
                <Text style={[styles.metaSmall, { color: colors.textSecondary }]}>룰 기반</Text>
              </View>
              <Text style={[styles.comment, { color: colors.textPrimary }]}>{trainingComment}</Text>

              {/* 추천마다 박스를 두지 않고 얇은 선으로 나눈다(시안 규칙 5). */}
              {suggestions.map((w) => (
                <View key={w.code} style={[styles.suggestRow, { borderTopColor: colors.borderDivider }]}>
                  <View style={styles.suggestText}>
                    <Text style={[styles.suggestName, { color: colors.textPrimary }]}>
                      {w.name}{' '}
                      <Text style={[styles.suggestDetail, { color: colors.textSecondary }]}>
                        {w.minutes}분 · {w.kcal}kcal
                      </Text>
                    </Text>
                    {/* 이유가 앞 운동과 같으면 적지 않는다. 같은 문장이 세 번 반복되면 읽지 않게 된다. */}
                    {!!w.reason && (
                      <Text style={[styles.suggestReason, { color: colors.textSecondary }]}>{w.reason}</Text>
                    )}
                  </View>
                  <Pressable
                    onPress={() => handleAdd(w.name, w.minutes, w.kcal, w.code)}
                    accessibilityRole="button"
                    accessibilityLabel={`${w.name} 기록에 추가`}
                    style={styles.addBtn}
                  >
                    <Text style={[styles.addLabel, { color: colors.textAccent }]}>추가</Text>
                  </Pressable>
                </View>
              ))}

              {/* 추천을 만드는 값이라 추천 바로 아래 둔다. 매일 바꾸는 값이 아니라 접어둔다. */}
              <WorkoutSettingRow />
            </GlassCard>

            <GlassCard style={styles.card}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>움직임 현황</Text>
              <View style={styles.statRow}>
                <Stat label="운동한 날" value={`${workoutDays}일`} colors={colors} />
                <Stat label="운동 시간" value={`${weekMinutes}분`} colors={colors} />
                {/* 앉은 시간은 센서가 필요해 아직 보여줄 값이 없다. 걸음도 연결 전에는 값 대신 상태를 적는다. */}
                <Stat
                  label="평균 걸음"
                  value={stepsConnected ? avgSteps.toLocaleString() : '연결 전'}
                  muted={!stepsConnected}
                  colors={colors}
                />
              </View>
              <Text style={[styles.statCaption, { color: colors.textSecondary }]}>최근 7일 기록 기준</Text>
            </GlassCard>
          </>
        )}

        <RoutineCard date={date} />

        {/* 다른 화면으로 나가는 문 두 개. 기록 카드와 같은 무게로 쌓이지 않게 한 장에 묶는다. */}
        <GlassCard style={styles.card} noPadding>
          <LinkRow
            icon="weight"
            title="체중 기록"
            sub={latestWeight != null ? `최근 ${latestWeight}kg · 추이 보기` : '기록하고 추이 보기'}
            onPress={() => navigation.navigate('Weight')}
            colors={colors}
          />
          {periodOn && (
            <LinkRow
              icon="moon"
              title="생리 주기 상세"
              sub={periodSetupDone ? '캘린더와 컨디션 기록 보기' : '마지막 시작일을 입력하면 주기를 계산해요'}
              // 시작일 입력 전에는 상세 대신 설정으로 보낸다. 설정 화면은 설정 탭 스택에 있다.
              onPress={() =>
                periodSetupDone
                  ? navigation.navigate('PeriodDetail')
                  : navigation.navigate('Settings', { screen: 'PeriodSettings' })
              }
              colors={colors}
              divider
            />
          )}
        </GlassCard>
      </ScrollView>
    </ScreenBackground>
  );
}

/** 상세 화면으로 나가는 한 줄. 아이콘은 색 칸 없이 선만(시안 규칙 6). */
function LinkRow({
  icon,
  title,
  sub,
  onPress,
  colors,
  divider,
}: {
  icon: 'weight' | 'moon';
  title: string;
  sub: string;
  onPress: () => void;
  colors: any;
  divider?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={[
        styles.linkRow,
        divider && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderDivider },
      ]}
    >
      <Icon name={icon} size={24} color={colors.textPrimary} />
      <View style={styles.linkText}>
        <Text style={[styles.linkTitle, { color: colors.textPrimary }]}>{title}</Text>
        <Text style={[styles.linkSub, { color: colors.textSecondary }]}>{sub}</Text>
      </View>
      <Icon name="chevronRight" size={16} color={colors.textSecondary} />
    </Pressable>
  );
}

// KcalCard의 섭취/소모/남음 3열 패턴과 통일: 라벨 → 값 순서로 세로로 쌓는다.
function Stat({ label, value, muted, colors }: { label: string; value: string; muted?: boolean; colors: any }) {
  return (
    <View style={styles.statCol}>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.statValue, { color: muted ? colors.textSecondary : colors.textPrimary }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
  },
  titleRow: {
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
  cardTitle: typography.cardTitle,
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    minHeight: 22,
  },
  meta: typography.unit,
  metaSmall: typography.micro,
  statRow: {
    flexDirection: 'row',
    marginTop: 14,
  },
  statCaption: {
    ...typography.caption,
    marginTop: 12,
  },
  statCol: {
    flex: 1,
    gap: 3,
  },
  statValue: {
    fontSize: 17,
    ...weight(700),
  },
  statLabel: typography.micro,
  comment: {
    ...typography.body,
    marginTop: 8,
    marginBottom: 10,
  },
  suggestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    paddingVertical: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  suggestText: {
    flex: 1,
    minWidth: 0,
  },
  suggestName: {
    fontSize: 14,
    ...weight(600),
  },
  suggestDetail: {
    fontSize: 13,
    ...weight(400),
  },
  suggestReason: {
    ...typography.caption,
    marginTop: 3,
  },
  addBtn: {
    height: 44,
    justifyContent: 'center',
  },
  addLabel: {
    fontSize: 14,
    ...weight(600),
  },
  empty: {
    ...typography.body,
    marginTop: 8,
  },
  recordList: {
    marginTop: 6,
  },
  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 44,
  },
  recordText: {
    flex: 1,
    gap: 1,
  },
  recordName: {
    fontSize: 14,
    ...weight(600),
  },
  recordMemo: typography.caption,
  recordDetail: {
    fontSize: 13,
    ...weight(400),
  },
  // 보이는 ×는 16이지만 누르는 영역은 44×44.
  removeBtn: {
    width: 44,
    height: 44,
    marginRight: -14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    height: 64,
    paddingHorizontal: 18,
  },
  linkText: {
    flex: 1,
    gap: 2,
  },
  linkTitle: {
    fontSize: 15,
    ...weight(600),
  },
  linkSub: typography.caption,
});
