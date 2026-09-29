import React, { useEffect, useRef } from 'react';
import { Image, View, StyleSheet, Animated, Easing } from 'react-native';
import { FITTO_FACE, FITTO_HELLO } from '../theme/assets';
import { getWaterStageSpec } from '../utils/health';
import { brand, motion } from '../theme/tokens';

interface FittoCharacterProps {
  current: number;
  goal: number;
  size?: number;
  variant?: 'full' | 'face';
  glow?: boolean;
  glowSize?: number;
}

// 물 단계는 크기·떠다니는 속도·흐림으로 보여준다. 단계별 표정 그림이 준비되면 이미지를 바꾼다.
export default function FittoCharacter({ current, goal, size = 78, variant = 'full', glow = true, glowSize }: FittoCharacterProps) {
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

  // 마른 단계일수록 흐리게. 예전엔 그림 위에 동그란 반투명 판을 덮어 회색빛을 흉내 냈는데,
  // 새 그림은 배경이 투명이라 그 판이 피또 뒤 동그라미로 드러났다. 그림 자체의 투명도로 바꾼다.
  // ponytail: 단계별 표정 그림이 들어오면 이 흐림도 빼고 이미지를 바꾼다.
  const dryOpacity = 1 - spec.grayscale * 0.6;

  const source = variant === 'face' ? FITTO_FACE : FITTO_HELLO;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {glow && (
        <View
          style={[
            styles.glow,
            {
              width: glowSize ?? size + 28,
              height: glowSize ?? size + 28,
              borderRadius: (glowSize ?? size + 28) / 2,
              backgroundColor: brand.blue,
              opacity: 0.18,
            },
          ]}
        />
      )}
      <Animated.View
        style={[
          styles.stage,
          { width: size, height: size, transform: [{ translateY: floatY }, { scale }] },
        ]}
      >
        {/* absoluteFill에는 width/height가 없어 웹에서 Image가 원본 크기(578x731)로 삐져나온다.
            크기를 명시해 컨테이너에 맞춘다. */}
        <Image source={source} style={[styles.fill, { opacity: dryOpacity }]} resizeMode="contain" />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  glow: {
    position: 'absolute',
  },
  stage: {
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
});
