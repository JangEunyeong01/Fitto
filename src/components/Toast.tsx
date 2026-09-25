import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, Pressable, View, Animated, Easing } from 'react-native';
import { BlurView } from 'expo-blur';
import { useToastStore, type ToastAction } from '../store/useToastStore';
import { motion, overlay, radius, spacing, typography, white } from '../theme/tokens';

/**
 * "실행 취소"가 달린 토스트는 더 오래 둔다(UI 기준서 5-7).
 * 글씨만 읽는 3초로는 누르기까지 빠듯하다 — 스크린리더를 쓰거나 손이 느린 사람은 더 그렇다.
 */
const ACTION_VISIBLE = 5000;

/** 어두운 토스트 위 글씨 버튼. 짙은 바탕 위라 파스텔을 조금 밝혀 쓴다(시안 03: #A9D6EE). */
const ACTION_COLOR = '#A9D6EE';

// README: left/right 16, bottom 88, padding 13/15, r16, 어두운 반투명+blur(10), 흰 글씨, fin
export default function Toast() {
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
      style={[styles.wrap, { opacity, transform: [{ translateY }] }]}
      accessibilityLiveRegion="polite"
    >
      <BlurView intensity={20} tint="dark" style={[styles.blur, shownAction && styles.blurWithAction]}>
        <View style={styles.row}>
          <Text style={[styles.text, shownAction && styles.textLeft]}>{text}</Text>
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
              <Text style={styles.actionLabel}>{shownAction.label}</Text>
            </Pressable>
          )}
        </View>
      </BlurView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: spacing.screenX,
    right: spacing.screenX,
    bottom: 88,
    zIndex: 999,
    alignItems: 'center',
  },
  blur: {
    backgroundColor: overlay.toastBg,
    paddingVertical: 13,
    paddingHorizontal: 15,
    borderRadius: radius.blockMid,
    overflow: 'hidden',
    alignSelf: 'stretch',
  },
  // 버튼 자리를 위해 위아래·오른쪽 여백을 줄인다(시안 03: 10 10 10 16).
  blurWithAction: {
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
    color: white,
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
    color: ACTION_COLOR,
  },
});
