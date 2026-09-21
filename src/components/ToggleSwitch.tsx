import React, { useEffect, useRef } from 'react';
import { Pressable, Animated, StyleSheet } from 'react-native';
import { useTheme } from '../theme/useTheme';

interface ToggleSwitchProps {
  value: boolean;
  onChange: (v: boolean) => void;
}

const WIDTH = 50;
const HEIGHT = 30;
const THUMB = 24;
const PAD = 3;

// README: 스위치 50×30. 생리 주기 기능(설정), 알림 5종 전부 이 컴포넌트를 공유한다.
export default function ToggleSwitch({ value, onChange }: ToggleSwitchProps) {
  const { colors, brand } = useTheme();
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: value ? 1 : 0,
      duration: 180,
      useNativeDriver: false, // backgroundColor/translateX 보간이라 네이티브 드라이버 불가
    }).start();
  }, [value]);

  // 꺼진 트랙은 예전엔 6% 투명이라 카드 위에서 거의 안 보였다. 3:1 이상인 입력 테두리 색을 쓴다.
  // 켜진 트랙(파스텔)은 1.9:1로 미달이지만 엄지 위치가 상태를 함께 알려서 색만으로 전달하지 않는다.
  const trackColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.borderInput, brand.blue],
  });
  const thumbX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [PAD, WIDTH - THUMB - PAD],
  });

  return (
    <Pressable
      onPress={() => onChange(!value)}
      // 높이 30에 위아래 7씩 더해 누르는 영역 44를 맞춘다.
      hitSlop={{ top: 7, bottom: 7, left: 6, right: 6 }}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
    >
      <Animated.View style={[styles.track, { backgroundColor: trackColor }]}>
        <Animated.View style={[styles.thumb, { transform: [{ translateX: thumbX }] }]} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: WIDTH,
    height: HEIGHT,
    borderRadius: HEIGHT / 2,
    justifyContent: 'center',
  },
  thumb: {
    position: 'absolute',
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
});
