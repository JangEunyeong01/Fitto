import React from 'react';
import { Pressable, Text, StyleSheet, StyleProp, ViewStyle, ActivityIndicator, View } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { brand, typography } from '../theme/tokens';

/**
 * 버튼 변형(UI 기준서 5-1).
 *
 * - primary: 그 화면을 끝내는 동작 하나(시안 규칙 1). **단색** 피또 블루 + 짙은 글씨.
 *   예전엔 그라데이션 + 그림자였는데, 화면마다 칠해진 버튼이 여러 개라 전부 떠 보였다
 * - secondary: 테두리 박스. 시안 규칙 2로 대부분 글씨 버튼으로 바뀌고, 남는 자리는 탈퇴 확인 모달뿐이다.
 *   화면을 옮길 때마다 하나씩 걷어내고, 다 걷히면 이 변형도 지운다
 * - text: 가벼운 이동(건너뛰기, 나중에 하기). 면 없음
 * - danger: 되돌릴 수 없는 동작의 **최종 확인에만**(탈퇴, 데이터 초기화)
 */
export type ButtonVariant = 'primary' | 'secondary' | 'text' | 'danger';

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
  /** 진행 중. 글씨 자리에 스피너를 두고 너비는 그대로 둔다. 눌리지 않는다. */
  loading?: boolean;
  accessibilityLabel?: string;
}

const HEIGHT: Record<ButtonSize, number> = { lg: 52, md: 44, sm: 36 };

/**
 * 위험 버튼 면. 흰 글씨와 5.7:1. 다크 모드에서도 같은 값을 쓴다 —
 * 다크의 textDanger는 밝은 주황이라 면으로 쓰면 흰 글씨가 안 읽힌다.
 */
const DANGER_FACE = '#A84B32';
const DANGER_PRESSED = '#8F3F29';
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
      : variant === 'danger'
        ? '#FFFFFF'
        : variant === 'text'
          ? colors.textAccent
          : colors.textPrimary;

  const labelStyle = resolvedSize === 'lg' ? typography.buttonLabel : typography.buttonLabelSm;
  const content = loading ? (
    <ActivityIndicator color={labelColor} />
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
          if (variant === 'danger') return { backgroundColor: pressed ? DANGER_PRESSED : DANGER_FACE };
          if (variant === 'secondary') {
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
