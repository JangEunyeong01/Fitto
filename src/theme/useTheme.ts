import { useColorScheme } from 'react-native';
import { useAppStore } from '../store/useAppStore';
import {
  resolveColors,
  glassShadow,
  brand,
  semantic,
  typography,
  spacing,
  radius,
  gauge,
  minTouchTarget,
  selection,
  overlay,
  tabBarShadowColor,
  motion,
  white,
  alpha,
} from './tokens';

/**
 * 테마에 따라 달라지는 값(colors, shadow)과 고정 토큰을 한 번에 내려준다.
 * StyleSheet.create처럼 훅을 쓸 수 없는 위치에서는 './tokens'에서 직접 import한다.
 */
export function useTheme() {
  const themeMode = useAppStore((s) => s.theme);
  const system = useColorScheme();
  const mode = themeMode === 'system' ? (system === 'dark' ? 'dark' : 'light') : themeMode;
  const colors = resolveColors(mode);

  return {
    mode,
    colors,
    shadow: glassShadow[mode],
    brand,
    semantic,
    typography,
    spacing,
    radius,
    gauge,
    minTouchTarget,
    selection,
    overlay,
    tabBarShadowColor,
    motion,
    white,
    alpha,
  };
}
