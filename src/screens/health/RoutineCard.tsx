import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GlassCard from '../../components/GlassCard';
import Icon from '../../components/Icon';
import SelectChip from '../../components/SelectChip';
import TextField from '../../components/TextField';
import PrimaryButton from '../../components/PrimaryButton';
import { useTheme } from '../../theme/useTheme';
import { overlay, selection, typography } from '../../theme/tokens';
import { useAppStore, type WorkoutRoutine } from '../../store/useAppStore';
import { useToastStore } from '../../store/useToastStore';
import { newId } from '../../utils/id';
import { EXERCISES, calcExerciseKcal, findExercise } from '../../data/workouts';

const DEFAULT_MINUTES = 20;
const MAX_MINUTES = 600;
const MAX_EXERCISES = 8;

interface RoutineCardProps {
  /** 루틴을 기록할 날짜. 헬스 탭에서 보고 있는 날짜를 그대로 쓴다. */
  date: string;
}

/**
 * 명세 F-035: 자주 하는 운동을 묶어 저장하고, "사용"으로 한 번에 기록한다.
 * 칼로리는 저장해둔 값이 아니라 누를 때 그날 체중으로 계산한다.
 */
export default function RoutineCard({ date }: RoutineCardProps) {
  const { colors } = useTheme();
  const routines = useAppStore((s) => s.routines);
  const removeRoutine = useAppStore((s) => s.removeRoutine);
  const addExercise = useAppStore((s) => s.addExercise);
  const weightKg = useAppStore((s) => s.profile.weight);
  const showToast = useToastStore((s) => s.show);
  const [formOpen, setFormOpen] = useState(false);

  const use = (routine: WorkoutRoutine) => {
    routine.exercises.forEach((e, i) => {
      const met = findExercise(e.code)?.met ?? 0;
      addExercise(date, {
        // 같은 밀리초에 여러 개가 들어가므로 순번을 붙여 id가 겹치지 않게 한다.
        id: newId(),
        code: e.code,
        name: e.name,
        minutes: e.minutes,
        kcal: calcExerciseKcal(met, e.minutes, weightKg),
      });
    });
    showToast(`${routine.name} ${routine.exercises.length}개 기록 완료`);
  };

  return (
    <>
      <GlassCard style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>나만의 루틴</Text>
          <Pressable onPress={() => setFormOpen(true)} hitSlop={8}>
            <Text style={[styles.addLink, { color: colors.textSecondary }]}>+ 만들기</Text>
          </Pressable>
        </View>

        {routines.length === 0 ? (
          <Text style={[styles.empty, { color: colors.textSecondary }]}>
            자주 하는 운동을 묶어두면 한 번에 기록할 수 있어요.
          </Text>
        ) : (
          <View style={styles.list}>
            {routines.map((r) => (
              <View key={r.id} style={[styles.row, { backgroundColor: colors.surfaceSubtle }]}>
                <View style={styles.rowText}>
                  <Text style={[styles.name, { color: colors.textPrimary }]}>{r.name}</Text>
                  <Text style={[styles.meta, { color: colors.textSecondary }]}>
                    {r.exercises.map((e) => e.name).join(' · ')} · 총{' '}
                    {r.exercises.reduce((a, e) => a + e.minutes, 0)}분
                  </Text>
                </View>
                <Pressable
                  onPress={() => use(r)}
                  style={[styles.useBtn, { borderColor: selection.border, backgroundColor: selection.bg }]}
                >
                  <Text style={[styles.useLabel, { color: colors.textPrimary }]}>사용</Text>
                </Pressable>
                <Pressable
                  onPress={() => removeRoutine(r.id)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`${r.name} 삭제`}
                >
                  <Icon name="close" size={15} color={colors.textSecondary} />
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </GlassCard>

      {/* 폼은 닫을 때 통째로 사라지게 둬서 입력값이 남지 않는다. */}
      {formOpen && <RoutineForm onClose={() => setFormOpen(false)} />}
    </>
  );
}

function RoutineForm({ onClose }: { onClose: () => void }) {
  const { colors, radius: r, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const addRoutine = useAppStore((s) => s.addRoutine);
  const showToast = useToastStore((s) => s.show);

  const [name, setName] = useState('');
  /** 고른 운동 코드 → 시간(분). 순서를 지키려고 배열로 둔다. */
  const [picked, setPicked] = useState<{ code: string; minutes: string }[]>([]);

  const toggle = (code: string) => {
    setPicked((cur) =>
      cur.some((p) => p.code === code)
        ? cur.filter((p) => p.code !== code)
        : cur.length >= MAX_EXERCISES
          ? cur
          : [...cur, { code, minutes: String(DEFAULT_MINUTES) }]
    );
  };

  const setMinutes = (code: string, minutes: string) => {
    setPicked((cur) => cur.map((p) => (p.code === code ? { ...p, minutes } : p)));
  };

  const parsed = picked.map((p) => ({ code: p.code, minutes: parseInt(p.minutes, 10) }));
  const valid =
    name.trim().length > 0 &&
    parsed.length > 0 &&
    parsed.every((p) => p.minutes > 0 && p.minutes <= MAX_MINUTES);

  const save = () => {
    if (!name.trim()) {
      showToast('루틴 이름을 입력해 주세요');
      return;
    }
    if (parsed.length === 0) {
      showToast('운동을 하나 이상 골라 주세요');
      return;
    }
    if (!valid) {
      showToast(`시간은 1~${MAX_MINUTES}분 사이로 입력해 주세요`);
      return;
    }
    addRoutine({
      id: newId(),
      name: name.trim(),
      exercises: parsed.map((p) => ({
        code: p.code,
        name: findExercise(p.code)?.name ?? p.code,
        minutes: p.minutes,
      })),
    });
    showToast('루틴을 저장했어요');
    onClose();
  };

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <Pressable style={[styles.backdrop, { backgroundColor: overlay.sheetBackdrop }]} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.kav}
        pointerEvents="box-none"
      >
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surfaceSolid,
              paddingHorizontal: spacing.screenX,
              paddingBottom: insets.bottom + 16,
              borderTopLeftRadius: r.sheetTop,
              borderTopRightRadius: r.sheetTop,
            },
          ]}
        >
          <View style={[styles.grabber, { backgroundColor: colors.borderDivider }]} />
          <View style={styles.headerRow}>
            <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>루틴 만들기</Text>
            <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel="닫기">
              <Icon name="close" size={18} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <TextField
              size="sm"
              clearable
              value={name}
              onChangeText={setName}
              placeholder="루틴 이름 (예: 하체 루틴)"
              maxLength={30}
            />

            <Text style={[styles.label, { color: colors.textSecondary }]}>운동 (최대 {MAX_EXERCISES}개)</Text>
            <View style={styles.chipWrap}>
              {EXERCISES.map((e) => (
                <SelectChip
                  key={e.code}
                  label={e.name}
                  selected={picked.some((p) => p.code === e.code)}
                  onPress={() => toggle(e.code)}
                  size="sm"
                />
              ))}
            </View>

            {picked.length > 0 && (
              <>
                <Text style={[styles.label, { color: colors.textSecondary }]}>시간</Text>
                <View style={styles.minutesList}>
                  {picked.map((p) => (
                    <View key={p.code} style={styles.minutesRow}>
                      <Text style={[styles.minutesName, { color: colors.textPrimary }]}>{findExercise(p.code)?.name}</Text>
                      <TextField
                        size="sm"
                        value={p.minutes}
                        onChangeText={(t) => setMinutes(p.code, t.replace(/[^0-9]/g, ''))}
                        keyboardType="numeric"
                        center
                        style={styles.minutesInput}
                      />
                      <Text style={[styles.minutesUnit, { color: colors.textSecondary }]}>분</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            <PrimaryButton label="저장하기" onPress={save} inactive={!valid} style={styles.saveBtn} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardTitle: typography.sectionTitle,
  addLink: typography.unit,
  empty: {
    ...typography.body,
    marginTop: 10,
  },
  list: {
    marginTop: 12,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 15,
  },
  rowText: {
    flex: 1,
    gap: 3,
  },
  name: typography.rowLabel,
  meta: typography.caption,
  useBtn: {
    height: 32,
    paddingHorizontal: 14,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  useLabel: typography.label,
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 930,
  },
  backdrop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  kav: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '86%',
    paddingTop: 10,
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    marginBottom: 14,
  },
  sheetTitle: typography.sheetTitle,
  label: {
    ...typography.label,
    marginTop: 16,
    marginBottom: 8,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  minutesList: {
    gap: 8,
  },
  minutesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  minutesName: {
    ...typography.rowLabel,
    flex: 1,
  },
  minutesInput: {
    width: 70,
  },
  minutesUnit: typography.unit,
  saveBtn: {
    marginTop: 20,
    marginBottom: 8,
  },
});
