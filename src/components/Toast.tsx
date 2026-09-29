import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, Pressable, View, Animated, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToastStore, type ToastAction } from '../store/useToastStore';
import { tabBarSpace } from '../navigation/TabBar';
import { BlurView } from 'expo-blur';
import { useTheme } from '../theme/useTheme';
import { alpha, motion, radius, spacing, tabBarShadowColor, typography } from '../theme/tokens';

/**
 * "실행 취소"가 달린 토스트는 더 오래 둔다(UI 기준서 5-7).
 * 글씨만 읽는 3초로는 누르기까지 빠듯하다 — 스크린리더를 쓰거나 손이 느린 사람은 더 그렇다.
 */
const ACTION_VISIBLE = 5000;

/**
 * 밝은 유리 토스트 — 탭바·카드와 같은 계열(흐림 + 흰 면 95% + 유리 테두리 + 탭바 그림자), 글씨는 진하게.
 * 시안은 어두운 반투명(.9)이었는데 탭바와 겹쳐 뒤가 비쳤고, 불투명 남색으로 바꾸니 홈에서 너무 무거웠다.
 * 88%로 깔았더니 흰 카드 위에서 뒤 글씨가 비쳐 95%로 올렸다. 카드와는 그림자로 떨어져 보인다.
 * 떠 있는 탭바 바로 위에 뜬다(예전 bottom 88은 탭바와 겹쳤다).
 */
export default function Toast() {
  const insets = useSafeAreaInsets();
  const { colors, mode } = useTheme();
  const { message, action, seq } = useToastStore();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(motion.fadeInOffsetY)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [visible, setVisible] = useState(false);
  const [text, setText] = useState('');
  const [shownAction, setShownAction] = useState<ToastAction | null>(null);

  const hideNow = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (fadeTimer.current) clearTimeout(fadeTimer.current);
    setVisible(false);
  };

  useEffect(() => {
    if (!message) return;

    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (fadeTimer.current) clearTimeout(fadeTimer.current);

    setText(message);
    setShownAction(action);
    setVisible(true);
    opacity.setValue(0);
    translateY.setValue(motion.fadeInOffsetY);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: motion.fadeIn,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: motion.fadeIn,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();

    const visibleFor = action ? ACTION_VISIBLE : motion.toastVisible;

    // 사라지는 건 타이머로 확정한다. 애니메이션 완료 콜백에 맡기면
    // 앱이 백그라운드로 가서 rAF가 멈췄을 때 토스트가 화면에 그대로 남는다.
    fadeTimer.current = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: motion.fadeOut,
        useNativeDriver: true,
      }).start();
    }, visibleFor);

    hideTimer.current = setTimeout(() => setVisible(false), visibleFor + motion.fadeOut);

    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      if (fadeTimer.current) clearTimeout(fadeTimer.current);
    };
  }, [seq]);

  if (!visible) return null;

  return (
    // 버튼이 없으면 아래 화면을 가리지 않게 터치를 통과시킨다.
    <Animated.View
      pointerEvents={shownAction ? 'box-none' : 'none'}
      style={[styles.wrap, { bottom: tabBarSpace(insets.bottom) - 16, opacity, transform: [{ translateY }] }]}
      accessibilityLiveRegion="polite"
    >
      <View style={[styles.shadow, { shadowColor: tabBarShadowColor }]}>
      <BlurView
        intensity={40}
        tint={mode === 'dark' ? 'dark' : 'light'}
        style={[styles.blur, { borderColor: colors.borderGlass }]}
      >
      <View style={[styles.face, shownAction && styles.faceWithAction, { backgroundColor: alpha(colors.surfaceSolid, 0.95) }]}>
        <View style={styles.row}>
          <Text style={[styles.text, { color: colors.textPrimary }, shownAction && styles.textLeft]}>{text}</Text>
          {shownAction && (
            <Pressable
              onPress={() => {
                shownAction.onPress();
                hideNow();
              }}
              accessibilityRole="button"
              hitSlop={4}
              style={styles.actionBtn}
            >
              <Text style={[styles.actionLabel, { color: colors.textAccent }]}>{shownAction.label}</Text>
            </Pressable>
          )}
        </View>
      </View>
      </BlurView>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: spacing.screenX,
    right: spacing.screenX,
    zIndex: 999,
    alignItems: 'center',
  },
  // 탭바와 같은 그림자. 흐린 면은 overflow를 잘라야 해서 그림자는 바깥 틀이 맡는다.
  shadow: {
    alignSelf: 'stretch',
    borderRadius: radius.blockMid,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 30,
    elevation: 8,
  },
  blur: {
    borderRadius: radius.blockMid,
    borderWidth: 1,
    overflow: 'hidden',
  },
  face: {
    paddingVertical: 13,
    paddingHorizontal: 15,
  },
  // 버튼 자리를 위해 위아래·오른쪽 여백을 줄인다(시안 03: 10 10 10 16).
  faceWithAction: {
    paddingVertical: 4,
    paddingLeft: 16,
    paddingRight: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  text: {
    ...typography.value,
    textAlign: 'center',
    flex: 1,
  },
  textLeft: {
    textAlign: 'left',
  },
  actionBtn: {
    minHeight: 44,
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  actionLabel: {
    ...typography.value,
  },
});
