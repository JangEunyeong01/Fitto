import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';

/**
 * 화면 전환 방향(UI 기준서 4장).
 *
 * - 탭 안에서 상세로 들어갈 때는 오른쪽에서 들어오고, 뒤로 가면 반대로 나간다 — "한 단계 깊이 들어갔다"
 * - 하단 탭끼리는 방향이 없으므로 페이드만 — "옆으로 옮긴 것이지 깊이 들어간 게 아니다"
 *
 * 예전에는 따로 정하지 않아 플랫폼 기본값을 따랐고, 탭을 바꿀 때와 상세로 들어갈 때의 움직임이
 * 구분되지 않았다. 모든 스택이 같은 값을 쓰도록 한 곳에 둔다.
 */
export const STACK_OPTIONS: NativeStackNavigationOptions = {
  headerShown: false,
  animation: 'slide_from_right',
};

export const TAB_OPTIONS: BottomTabNavigationOptions = {
  headerShown: false,
  animation: 'fade',
};

/** 온보딩 → 계정 선택 → 홈처럼 앱의 단계가 바뀌는 전환. 깊이가 아니라 장면이 바뀌는 것이라 페이드. */
export const ROOT_OPTIONS: NativeStackNavigationOptions = {
  headerShown: false,
  animation: 'fade',
};
