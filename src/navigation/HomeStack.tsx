import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/home/HomeScreen';
import WaterDetailScreen from '../screens/detail/WaterDetailScreen';
import StepsDetailScreen from '../screens/detail/StepsDetailScreen';
import ActivityDetailScreen from '../screens/detail/ActivityDetailScreen';
import PeriodDetailScreen from '../screens/period/PeriodDetailScreen';

export type HomeStackParamList = {
  HomeMain: undefined;
  WaterDetail: undefined;
  StepsDetail: undefined;
  ActivityDetail: undefined;
  PeriodDetail: undefined;
};

const Stack = createNativeStackNavigator<HomeStackParamList>();

// 물/걸음 상세는 홈 탭 안에서 밀고 들어가는 서브 화면이다.
// 탭바(App.tsx에서 NavigationContainer 안에 마운트)는 그대로 떠 있고,
// 화면 안의 ‹ 뒤로가기 버튼으로 홈으로 돌아간다.
export default function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeMain" component={HomeScreen} />
      <Stack.Screen name="WaterDetail" component={WaterDetailScreen} />
      <Stack.Screen name="StepsDetail" component={StepsDetailScreen} />
      <Stack.Screen name="ActivityDetail" component={ActivityDetailScreen} />
      <Stack.Screen name="PeriodDetail" component={PeriodDetailScreen} />
    </Stack.Navigator>
  );
}
