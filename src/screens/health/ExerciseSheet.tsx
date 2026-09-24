import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import TextField from '../../components/TextField';
import SelectChip from '../../components/SelectChip';
import HighlightText from '../../components/HighlightText';
import PrimaryButton from '../../components/PrimaryButton';
import Icon from '../../components/Icon';
import { useTheme } from '../../theme/useTheme';
import { overlay, typography } from '../../theme/tokens';
import { useAppStore } from '../../store/useAppStore';
import { useExerciseSheetStore } from '../../store/useExerciseSheetStore';
import { useToastStore } from '../../store/useToastStore';
import { newId } from '../../utils/id';
import { searchByName } from '../../utils/hangul';
import { dateKey } from '../../utils/timeOfDay';
import { EXERCISES, calcExerciseKcal, findExercise } from '../../data/workouts';

const MAX_MINUTES = 600;

// 명세 F-034: 운동 선택 → 시간 입력 → 소모 칼로리 자동 계산 → 메모 → 저장.
export default function ExerciseSheet() {
  const { open, hide, date } = useExerciseSheetStore();
  if (!open) return null;
  // 폼을 따로 두어 닫힐 때 언마운트시킨다. 명세의 "닫으면 입력값 초기화"가 이걸로 해결된다.
  // 헬스 탭에서 지난 날짜를 보다가 열었으면 그 날에, 빠른 기록에서 열었으면 오늘에 넣는다.
  return <ExerciseForm date={date ?? dateKey()} onClose={hide} />;
}

function ExerciseForm({ date, onClose }: { date: string; onClose: () => void }) {
  const { colors, radius: r, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const weightKg = useAppStore((s) => s.profile.weight);
  const addExercise = useAppStore((s) => s.addExercise);
  const showToast = useToastStore((s) => s.show);

  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<string | null>(null);
  const [minutes, setMinutes] = useState('');
  const [memo, setMemo] = useState('');

  // 초성으로도 찾는다("ㅃㄹㄱ" → 빠르게 걷기). 걸린 자리를 같이 받아 그 글자만 색을 입힌다.
  const results = useMemo(() => searchByName(EXERCISES, query, (e) => e.name), [query]);

  const exercise = picked ? findExercise(picked) : undefined;
  const mins = parseInt(minutes, 10);
  const validMins = mins > 0 && mins <= MAX_MINUTES;
  const kcal = exercise && validMins ? calcExerciseKcal(exercise.met, mins, weightKg) : 0;

  const save = () => {
    if (!exercise) {
      showToast('운동을 선택해 주세요');
      return;
    }
    if (!validMins) {
      showToast(`시간은 1~${MAX_MINUTES}분 사이로 입력해 주세요`);
      return;
    }
    addExercise(date, {
      id: newId(),
      code: exercise.code,
      name: exercise.name,
      minutes: mins,
      kcal,
      memo: memo.trim() || undefined,
    });
    showToast(`${exercise.name} ${mins}분 기록 완료`);
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
            <Text style={[styles.title, { color: colors.textPrimary }]}>운동 추가</Text>
            <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel="닫기">
              <Icon name="close" size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <TextField
              size="sm"
              clearable
              value={query}
              onChangeText={setQuery}
              placeholder="운동 이름 또는 초성 (예: ㄷㄹㄱ)"
            />
            <View style={styles.chipWrap}>
              {results.map(({ item: e, match }) => (
                <SelectChip
                  key={e.code}
                  label={<HighlightText text={e.name} match={match} />}
                  selected={picked === e.code}
                  onPress={() => setPicked(e.code)}
                  size="sm"
                />
              ))}
              {results.length === 0 && (
                <Text style={[styles.empty, { color: colors.textSecondary }]}>검색 결과가 없어요.</Text>
              )}
            </View>

            <Text style={[styles.label, { color: colors.textSecondary }]}>시간</Text>
            <View style={styles.minutesRow}>
              <TextField
                size="sm"
                value={minutes}
                onChangeText={(t) => setMinutes(t.replace(/[^0-9]/g, ''))}
                placeholder="30"
                keyboardType="numeric"
                center
                style={styles.minutesInput}
              />
              <Text style={[styles.unit, { color: colors.textSecondary }]}>분</Text>
              <Text style={[styles.kcal, { color: colors.textPrimary }]}>{kcal > 0 ? `약 ${kcal}kcal` : ''}</Text>
            </View>

            <Text style={[styles.label, { color: colors.textSecondary }]}>메모</Text>
            <TextField size="sm" value={memo} onChangeText={setMemo} placeholder="선택 · 예: 무릎 조심" maxLength={60} />
          </ScrollView>

          <PrimaryButton label="기록하기" onPress={save} inactive={!exercise || !validMins} style={styles.saveBtn} />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 945,
  },
  backdrop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  kav: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '85%',
    paddingTop: 10,
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: typography.sheetTitle,
  // 키보드가 올라와 시트가 줄어들면 목록 쪽이 줄고 저장 버튼은 남는다.
  scroll: {
    flexShrink: 1,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  empty: typography.bodySm,
  label: {
    ...typography.label,
    marginTop: 16,
    marginBottom: 8,
  },
  minutesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  minutesInput: {
    width: 88,
  },
  unit: typography.rowLabel,
  kcal: {
    ...typography.value,
    flex: 1,
    textAlign: 'right',
  },
  saveBtn: {
    marginTop: 16,
  },
});
