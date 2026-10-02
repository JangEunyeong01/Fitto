import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { typography, weight } from '../theme/tokens';
import { QUICK_WORKOUTS, QUICK_WORKOUT_MINUTES, findExercise } from '../data/workouts';

interface QuickWorkoutRowProps {
  onAdd: (code: string) => void;
}

/**
 * "15분 빠른 기록" — 한 번 눌러 운동을 남기는 글씨 버튼 줄(시안 05). 홈 운동 카드와 헬스 탭이 같이 쓴다.
 *
 * 예전엔 테두리 칩이라 칩 세 개가 카드에서 가장 무거워 보였다. 기록 버튼은 진한 글씨 + 기호로 충분하다(시안 규칙 2).
 * 위에 "15분"을 적어 두는 이유: 누르면 몇 분으로 남는지 모른 채 누르게 하지 않으려고.
 */
export default function QuickWorkoutRow({ onAdd }: QuickWorkoutRowProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.wrap, { borderTopColor: colors.borderDivider }]}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{QUICK_WORKOUT_MINUTES}분 빠른 기록</Text>
      <View style={styles.row}>
        {QUICK_WORKOUTS.map((code) => {
          const name = findExercise(code)?.name ?? code;
          return (
            <Pressable
              key={code}
              onPress={() => onAdd(code)}
              accessibilityRole="button"
              accessibilityLabel={`${name} ${QUICK_WORKOUT_MINUTES}분 기록`}
              style={({ pressed }) => [styles.btn, { opacity: pressed ? 0.6 : 1 }]}
            >
              <Text style={[styles.btnLabel, { color: colors.textPrimary }]}>+ {name}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  label: typography.micro,
  row: {
    flexDirection: 'row',
    gap: 20,
  },
  btn: {
    height: 44,
    justifyContent: 'center',
  },
  btnLabel: {
    fontSize: 14,
    ...weight(600),
  },
});
