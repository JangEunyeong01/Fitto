import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HealthScreen from '../screens/health/HealthScreen';
import PeriodDetailScreen from '../screens/period/PeriodDetailScreen';
import WeightScreen from '../screens/health/WeightScreen';

export type HealthStackParamList = {
  HealthMain: undefined;
  PeriodDetail: undefined;
  Weight: undefined;
};

const Stack = createNativeStackNavigator<HealthStackParamList>();

// 생리 주기 상세는 홈 카드와 헬스 양쪽에서 들어올 수 있어서(README 화면 목록)
// 두 탭 스택에 각각 등록해 둔다. 각 탭이 자기 히스토리를 갖는 게 자연스럽다.
export default function HealthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HealthMain" component={HealthScreen} />
      <Stack.Screen name="PeriodDetail" component={PeriodDetailScreen} />
      <Stack.Screen name="Weight" component={WeightScreen} />
    </Stack.Navigator>
  );
}
