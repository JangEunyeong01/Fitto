import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
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
import { typography, weight } from '../../../theme/tokens';

export default function WaterCard() {
  const navigation = useNavigation<any>();
  const { colors, brand } = useTheme();
  const goal = useAppStore((s) => s.goals.water);
  const cup = useAppStore((s) => s.goals.cup);
  const water = useAppStore((s) => s.dailyRecords[dateKey()]?.water ?? 0);
  const addWater = useAppStore((s) => s.addWater);
  const showToast = useToastStore((s) => s.show);

  const stage = getWaterStageSpec(water, goal);
  const percent = goal > 0 ? Math.min(100, Math.round((water / goal) * 100)) : 0;

  const applyDelta = (deltaMl: number) => {
    if (deltaMl === 0) return;
    addWater(dateKey(), deltaMl);
    const next = Math.max(0, water + deltaMl);
    const nextStage = getWaterStageSpec(next, goal);
    showToast(`${deltaMl > 0 ? '+' : ''}${deltaMl}ml · ${waterStageNames[nextStage.stage]}`);
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
        <View style={styles.topRow}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>물 섭취</Text>
          <View style={styles.topRight}>
            <Text style={[styles.stageName, { color: colors.textAccent }]}>{stage.name}</Text>
            <TextLink label="상세" onPress={() => navigation.navigate('WaterDetail')} />
          </View>
        </View>
        <View style={styles.numRow}>
          <Text style={[styles.bigNum, { color: colors.textPrimary }]}>{water.toLocaleString()}</Text>
          <Text style={[styles.goalNum, { color: colors.textSecondary }]}> / {goal.toLocaleString()} ml</Text>
        </View>
        {/* 반폭 카드라 원본의 가로(컵+컨트롤) 배치는 컨트롤이 45px로 찌그러진다.
            컵을 가운데 두고 버튼을 아래에 카드 폭으로 까는 세로 배치로 바꿨다. */}
        <View style={styles.cupWrap}>
          <WaterCup progress={water / goal} percent={percent} onPress={() => applyDelta(cup)} />
        </View>
        <Text style={[styles.cupHint, { color: colors.textSecondary }]}>컵을 탭하면 {cup}ml씩 채워져요.</Text>

        <View style={styles.buttonCol}>
          <PrimaryButton small label={`+${cup} ml`} onPress={() => applyDelta(cup)} />
          <Pressable
            onPress={() => applyDelta(-cup)}
            style={[styles.undoBtn, { borderColor: colors.borderDivider }]}
          >
            <Text style={[styles.undoLabel, { color: colors.textSecondary }]}>되돌리기</Text>
          </Pressable>
        </View>
      </GlassCard>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: typography.unit,
  topRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stageName: typography.label,
  detailLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  detailLabel: typography.label,
  dragHint: {
    ...typography.caption,
    marginTop: 4,
  },
  numRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 6,
  },
  bigNum: {
    fontSize: 24,
    ...weight(700),
    letterSpacing: -0.9,
  },
  goalNum: typography.unit,
  cupWrap: {
    alignItems: 'center',
    marginTop: 14,
  },
  cupHint: {
    ...typography.caption,
    lineHeight: 11 * 1.5,
    marginTop: 10,
    textAlign: 'center',
  },
  buttonCol: {
    marginTop: 'auto',
    paddingTop: 10,
    gap: 7,
  },
  undoBtn: {
    height: 32,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  undoLabel: typography.label,
});
