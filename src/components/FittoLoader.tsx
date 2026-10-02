import React, { useEffect } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
  useReducedMotion,
} from 'react-native-reanimated';
import { useTheme } from '../theme/useTheme';
import { FITTO_HELLO } from '../theme/assets';

/**
 * 피또 로딩(버튼 안 · 화면 안 두 가지).
 *
 * 기본 스피너는 기기마다 모양이 다르고(iOS 회색 꽃잎, 안드로이드 색 원) 버튼 글씨색을 따라가서
 * 탈퇴 버튼에선 빨간 원이 됐다. 피또가 물방울이라 물방울 셋이 차례로 튀는 모양으로 통일한다.
 *
 * 기기에서 "동작 줄이기"를 켠 사람에게는 움직이지 않는다 — 어지러움을 느끼는 사람이 있다.
 * 움직임은 스크린리더에 안 보이므로 "불러오는 중"을 따로 읽어준다.
 */

const DROP = 7;
const BOUNCE = -5;
const STEP_MS = 280;

function Drop({ index, color, still }: { index: number; color: string; still: boolean }) {
  const y = useSharedValue(0);

  useEffect(() => {
    if (still) return;
    // 셋이 한 박자씩 늦게 튄다. 한 바퀴 = 튀기(올라감+내려옴) + 나머지 둘이 튀는 동안 쉼.
    y.value = withDelay(
      index * STEP_MS * 0.6,
      withRepeat(
        withSequence(
          withTiming(BOUNCE, { duration: STEP_MS, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: STEP_MS, easing: Easing.in(Easing.quad) }),
          withTiming(0, { duration: STEP_MS * 0.8 }),
        ),
        -1,
      ),
    );
  }, [still]);

  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }, { rotate: '45deg' }] }));
  return <Animated.View style={[styles.drop, { backgroundColor: color }, style]} />;
}

/** 버튼 안 로딩. 글씨 자리에 들어가며 높이는 글씨 한 줄과 비슷하다. */
export function LoadingDrops({ color }: { color: string }) {
  const still = useReducedMotion();
  return (
    <View style={styles.drops} accessibilityRole="progressbar" accessibilityLabel="불러오는 중">
      {[0, 1, 2].map((i) => (
        <Drop key={i} index={i} color={color} still={still} />
      ))}
    </View>
  );
}

/** 화면 안 로딩. 둥둥 뜬 피또 + 그 아래 안내 한 줄 + 물방울. */
export function FittoLoading({ text, size = 72 }: { text: string; size?: number }) {
  const { colors } = useTheme();
  const still = useReducedMotion();
  const y = useSharedValue(0);

  useEffect(() => {
    if (still) return;
    y.value = withRepeat(withTiming(-6, { duration: 1100, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [still]);

  const float = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));

  return (
    <View style={styles.page} accessible accessibilityRole="progressbar" accessibilityLabel={text}>
      <Animated.View style={float}>
        <Image source={FITTO_HELLO} style={{ width: size, height: size }} resizeMode="contain" />
      </Animated.View>
      <Text style={[styles.pageText, { color: colors.textSecondary }]}>{text}</Text>
      <LoadingDrops color={colors.textAccent} />
    </View>
  );
}

const styles = StyleSheet.create({
  drops: {
    height: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  // 정사각형의 한 모서리만 뾰족하게 두고 45도 돌리면 위가 뾰족한 물방울이 된다.
  drop: {
    width: DROP,
    height: DROP,
    borderRadius: DROP / 2,
    borderTopLeftRadius: 0,
  },
  page: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  pageText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
