import React from 'react';
import { Text, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/useTheme';
import { useQuickLogSheetStore } from '../store/useQuickLogSheetStore';
import { useAppStore } from '../store/useAppStore';
import { useToastStore } from '../store/useToastStore';
import { dateKey } from '../utils/timeOfDay';
import { getWaterStageSpec } from '../utils/health';
import { waterStageNames } from '../copy/persona';
import { weight } from '../theme/tokens';
import { useFoodSearchStore } from '../store/useFoodSearchStore';
import { useExerciseSheetStore } from '../store/useExerciseSheetStore';
import BottomSheet from './BottomSheet';
import Icon, { type IconName } from './Icon';

type ActionKey = 'water' | 'meal' | 'exercise' | 'weight';

/**
 * 탭바 가운데 + → 빠른 기록 시트(시안 33).
 * 아이콘 뒤 색 칸을 없애고 선 아이콘 + 글씨 한 줄, 줄 사이는 얇은 선. 시트 틀은 공통 BottomSheet.
 */
export default function QuickLogSheet() {
  const { open, hide } = useQuickLogSheetStore();
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const addWater = useAppStore((s) => s.addWater);
  const cup = useAppStore((s) => s.goals.cup);
  const goalWater = useAppStore((s) => s.goals.water);
  const today = useAppStore((s) => s.dailyRecords[dateKey()]?.water ?? 0);
  const showToast = useToastStore((s) => s.show);
  const openFoodSearch = useFoodSearchStore((s) => s.show);

  const actions: { key: ActionKey; label: string; icon: IconName }[] = [
    { key: 'water', label: `물 +${cup} ml`, icon: 'water' },
    { key: 'meal', label: '음식 기록', icon: 'diet' },
    { key: 'exercise', label: '운동 기록', icon: 'health' },
    { key: 'weight', label: '체중 기록', icon: 'weight' },
  ];

  const handlePress = (key: ActionKey) => {
    hide();
    if (key === 'water') {
      const date = dateKey();
      addWater(date, cup);
      const stage = getWaterStageSpec(today + cup, goalWater);
      // 홈 물 카드와 같은 규칙: 잘못 눌렀으면 토스트에서 바로 되돌린다.
      showToast(`+${cup}ml · ${waterStageNames[stage.stage]}`, {
        label: '실행 취소',
        onPress: () => addWater(date, -cup),
      });
      return;
    }
    if (key === 'meal') {
      openFoodSearch();
      return;
    }
    if (key === 'exercise') {
      useExerciseSheetStore.getState().show();
      return;
    }
    navigation.navigate('Health', { screen: 'Weight' });
  };

  return (
    <BottomSheet visible={open} title="빠른 기록" onClose={hide}>
      {actions.map((a, i) => (
        <Pressable
          key={a.key}
          onPress={() => handlePress(a.key)}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.row,
            i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderDivider },
            { opacity: pressed ? 0.6 : 1 },
          ]}
        >
          <Icon name={a.icon} size={24} color={colors.textPrimary} />
          <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>{a.label}</Text>
        </Pressable>
      ))}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 56,
  },
  rowLabel: {
    fontSize: 15,
    ...weight(600),
  },
});
