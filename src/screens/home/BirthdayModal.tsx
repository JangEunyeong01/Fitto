import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Image, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme/useTheme';
import { birthday, brand, motion, radius, typography } from '../../theme/tokens';
import { personaCopy } from '../../copy/persona';
import { useAppStore } from '../../store/useAppStore';
import { useBirthdayModalStore } from '../../store/useBirthdayModalStore';
import { FITTO_HELLO } from '../../theme/assets';

// 생일 배너(홈)와 미리보기 버튼(설정) 양쪽에서 열 수 있어야 해서
// Toast처럼 전역 스토어에서 open 상태를 직접 구독한다.
export default function BirthdayModal() {
  const { colors } = useTheme();
  const visible = useBirthdayModalStore((s) => s.open);
  const onClose = useBirthdayModalStore((s) => s.hide);
  const persona = useAppStore((s) => s.persona);
  const name = useAppStore((s) => s.profile.nickname);

  const floatY = useRef(new Animated.Value(0)).current;
  const enter = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    enter.setValue(0);
    Animated.timing(enter, {
      toValue: 1,
      duration: 320,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true, // opacity·translateY만 다룬다
    }).start();

    const half = birthday.floatDuration / 2;
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
  }, [visible]);

  if (!visible) return null;

  const message = personaCopy.birthdayMessage[persona]({ name });
  const translateY = enter.interpolate({ inputRange: [0, 1], outputRange: [motion.fadeInOffsetY, 0] });

  return (
    <View style={styles.overlay}>
      <Pressable style={[styles.backdrop, { backgroundColor: birthday.modalBackdrop }]} onPress={onClose} />
      <View style={styles.center} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: colors.surfaceSolid,
              borderColor: colors.borderGlass,
              shadowColor: birthday.modalShadow,
              opacity: enter,
              transform: [{ translateY }],
            },
          ]}
        >
          {/* 프로토타입의 radial-gradient 장식. RN에는 라디얼이 없어 흐린 원으로 근사한다. */}
          <View style={[styles.glowLeft, { backgroundColor: birthday.glowLavender }]} />
          <View style={[styles.glowRight, { backgroundColor: birthday.glowPeach }]} />

          <Text style={[styles.label, { color: colors.textAccent }]}>HAPPY BIRTHDAY</Text>

          <Animated.View style={[styles.charWrap, { transform: [{ translateY: floatY }] }]}>
            <Image source={FITTO_HELLO} style={styles.char} resizeMode="contain" accessibilityLabel="축하하는 피또" />
          </Animated.View>

          <Text style={[styles.message, { color: colors.textPrimary }]}>{message}</Text>

          <Pressable onPress={onClose} style={styles.confirmWrap}>
            <LinearGradient
              colors={birthday.confirmGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.confirm}
            >
              <Text style={[styles.confirmLabel, { color: colors.textOnPrimary }]}>고마워, 피또</Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 950,
  },
  backdrop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 26,
  },
  card: {
    width: '100%',
    borderWidth: 1,
    borderRadius: radius.sheetTop,
    paddingTop: 26,
    paddingHorizontal: 22,
    paddingBottom: 22,
    alignItems: 'center',
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 1,
    shadowRadius: 50,
    elevation: 12,
  },
  glowLeft: {
    position: 'absolute',
    left: -40,
    top: -50,
    width: 180,
    height: 180,
    borderRadius: 90,
    opacity: 0.55,
  },
  glowRight: {
    position: 'absolute',
    right: -50,
    top: -30,
    width: 170,
    height: 170,
    borderRadius: 85,
    opacity: 0.5,
  },
  label: {
    ...typography.label,
    letterSpacing: 1.2,
  },
  charWrap: {
    marginTop: 10,
    width: 128,
    height: 128,
  },
  char: {
    width: '100%',
    height: '100%',
  },
  message: {
    ...typography.body,
    marginTop: 12,
    textAlign: 'center',
  },
  confirmWrap: {
    width: '100%',
    marginTop: 18,
  },
  confirm: {
    height: 46,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmLabel: {
    ...typography.buttonLabelSm,
  },
});
