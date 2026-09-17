import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import GlassCard from '../../../components/GlassCard';
import { useTheme } from '../../../theme/useTheme';
import { useAppStore } from '../../../store/useAppStore';
import { newId } from '../../../utils/id';
import { dateKey } from '../../../utils/timeOfDay';
import { useToastStore } from '../../../store/useToastStore';
import { QUICK_WORKOUTS, QUICK_WORKOUT_MINUTES, calcExerciseKcal, findExercise } from '../../../data/workouts';
import { typography } from '../../../theme/tokens';

// README: 최대 2개만 보여주고 나머지는 "+N개 더"로 접는다(명세 F-015).
const MAX_ROWS = 2;

export default function ExerciseCard() {
  const { colors, brand } = useTheme();
  const navigation = useNavigation<any>();
  const record = useAppStore((s) => s.dailyRecords[dateKey()]);
  const weightKg = useAppStore((s) => s.profile.weight);
  const addExercise = useAppStore((s) => s.addExercise);
  const showToast = useToastStore((s) => s.show);
  const exercises = record?.exercises ?? [];
  const shown = exercises.slice(0, MAX_ROWS);
  const restCount = exercises.length - shown.length;

  // 헬스 탭 퀵칩과 같은 규칙으로 기록한다(MET × 체중 × 시간).
  const handleQuickAdd = (code: string) => {
    const exercise = findExercise(code);
    if (!exercise) return;
    const kcal = calcExerciseKcal(exercise.met, QUICK_WORKOUT_MINUTES, weightKg);
    addExercise(dateKey(), {
      id: newId(),
      code: exercise.code,
      name: exercise.name,
      minutes: QUICK_WORKOUT_MINUTES,
      kcal,
    });
    showToast(`${exercise.name} 기록 완료`);
  };

  return (
    <GlassCard>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: colors.txt }]}>오늘 운동</Text>
        <Pressable onPress={() => navigation.navigate('Health')}>
          <Text style={[styles.link, { color: brand.blue }]}>헬스 탭 →</Text>
        </Pressable>
      </View>

      {exercises.length === 0 ? (
        <Text style={[styles.empty, { color: colors.sub }]}>오늘 운동 기록이 없어요. 아래에서 바로 남겨보세요.</Text>
      ) : (
        <View style={styles.list}>
          {shown.map((e) => (
            <View key={e.id} style={styles.row}>
              <View style={[styles.dot, { backgroundColor: brand.mint }]} />
              <Text style={[styles.name, { color: colors.txt }]}>{e.name}</Text>
              <Text style={[styles.detail, { color: colors.sub }]}>
                {e.minutes}분 · {e.kcal}kcal
              </Text>
            </View>
          ))}
          {restCount > 0 && (
            <Pressable onPress={() => navigation.navigate('Health')} hitSlop={6}>
              <Text style={[styles.more, { color: colors.sub }]}>+{restCount}개 더</Text>
            </Pressable>
          )}
        </View>
      )}

      <View style={[styles.chipRow, { borderTopColor: colors.line }]}>
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
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: typography.sectionTitle,
  link: typography.label,
  empty: {
    ...typography.body,
    marginTop: 10,
  },
  list: {
    marginTop: 10,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  name: {
    ...typography.rowLabel,
    flex: 1,
  },
  detail: typography.caption,
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  chipText: typography.label,
  more: {
    ...typography.caption,
    paddingTop: 2,
  },
});
