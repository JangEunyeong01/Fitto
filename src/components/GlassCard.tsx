import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../theme/useTheme';

interface GlassCardProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  radius?: number;
  variant?: 'card' | 'card2' | 'solid';
  intensity?: number; // README: 카드 blur(20px), 탭바 blur(24px)
  noPadding?: boolean;
  /** 2열로 나란히 놓일 때 같은 행 카드끼리 높이를 맞추기 위해 세로로 늘린다. */
  fill?: boolean;
}

/**
 * 안드로이드에서는 흐림 없이 반투명 면으로 보인다(iOS·웹은 흐림).
 *
 * Expo SDK 57부터 안드로이드 흐림은 흐리게 할 배경을 BlurTargetView로 감싸고 그 ref를 넘겨야 동작한다.
 * 그런데 흐림 뷰는 그 감싼 영역 안에 있으면 안 되고, 카드는 스크롤 내용 안에 있어서 감쌀 수 있는 건
 * 맨 뒤 그라데이션뿐이다. 부드러운 그라데이션은 흐려도 거의 그대로라 얻는 게 없어서 지금은 쓰지 않는다.
 * 안드로이드에서 유리 효과를 어떻게 할지는 UI를 다시 잡을 때 정한다.
 */
export default function GlassCard({ children, style, radius, variant = 'card', intensity = 30, noPadding, fill }: GlassCardProps) {
  const { colors, shadow, radius: radiusTokens, spacing, mode } = useTheme();
  const r = radius ?? radiusTokens.cardBig;
  const bg = variant === 'solid' ? colors.surfaceSolid : variant === 'card2' ? colors.surfaceSubtle : colors.surface;

  return (
    <View style={[{ borderRadius: r }, shadow, fill && styles.fill, style]}>
      <BlurView
        intensity={intensity}
        tint={mode === 'dark' ? 'dark' : 'light'}
        style={[
          styles.blur,
          fill && styles.fill,
          { borderRadius: r, borderColor: colors.borderGlass },
        ]}
      >
        <View
          style={[
            { backgroundColor: bg, padding: noPadding ? 0 : spacing.cardPadding },
            styles.inner,
          ]}
        >
          {children}
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  blur: {
    overflow: 'hidden',
    borderWidth: 1,
  },
  inner: {
    flex: 1,
  },
  fill: {
    flex: 1,
  },
});
