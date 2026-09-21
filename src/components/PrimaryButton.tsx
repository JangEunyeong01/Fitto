import React from 'react';
import { Pressable, Text, StyleSheet, StyleProp, ViewStyle, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/useTheme';
import { typography } from '../theme/tokens';

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  small?: boolean;
  loading?: boolean;
  /**
   * 아직 진행할 수 없는 상태. 회색으로 보이지만 누를 수는 있다.
   * 완전히 막아버리면 왜 못 넘어가는지 알려줄 수 없어서(온보딩은 토스트로 안내한다) 이렇게 나눴다.
   */
  inactive?: boolean;
}

export default function PrimaryButton({ label, onPress, style, disabled, small, loading, inactive }: PrimaryButtonProps) {
  const { colors, primaryGradient, primaryButtonShadow, primaryButtonShadowSmall, radius, minTouchTarget } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
          height: small ? 42 : Math.max(minTouchTarget, 52),
          borderRadius: radius.button,
          // 비활성일 땐 그림자도 걷어서 눌러야 할 버튼처럼 보이지 않게 한다.
          shadowColor: inactive ? 'transparent' : small ? primaryButtonShadowSmall : primaryButtonShadow,
          shadowOffset: { width: 0, height: small ? 6 : 8 },
          shadowOpacity: inactive ? 0 : 1,
          shadowRadius: small ? 14 : 20,
          elevation: inactive ? 0 : 5,
        },
        style,
      ]}
    >
      <LinearGradient
        colors={inactive ? [colors.surfaceMuted, colors.surfaceMuted] : primaryGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradient, { borderRadius: radius.button }]}
      >
        {/* 파스텔 면 위 흰 글씨는 1.9:1이라 읽기 어렵다. 면은 두고 글씨를 짙게 바꾼다(UI 기준서 2-3). */}
        {loading ? (
          <ActivityIndicator color={inactive ? colors.textDisabled : colors.textOnPrimary} />
        ) : (
          <Text
            style={[
              small ? typography.buttonLabelSm : typography.buttonLabel,
              { color: inactive ? colors.textDisabled : colors.textOnPrimary },
            ]}
          >
            {label}
          </Text>
        )}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
