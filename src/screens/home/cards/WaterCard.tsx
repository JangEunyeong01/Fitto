import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import TextLink from '../../../components/TextLink';
import GlassCard from '../../../components/GlassCard';
import PrimaryButton from '../../../components/PrimaryButton';
import WaterCup from './WaterCup';
import { useTheme } from '../../../theme/useTheme';
import { useAppStore } from '../../../store/useAppStore';
import { dateKey } from '../../../utils/timeOfDay';
import { getWaterStageSpec } from '../../../utils/health';
import { waterStageNames } from '../../../copy/persona';
import { useToastStore } from '../../../store/useToastStore';
import { typography } from '../../../theme/tokens';

export default function WaterCard() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const goal = useAppStore((s) => s.goals.water);
  const cup = useAppStore((s) => s.goals.cup);
  const water = useAppStore((s) => s.dailyRecords[dateKey()]?.water ?? 0);
  const addWater = useAppStore((s) => s.addWater);
  const showToast = useToastStore((s) => s.show);

  const stage = getWaterStageSpec(water, goal);
  const percent = goal > 0 ? Math.min(100, Math.round((water / goal) * 100)) : 0;

  const applyDelta = (deltaMl: number) => {
    if (deltaMl === 0) return;
    const today = dateKey();
    addWater(today, deltaMl);
    const next = Math.max(0, water + deltaMl);
    const nextStage = getWaterStageSpec(next, goal);
    // 물 한 잔은 되돌리기 쉬운 기록이라 묻지 않고 바로 남긴다. 잘못 눌렀으면 토스트에서 되돌린다(시안 규칙 24).
    // 예전엔 카드에 "되돌리기" 버튼이 늘 떠 있었는데, 필요한 순간은 누른 직후 몇 초뿐이다.
    showToast(`${deltaMl > 0 ? '+' : ''}${deltaMl}ml · ${waterStageNames[nextStage.stage]}`, {
      label: '실행 취소',
      onPress: () => addWater(today, -deltaMl),
    });
  };

  // README: 세로 드래그로 증감 — 위로 끌면 증가, 아래로 끌면 감소, 약 4px당 50ml, 50ml 단위 스냅.
  const pan = Gesture.Pan().onEnd((e) => {
    'worklet';
    const delta = Math.round(-e.translationY / 4 / 50) * 50;
    if (delta !== 0) runOnJS(applyDelta)(delta);
  });

  return (
    <GestureDetector gesture={pan}>
      <GlassCard fill>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>물 섭취</Text>
          <TextLink label="상세" onPress={() => navigation.navigate('WaterDetail')} />
        </View>
        <View style={styles.numRow}>
          <Text style={[styles.bigNum, { color: colors.textPrimary }]}>{water.toLocaleString()}</Text>
          <Text style={[styles.goalNum, { color: colors.textSecondary }]}>/ {goal.toLocaleString()} ml</Text>
        </View>
        <Text style={[styles.stageName, { color: colors.textAccent }]}>{stage.name}</Text>

        {/* 반폭 카드라 원본의 가로(컵+컨트롤) 배치는 컨트롤이 45px로 찌그러진다.
            컵을 가운데 두고 버튼을 아래에 카드 폭으로 까는 세로 배치로 바꿨다. 컵을 눌러도 한 잔이 채워진다. */}
        <View style={styles.cupWrap}>
          <WaterCup progress={water / goal} percent={percent} onPress={() => applyDelta(cup)} />
        </View>

        {/* 홈에서 유일한 칠해진 버튼(시안 규칙 1). */}
        <View style={styles.buttonWrap}>
          <PrimaryButton size="md" label={`+${cup} ml`} onPress={() => applyDelta(cup)} />
        </View>
      </GlassCard>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 22,
  },
  title: typography.cardTitle,
  numRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: 3,
    marginTop: 12,
  },
  bigNum: {
    ...typography.bigNumber,
    lineHeight: 28 * 1.1,
  },
  goalNum: typography.unit,
  stageName: {
    ...typography.micro,
    marginTop: 6,
  },
  cupWrap: {
    alignItems: 'center',
    marginTop: 12,
  },
  buttonWrap: {
    marginTop: 'auto',
    paddingTop: 12,
  },
});
