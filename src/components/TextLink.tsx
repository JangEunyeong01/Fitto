import React from 'react';
import { Pressable, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { typography, weight } from '../theme/tokens';
import Icon from './Icon';

interface TextLinkProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  /**
   * accent: 파란 글씨 링크(기본). muted: 회색 보조 동작 — "나중에", "코드 다시 받기"처럼
   * 칠한 버튼 아래에서 한 발 물러서 있어야 하는 것(시안 24·36).
   */
  tone?: 'accent' | 'muted';
  style?: StyleProp<ViewStyle>;
}

/**
 * 글씨 링크(UI 기준서 5-5).
 *
 * 예전에는 `식단 ›`(회색), `헬스 탭 →`(파랑), `상세 ›`(회색)가 화면마다 따로 있어서
 * 같은 동작인데 모양이 다 달랐다. 색은 textAccent 하나로 맞춘다.
 * 내부 이름("헬스 탭")을 그대로 쓰지 않고 사용자가 얻는 것("운동 보기")으로 적는다.
 *
 * `›`는 붙이지 않는다(시안 규칙 17). 파란 글씨만으로 누를 수 있다는 게 읽히고,
 * 화살표는 목록 줄 오른쪽 끝의 이동 표시(아이콘)에만 남긴다.
 */
export default function TextLink({ label, onPress, disabled, tone = 'accent', style }: TextLinkProps) {
  const { colors, easy } = useTheme();
  const color = disabled ? colors.textDisabled : tone === 'muted' ? colors.textSecondary : colors.textAccent;

  // 간단히 보기: 파란 글씨만으로는 누를 수 있다는 게 안 읽힌다(기기가 낯선 사람에게는 그냥 글씨다).
  // 테두리 있는 버튼 + 화살표로 바꾼다. 글씨 크기도 한 단계 키운다.
  if (easy) {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityState={{ disabled: !!disabled }}
        style={({ pressed }) => [
          styles.easyBtn,
          { borderColor: tone === 'muted' ? colors.borderInput : color, opacity: pressed ? 0.6 : 1 },
          style,
        ]}
      >
        <Text style={[styles.easyLabel, { color }]}>{label}</Text>
        <Icon name="chevronRight" size={16} color={color} />
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      // 글씨 한 줄이라 보이는 높이가 20 안팎이다. 위아래를 넓혀 누르는 영역을 44에 가깝게 맞춘다.
      hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
      accessibilityRole="link"
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [styles.wrap, { opacity: pressed ? 0.6 : 1 }, style]}
    >
      <Text style={[tone === 'muted' ? styles.muted : typography.label, { color }]}>{label}</Text>
    </Pressable>
  );
}

// 정렬은 놓이는 줄이 정한다. 여기서 alignSelf를 주면 가로줄 안에서 글씨가 위로 붙는다.
const styles = StyleSheet.create({
  wrap: {},
  muted: {
    fontSize: 14,
    ...weight(600),
  },
  easyBtn: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  easyLabel: {
    fontSize: 16,
    ...weight(700),
  },
});
