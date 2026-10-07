import React, { useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import TextLink from '../../../components/TextLink';
import GlassCard from '../../../components/GlassCard';
import WaterCup, { CUP_H } from './WaterCup';
import { useTheme } from '../../../theme/useTheme';
import { useAppStore } from '../../../store/useAppStore';
import { dateKey } from '../../../utils/timeOfDay';
import { getWaterStageSpec } from '../../../utils/health';
import { waterStageNames } from '../../../copy/persona';
import { useToastStore } from '../../../store/useToastStore';
import { BIG_TEXT_MAX, typography, weight } from '../../../theme/tokens';

export default function WaterCard() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const goal = useAppStore((s) => s.goals.water);
  const cup = useAppStore((s) => s.goals.cup);
  const water = useAppStore((s) => s.dailyRecords[dateKey()]?.water ?? 0);
  const addWater = useAppStore((s) => s.addWater);
  const showToast = useToastStore((s) => s.show);
  // 컵을 끄는 동안의 증감(ml). 놓기 전까지는 기록하지 않고 화면에만 보여 준다.
  const [dragMl, setDragMl] = useState<number | null>(null);

  const shown = water + (dragMl ?? 0);
  const stage = getWaterStageSpec(shown, goal);
  const percent = goal > 0 ? Math.min(100, Math.round((shown / goal) * 100)) : 0;

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

  // 끈 거리(px)를 ml로. 컵 높이만큼 끌면 목표 한 통이라 물 높이가 손가락과 같이 움직인다.
  // 0 아래로는 못 내리고, 위로는 목표의 두 배까지(이미 넘었으면 지금 양까지)만.
  const toMl = (px: number) => {
    if (goal <= 0) return 0;
    const raw = Math.round(((px / CUP_H) * goal) / 10) * 10;
    const max = Math.max(goal * 2, water);
    return Math.min(max, Math.max(0, water + raw)) - water;
  };

  // 제스처는 한 번만 만들고, 안에서는 늘 최신 값을 쓰게 ref로 넘긴다.
  // 끄는 동안 매 프레임 다시 그려지는데, 그때마다 제스처를 새로 만들면 잡고 있던 손이 끊길 수 있다.
  const onDrag = useRef<(px: number, done: boolean) => void>(() => {});
  onDrag.current = (px, done) => {
    if (!done) {
      setDragMl(toMl(px));
      return;
    }
    setDragMl(null);
    applyDelta(toMl(px));
  };
  const pan = useMemo(() => {
    const report = (px: number, done: boolean) => onDrag.current(px, done);
    const cancel = () => setDragMl(null);
    return Gesture.Pan()
      // 세로로 6px 움직여야 시작한다. 그 전에 옆으로 20px 가면 가로 스와이프로 보고 놓아준다.
      .activeOffsetY([-6, 6])
      .failOffsetX([-20, 20])
      .onUpdate((e) => {
        'worklet';
        runOnJS(report)(-e.translationY, false);
      })
      .onEnd((e, success) => {
        'worklet';
        if (success) runOnJS(report)(-e.translationY, true);
        else runOnJS(cancel)();
      });
  }, []);

  const step = (delta: number, label: string) => (
    <Pressable
      // 100ml 남았는데 250을 빼면 0에서 멈추니, 토스트에도 실제로 뺀 만큼만 나오게 한다.
      onPress={() => applyDelta(delta < 0 ? -Math.min(-delta, water) : delta)}
      disabled={delta < 0 && water <= 0}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.stepBtn, { opacity: delta < 0 && water <= 0 ? 0.35 : pressed ? 0.6 : 1 }]}
    >
      <Text style={[styles.stepLabel, { color: colors.textAccent }]} maxFontSizeMultiplier={BIG_TEXT_MAX}>
        {delta > 0 ? '+' : '−'}
        {Math.abs(delta)}
      </Text>
    </Pressable>
  );

  return (
    <GlassCard fill>
      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>물 섭취</Text>
        <TextLink label="상세" onPress={() => navigation.navigate('WaterDetail')} />
      </View>
      <View style={styles.numRow}>
        <Text style={[styles.bigNum, { color: colors.textPrimary }]} maxFontSizeMultiplier={BIG_TEXT_MAX}>
          {shown.toLocaleString()}
        </Text>
        <Text style={[styles.goalNum, { color: colors.textSecondary }]}>/ {goal.toLocaleString()} ml</Text>
      </View>
      {/* 끄는 동안엔 단계 이름 자리에 얼마나 바뀌는지 보여 준다. 놓으면 이만큼 기록된다. */}
      <Text style={[styles.stageName, { color: colors.textAccent }]}>
        {dragMl === null ? stage.name : `${dragMl > 0 ? '+' : ''}${dragMl.toLocaleString()} ml`}
      </Text>

      {/* 반폭 카드라 원본의 가로(컵+컨트롤) 배치는 컨트롤이 45px로 찌그러진다.
          컵을 가운데 두고 버튼을 아래에 카드 폭으로 까는 세로 배치로 바꿨다.
          컵은 눌러서 한 잔, 위아래로 끌어서 원하는 만큼. 카드 전체가 아니라 컵만 잡게 해서 화면 스크롤과 안 섞인다. */}
      <GestureDetector gesture={pan}>
        <View style={styles.cupWrap}>
          <WaterCup progress={goal > 0 ? shown / goal : 0} percent={percent} live={dragMl !== null} onPress={() => applyDelta(cup)} />
        </View>
      </GestureDetector>

      {/* 끌기만으로는 줄일 수 있다는 걸 알기 어려워서 −/+ 를 나란히 둔다. 칠하지 않고 파란 글씨만. */}
      <View style={styles.stepRow}>
        {step(-cup, `물 ${cup}ml 빼기`)}
        {step(cup, `물 ${cup}ml 기록`)}
      </View>
    </GlassCard>
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
  stepRow: {
    marginTop: 'auto',
    flexDirection: 'row',
  },
  stepBtn: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLabel: {
    fontSize: 15,
    ...weight(700),
  },
});
