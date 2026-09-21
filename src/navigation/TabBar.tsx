import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { StackActions } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/useTheme';
import Icon, { type IconName } from '../components/Icon';
import { useQuickLogSheetStore } from '../store/useQuickLogSheetStore';
import { primaryButtonShadow, radius, tabBarShadowColor, weight } from '../theme/tokens';

const TAB_LABELS: Record<string, string> = {
  Home: '홈',
  Diet: '식단',
  Health: '헬스',
  Settings: '설정',
};

const TAB_ICONS: Record<string, IconName> = {
  Home: 'home',
  Diet: 'diet',
  Health: 'health',
  Settings: 'settings',
};

// README 탭바 B안(기본): 홈 · 식단 — [+FAB] — 헬스 · 설정
export default function TabBar({ state, navigation }: BottomTabBarProps) {
  const { colors, mode, primaryGradient } = useTheme();
  const insets = useSafeAreaInsets();
  const showSheet = useQuickLogSheetStore((s) => s.show);

  const leftRoutes = state.routes.slice(0, 2);
  const rightRoutes = state.routes.slice(2, 4);

  const renderTab = (route: (typeof state.routes)[number]) => {
    const index = state.routes.findIndex((r) => r.key === route.key);
    const focused = state.index === index;
    const label = TAB_LABELS[route.name] ?? route.name;
    const icon = TAB_ICONS[route.name];

    const onPress = () => {
      const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (event.defaultPrevented) return;

      if (focused) {
        // 각 탭이 스택을 가지므로, 활성 탭을 다시 누르면 그 탭의 첫 화면으로 돌아간다.
        // 이게 없으면 물 상세 같은 서브 화면에서 탭을 눌러도 빠져나오지 못한다.
        // popToTop은 탭 라우트가 아니라 그 안의 스택 내비게이터로 보내야 한다.
        const nestedKey = (route.state as { key?: string } | undefined)?.key;
        if (nestedKey) navigation.dispatch({ ...StackActions.popToTop(), target: nestedKey });
        return;
      }
      navigation.navigate(route.name);
    };

    return (
      <Pressable key={route.key} onPress={onPress} style={styles.tabItem}>
        {focused ? (
          <LinearGradient colors={primaryGradient} style={styles.tabActiveBg} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Icon name={icon} size={19} color={colors.textOnPrimary} strokeWidth={2} />
            <Text style={[styles.label, { color: colors.textOnPrimary }, weight(700)]}>{label}</Text>
          </LinearGradient>
        ) : (
          <View style={styles.tabInactiveBg}>
            <Icon name={icon} size={19} color={colors.textSecondary} />
            <Text style={[styles.label, { color: colors.textSecondary }, weight(500)]}>{label}</Text>
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <View style={[styles.wrap, { bottom: 12 + Math.max(0, insets.bottom - 8) }]}>
      <View style={[styles.shadowWrap, { shadowColor: tabBarShadowColor }]}>
        <BlurView
          intensity={40}
          tint={mode === 'dark' ? 'dark' : 'light'}
          style={[styles.bar, { borderColor: colors.borderGlass }]}
        >
          <View style={[styles.barInner, { backgroundColor: colors.surface }]}>
            {leftRoutes.map(renderTab)}
            <View style={styles.fabSpacer} />
            {rightRoutes.map(renderTab)}
          </View>
        </BlurView>
      </View>
      <Pressable onPress={showSheet} style={styles.fabWrap} hitSlop={8}>
        <LinearGradient colors={primaryGradient} style={styles.fab} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Icon name="plus" size={24} color={colors.textOnPrimary} strokeWidth={2.2} />
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 12,
    right: 12,
    height: 64,
    alignItems: 'center',
  },
  shadowWrap: {
    width: '100%',
    height: 64,
    borderRadius: radius.tabBar,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 30,
    elevation: 8,
  },
  bar: {
    flex: 1,
    borderRadius: radius.tabBar,
    borderWidth: 1,
    overflow: 'hidden',
  },
  barInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 7,
  },
  tabItem: {
    flex: 1,
    height: '100%',
  },
  tabActiveBg: {
    flex: 1,
    borderRadius: radius.tabItem,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  tabInactiveBg: {
    flex: 1,
    borderRadius: radius.tabItem,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  label: {
    fontSize: 11.5,
  },
  fabSpacer: {
    width: 56,
  },
  fabWrap: {
    position: 'absolute',
    top: -3,
    left: '50%',
    marginLeft: -28,
  },
  fab: {
    width: 56,
    height: 50,
    borderRadius: radius.fab,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: primaryButtonShadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 6,
  },
});
