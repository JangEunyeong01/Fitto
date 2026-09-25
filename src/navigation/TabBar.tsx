import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { StackActions } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/useTheme';
import Icon, { type IconName } from '../components/Icon';
import { useQuickLogSheetStore } from '../store/useQuickLogSheetStore';
import { alpha, radius, tabBarShadowColor, weight } from '../theme/tokens';

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

/**
 * 하단 탭바: 홈 · 식단 — [+] — 헬스 · 설정
 *
 * 시안 규칙 4: **파랑을 쓰지 않는다.** 예전엔 고른 탭과 가운데 +가 파란 그라데이션이라,
 * 어느 화면에서나 가장 눈에 띄는 게 탭바였다. 파랑은 그 화면의 칠해진 버튼 하나에 양보한다.
 * 고른 탭은 진한 글씨 + 굵기 700 + 굵은 선 아이콘으로 알린다(색 차이만으로 알리지 않는다).
 */
export default function TabBar({ state, navigation }: BottomTabBarProps) {
  const { colors, mode } = useTheme();
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

    const tint = focused ? colors.textPrimary : colors.textSecondary;
    return (
      <Pressable
        key={route.key}
        onPress={onPress}
        style={styles.tabItem}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={label}
      >
        <Icon name={icon} size={20} color={tint} strokeWidth={focused ? 2 : 1.8} />
        <Text style={[styles.label, { color: tint }, weight(focused ? 700 : 500)]}>{label}</Text>
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
          <View style={[styles.barInner, { backgroundColor: alpha(colors.surfaceSolid, 0.82) }]}>
            {leftRoutes.map(renderTab)}
            {/* 빠른 기록. 탭바 안에 흰 원 + 얇은 선으로 둔다(예전엔 위로 튀어나온 파란 버튼). */}
            <View style={styles.fabSlot}>
              <Pressable
                onPress={showSheet}
                // 보이는 지름 42. 사방 4씩 넓혀 누르는 영역을 50으로.
                hitSlop={4}
                accessibilityRole="button"
                accessibilityLabel="빠른 기록"
                style={({ pressed }) => [
                  styles.fab,
                  {
                    backgroundColor: colors.surfaceSolid,
                    // 글씨색을 옅게 써서 라이트·다크 모두 같은 세기로 보이게 한다.
                    borderColor: alpha(colors.textPrimary, 0.18),
                    transform: [{ scale: pressed ? 0.94 : 1 }],
                  },
                ]}
              >
                <Icon name="plus" size={24} color={colors.textPrimary} strokeWidth={2} />
              </Pressable>
            </View>
            {rightRoutes.map(renderTab)}
          </View>
        </BlurView>
      </View>
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
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  label: {
    fontSize: 12,
  },
  fabSlot: {
    width: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
