import React from 'react';
import { Pressable, Text, StyleSheet, StyleProp, ViewStyle, View } from 'react-native';
import { LoadingDrops } from './FittoLoader';
import { useTheme } from '../theme/useTheme';
import { brand, typography } from '../theme/tokens';

/**
 * 버튼 변형(UI 기준서 5-1).
 *
 * - primary: 그 화면을 끝내는 동작 하나(시안 규칙 1). **단색** 피또 블루 + 짙은 글씨.
 *   예전엔 그라데이션 + 그림자였는데, 화면마다 칠해진 버튼이 여러 개라 전부 떠 보였다
 * - text: 가벼운 이동(건너뛰기, 나중에 하기). 면 없음
 * - dangerOutline: 테두리 박스 + 빨간 글씨. 탈퇴·데이터 초기화 확인창(시안 42, 규칙 24)에서 칠한 "취소" 옆에 둔다.
 *   빨간 칠 버튼(danger)과 테두리 보조 버튼(secondary)은 모든 화면을 옮긴 뒤 쓰는 곳이 없어져 지웠다
 */
export type ButtonVariant = 'primary' | 'text' | 'dangerOutline';

/** lg 52: 화면 하단 전폭 / md 44: 카드 안 주요 동작 / sm 36: 행 끝 보조 동작(누르는 영역은 44로 넓힌다). */
export type ButtonSize = 'lg' | 'md' | 'sm';

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** 예전 호출부 호환. size="md"와 같다. */
  small?: boolean;
  style?: StyleProp<ViewStyle>;
  /**
   * 기능 자체가 불가한 상태. **눌리지 않는다.** (예: 바꾼 게 없어서 저장할 게 없음)
   */
  disabled?: boolean;
  /**
   * 조건이 덜 찬 상태. disabled와 모양은 같지만 **눌린다.**
   * 누르면 호출부가 무엇이 빠졌는지 알려준다. 막아버리면 왜 못 넘어가는지 알려줄 방법이 없다.
   */
  inactive?: boolean;
  /** 진행 중. 글씨 자리에 물방울 셋을 두고 너비는 그대로 둔다. 눌리지 않는다. */
  loading?: boolean;
  accessibilityLabel?: string;
}

const HEIGHT: Record<ButtonSize, number> = { lg: 52, md: 44, sm: 36 };

/** 보이는 높이가 44보다 작을 때 위아래로 넓혀 누르는 영역을 44로 맞춘다. */
const HIT_SLOP: Record<ButtonSize, number> = { lg: 0, md: 0, sm: 4 };

export default function PrimaryButton({
  label,
  onPress,
  variant = 'primary',
  size,
  small,
  style,
  disabled,
  inactive,
  loading,
  accessibilityLabel,
}: PrimaryButtonProps) {
  const { colors, radius } = useTheme();
  const resolvedSize: ButtonSize = size ?? (small ? 'md' : 'lg');
  const muted = disabled || inactive;

  const labelColor = muted
    ? colors.textDisabled
    : variant === 'primary'
      ? colors.textOnPrimary
      : variant === 'dangerOutline'
        ? colors.textDanger
        : colors.textAccent;

  const labelStyle = resolvedSize === 'lg' ? typography.buttonLabel : typography.buttonLabelSm;
  // 로딩 물방울은 글씨색을 따르지 않는다(탈퇴 버튼에서 빨간 원이 돌던 문제). 칠한 면 위만 면에 맞춘 색.
  const dropColor = variant === 'primary' ? colors.textOnPrimary : colors.textAccent;
  const content = loading ? (
    <LoadingDrops color={dropColor} />
  ) : (
    <Text style={[labelStyle, { color: labelColor }]} numberOfLines={1}>
      {label}
    </Text>
  );

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      hitSlop={HIT_SLOP[resolvedSize]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!(disabled || inactive), busy: !!loading }}
      style={(state) => {
        // 웹에서는 키보드 포커스가 오면 focused가 들어온다. 네이티브에는 없는 값이라 선택적으로 읽는다.
        const focused = (state as { focused?: boolean }).focused;
        return [
          {
            height: HEIGHT[resolvedSize],
            borderRadius: radius.button,
            transform: [{ scale: state.pressed && !muted ? 0.97 : 1 }],
          },
          focused && { borderWidth: 2, borderColor: colors.focusRing },
          style,
        ];
      }}
    >
      {({ pressed }) => {
        const face = (): ViewStyle => {
          // 시안: rgba(44,62,80,.07) 면 + 흐린 글씨. 다크에서도 뒤집히는 fillMuted를 쓴다.
          if (muted) return { backgroundColor: colors.fillMuted };
          if (variant === 'primary') return { backgroundColor: pressed ? brand.blueDeep : brand.blue };
          if (variant === 'dangerOutline') {
            return {
              backgroundColor: pressed ? colors.surfaceMuted : colors.surfaceSolid,
              borderWidth: 1,
              borderColor: colors.borderInput,
            };
          }
          return { opacity: pressed ? 0.6 : 1 };
        };

        return <View style={[styles.fill, { borderRadius: radius.button }, face()]}>{content}</View>;
      }}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
});
