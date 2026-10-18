import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import FittoPic from './FittoPic';
import { FITTO_RATIO, WATER_FACES, type FittoState } from '../theme/assets';
import { getWaterStageIndex, getWaterStageSpec } from '../utils/health';
import { motion } from '../theme/tokens';
import type { Persona } from '../store/useAppStore';

interface FittoCharacterProps {
  current: number;
  goal: number;
  /** 가로. 세로는 그림 비율(200:244)을 따른다. */
  size?: number;
  /** 물 단계 표정 대신 보여줄 그림. 크기·둥둥 주기는 그대로 물 단계를 따른다. */
  state?: FittoState;
  persona?: Persona;
}

// 물 단계는 표정 그림 + 크기 + 떠다니는 속도로 보여준다.
// v3 그림은 마를수록 색이 바래 있어서 예전의 흐림 처리는 뺐다. 뒤의 파란 빛 원도 뺐다 —
// 하늘색 바탕 위에선 피또와 같은 색이라 오히려 경계를 흐렸다.
export default function FittoCharacter({ current, goal, size = 78, state, persona }: FittoCharacterProps) {
  const spec = getWaterStageSpec(current, goal);
  const scale = useRef(new Animated.Value(spec.scale)).current;
  const floatY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(scale, {
      toValue: spec.scale,
      duration: motion.characterState,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true, // scale·translateY만 다루므로 네이티브 드라이버로 돌린다
    }).start();
  }, [spec.scale]);

  useEffect(() => {
    if (!spec.floatDurationMs) {
      Animated.timing(floatY, {
        toValue: 0,
        duration: motion.characterFloatReset,
        useNativeDriver: true,
      }).start();
      return;
    }
    const half = spec.floatDurationMs / 2;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatY, {
          toValue: motion.floatOffsetY,
          duration: half,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatY, {
          toValue: 0,
          duration: half,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [spec.floatDurationMs]);

  return (
    <View style={[styles.box, { width: size, height: size * FITTO_RATIO }]}>
      <Animated.View style={{ transform: [{ translateY: floatY }, { scale }] }}>
        <FittoPic state={state ?? WATER_FACES[getWaterStageIndex(current, goal)]} size={size} persona={persona} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
