import React, { useEffect, useRef } from 'react';
import { Text, StyleSheet, Image, Animated, Easing } from 'react-native';
import AlertModal from '../../components/AlertModal';
import { useTheme } from '../../theme/useTheme';
import { birthday, motion, weight } from '../../theme/tokens';
import { personaCopy } from '../../copy/persona';
import { useAppStore } from '../../store/useAppStore';
import { useBirthdayModalStore } from '../../store/useBirthdayModalStore';
import { FITTO_HELLO } from '../../theme/assets';

/**
 * 생일 축하(시안 38). 생일 배너(홈)와 미리보기(설정) 양쪽에서 열려서 전역 스토어로 연다.
 * 라벤더·복숭아 장식 원과 그라데이션 버튼은 뺐다(한 화면 강조는 하나). "HAPPY BIRTHDAY"와 떠다니는 피또는 남긴다.
 * 거절할 게 없는 알림이라 "나중에" 없이 버튼 하나.
 */
export default function BirthdayModal() {
  const { colors } = useTheme();
  const visible = useBirthdayModalStore((s) => s.open);
  const onClose = useBirthdayModalStore((s) => s.hide);
  const persona = useAppStore((s) => s.persona);
  const name = useAppStore((s) => s.profile.nickname);

  const floatY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    const half = birthday.floatDuration / 2;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatY, { toValue: motion.floatOffsetY, duration: half, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(floatY, { toValue: 0, duration: half, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [visible, floatY]);

  return (
    <AlertModal
      visible={visible}
      onClose={onClose}
      top={
        <>
          <Text style={[styles.label, { color: colors.textAccent }]}>HAPPY BIRTHDAY</Text>
          <Animated.View style={[styles.charWrap, { transform: [{ translateY: floatY }] }]}>
            <Image source={FITTO_HELLO} style={styles.char} resizeMode="contain" accessibilityLabel="축하하는 피또" />
          </Animated.View>
        </>
      }
      body={<Text style={[styles.message, { color: colors.textPrimary }]}>{personaCopy.birthdayMessage[persona]({ name })}</Text>}
      primaryLabel="고마워, 피또"
      onPrimary={onClose}
    />
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 12,
    ...weight(700),
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
    fontSize: 14,
    lineHeight: 14 * 1.55,
    textAlign: 'center',
    marginTop: 8,
  },
});
