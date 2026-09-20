import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import ScreenBackground from '../../components/ScreenBackground';
import GlassCard from '../../components/GlassCard';
import Badge from '../../components/Badge';
import Icon from '../../components/Icon';
import DateNavigator from '../../components/DateNavigator';
import { useTheme } from '../../theme/useTheme';
import { alpha, brand, selection, typography, weight } from '../../theme/tokens';
import { useAppStore } from '../../store/useAppStore';
import { useExerciseSheetStore } from '../../store/useExerciseSheetStore';
import { useToastStore } from '../../store/useToastStore';
import { newId } from '../../utils/id';
import { dateKey } from '../../utils/timeOfDay';
import { personaCopy } from '../../copy/persona';
import { QUICK_WORKOUTS, QUICK_WORKOUT_MINUTES, calcExerciseKcal, findExercise } from '../../data/workouts';
import { recommendWorkouts } from '../../utils/workoutRecommend';
import { sumMealKcal } from '../../utils/health';
import { recentDays, recentDateKeys } from '../../utils/history';
import WorkoutSettingCard from './WorkoutSettingCard';
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

  // 퀵칩은 내장 운동이라 소모 칼로리를 MET로 계산한다(고정값을 쓰면 체중과 어긋난다).
  const handleQuickAdd = (code: string) => {
    const exercise = findExercise(code);
    if (!exercise) return;
    const kcal = calcExerciseKcal(exercise.met, QUICK_WORKOUT_MINUTES, weightKg);
    handleAdd(exercise.name, QUICK_WORKOUT_MINUTES, kcal, exercise.code);
  };

  return (
    <ScreenBackground>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 14, paddingBottom: 108 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[typography.screenTitle, { color: colors.txt, marginBottom: 16 }]}>헬스</Text>

        <DateNavigator date={date} onChange={setDate} />

        {/* 움직임 현황과 오늘의 추천은 "오늘"을 위한 카드라, 지난 날짜를 볼 때는 기록만 보여준다. */}
        {isToday && (
          <>
            <GlassCard style={styles.card}>
              <Text style={[styles.cardTitle, { color: colors.txt }]}>움직임 현황</Text>
              <View style={styles.statRow}>
                <Stat label="운동한 날" value={`${workoutDays}일`} colors={colors} />
                <Stat label="운동 시간" value={`${weekMinutes}분`} colors={colors} />
                {/* 앉은 시간은 센서가 필요해 아직 보여줄 값이 없다. 걸음도 연결 전에는 값 대신 상태를 적는다. */}
                <Stat
                  label="평균 걸음"
                  value={stepsConnected ? avgSteps.toLocaleString() : '연결 전'}
                  colors={colors}
                />
              </View>
              <Text style={[styles.statCaption, { color: colors.sub }]}>최근 7일 기록 기준</Text>
            </GlassCard>

            <WorkoutSettingCard />

            <GlassCard style={styles.card}>
              <View style={styles.headerRow}>
                <Text style={[styles.cardTitle, { color: colors.txt }]}>오늘의 퍼스널 트레이닝</Text>
                <Badge label="룰 기반" />
              </View>
              <Text style={[styles.comment, { color: colors.txt }]}>{trainingComment}</Text>

              <View style={styles.suggestList}>
                {suggestions.map((w) => (
                  <View key={w.code} style={[styles.suggestRow, { backgroundColor: colors.card2 }]}>
                    <View style={styles.suggestText}>
                      <Text style={[styles.suggestName, { color: colors.txt }]}>
                        {w.name}{' '}
                        <Text style={[styles.suggestDetail, { color: colors.sub }]}>
                          {w.minutes}분 · {w.kcal}kcal
                        </Text>
                      </Text>
                      <Text style={[styles.suggestReason, { color: colors.sub }]}>{w.reason}</Text>
                    </View>
                    <Pressable
                      onPress={() => handleAdd(w.name, w.minutes, w.kcal, w.code)}
                      style={[styles.addBtn, { borderColor: colors.stroke, backgroundColor: colors.card }]}
                    >
                      <Text style={[styles.addLabel, { color: colors.txt }]}>기록에 추가</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            </GlassCard>
          </>
        )}

        <GlassCard style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={[styles.cardTitle, { color: colors.txt }]}>운동 기록</Text>
            {/* 명세 F-033: 그날 총 운동 시간·소모 칼로리 */}
            {exercises.length > 0 && (
              <Text style={[styles.totalText, { color: colors.sub }]}>
                총 {totalMinutes}분 · {totalKcal.toLocaleString()}kcal
              </Text>
            )}
          </View>
          {exercises.length === 0 ? (
            // 명세 F-051: 빈 상태에서 무엇을 하면 되는지까지 알려준다. 지난 날짜엔 권유가 어색해서 문구만 둔다.
            <View style={styles.emptyBox}>
              <Text style={[styles.empty, { color: colors.txt }]}>
                {isToday ? '오늘 운동 기록이 없어요.' : '이날은 운동 기록이 없어요.'}
              </Text>
              {isToday && (
                <Text style={[styles.emptyHint, { color: colors.sub }]}>
                  아래 퀵 기록을 누르면 15분으로 바로 남길 수 있어요.
                </Text>
              )}
            </View>
          ) : (
            <View style={styles.recordList}>
              {exercises.map((e) => (
                <View key={e.id} style={styles.recordRow}>
                  <View style={[styles.dot, { backgroundColor: brand.mint }]} />
                  <View style={styles.recordText}>
                    <Text style={[styles.recordName, { color: colors.txt }]}>{e.name}</Text>
                    {!!e.memo && (
                      <Text style={[styles.recordMemo, { color: colors.sub }]} numberOfLines={1}>
                        {e.memo}
                      </Text>
                    )}
                  </View>
                  <Text style={[styles.recordDetail, { color: colors.sub }]}>
                    {e.minutes}분 · {e.kcal}kcal
                  </Text>
                  <Pressable onPress={() => removeExercise(date, e.id)} hitSlop={8}>
                    <Icon name="close" size={15} color={colors.sub} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}

          <View style={[styles.chipRow, { borderTopColor: colors.line }]}>
            {/* 퀵칩은 한 탭 기록용(15분 고정), 직접 추가는 운동·시간·메모를 받는 시트(명세 F-034). */}
            <Pressable
              // onPress에 show를 그대로 넘기면 이벤트 객체가 날짜 자리로 들어가서 감싼다.
              onPress={() => openExerciseSheet(date)}
              style={[styles.chip, styles.chipPrimary, { borderColor: selection.border, backgroundColor: selection.bg }]}
            >
              <Text style={[styles.chipText, { color: colors.txt }]}>+ 직접 추가</Text>
            </Pressable>
            {QUICK_WORKOUTS.map((code) => (
              <Pressable
                key={code}
                onPress={() => handleQuickAdd(code)}
                style={[styles.chip, { borderColor: colors.line }]}
              >
                <Text style={[styles.chipText, { color: colors.txt }]}>+ {findExercise(code)?.name}</Text>
              </Pressable>
            ))}
          </View>
        </GlassCard>

        <RoutineCard date={date} />

        <Pressable onPress={() => navigation.navigate('Weight')}>
          <GlassCard style={styles.card}>
            <View style={styles.periodRow}>
              <View style={[styles.periodBadge, { backgroundColor: alpha(brand.mint, 0.28) }]}>
                <Icon name="weight" size={20} color={colors.txt} />
              </View>
              <View style={styles.periodText}>
                <Text style={[styles.cardTitle, { color: colors.txt }]}>체중 기록</Text>
                <Text style={[styles.periodSub, { color: colors.sub }]}>
                  {latestWeight != null ? `최근 ${latestWeight}kg · 추이 보기` : '기록하고 추이 보기'}
                </Text>
              </View>
              <Icon name="chevronRight" size={17} color={colors.sub} />
            </View>
          </GlassCard>
        </Pressable>

        {periodOn && (
          // 시작일 입력 전에는 상세 대신 설정으로 보낸다. 설정 화면은 설정 탭 스택에 있다.
          <Pressable
            onPress={() =>
              periodSetupDone
                ? navigation.navigate('PeriodDetail')
                : navigation.navigate('Settings', { screen: 'PeriodSettings' })
            }
          >
            <GlassCard style={styles.card}>
              <View style={styles.periodRow}>
                <View style={[styles.periodBadge, { backgroundColor: alpha(brand.lavender, 0.28) }]}>
                  <Icon name="moon" size={20} color={colors.txt} />
                </View>
                <View style={styles.periodText}>
                  <Text style={[styles.cardTitle, { color: colors.txt }]}>생리 주기 상세</Text>
                  <Text style={[styles.periodSub, { color: colors.sub }]}>
                    {periodSetupDone ? '캘린더와 컨디션 기록 보기' : '마지막 시작일을 입력하면 주기를 계산해요'}
                  </Text>
                </View>
                <Icon name="chevronRight" size={17} color={colors.sub} />
              </View>
            </GlassCard>
          </Pressable>
        )}
      </ScrollView>
    </ScreenBackground>
  );
}

// KcalCard의 섭취/소모/남음 3열 패턴과 통일: 라벨 → 값 순서로 세로로 쌓는다.
function Stat({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View style={styles.statCol}>
      <Text style={[styles.statLabel, { color: colors.sub }]}>{label}</Text>
      <Text style={[styles.statValue, { color: colors.txt }]}>{value}</Text>
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
  card: {
    marginBottom: 12,
  },
  cardTitle: typography.sectionTitle,
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  statRow: {
    flexDirection: 'row',
    marginTop: 14,
  },
  statCaption: {
    ...typography.caption,
    marginTop: 10,
  },
  statCol: {
    flex: 1,
    gap: 4,
  },
  statValue: {
    fontSize: 18,
    ...weight(700),
    letterSpacing: -0.6,
  },
  statLabel: typography.caption,
  comment: {
    ...typography.body,
    marginTop: 10,
  },
  suggestList: {
    marginTop: 12,
    gap: 8,
  },
  suggestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 15,
  },
  suggestText: {
    flex: 1,
    gap: 3,
  },
  suggestName: typography.sectionTitle,
  suggestDetail: typography.bodySm,
  suggestReason: {
    ...typography.caption,
    lineHeight: 11 * 1.45,
  },
  addBtn: {
    height: 32,
    paddingHorizontal: 11,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addLabel: typography.label,
  emptyBox: {
    marginTop: 10,
    gap: 4,
  },
  empty: typography.body,
  emptyHint: typography.caption,
  recordList: {
    marginTop: 10,
    gap: 8,
  },
  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  recordText: {
    flex: 1,
    gap: 1,
  },
  recordName: typography.rowLabel,
  recordMemo: typography.caption,
  recordDetail: typography.caption,
  totalText: typography.label,
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  chipPrimary: {
    borderStyle: 'solid',
  },
  chipText: typography.label,
  periodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  periodBadge: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodText: {
    flex: 1,
    gap: 2,
  },
  periodSub: typography.bodySm,
});
