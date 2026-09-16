import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SettingsScreen from '../screens/settings/SettingsScreen';
import ProfileScreen from '../screens/settings/ProfileScreen';
import NotificationsScreen from '../screens/settings/NotificationsScreen';
import PeriodSettingsScreen from '../screens/period/PeriodSettingsScreen';
import SignupScreen from '../screens/settings/SignupScreen';
import LoginScreen from '../screens/settings/LoginScreen';

export type SettingsStackParamList = {
  SettingsMain: undefined;
  Profile: undefined;
  Notifications: undefined;
  PeriodSettings: undefined;
  Signup: undefined;
  Login: undefined;
};

const Stack = createNativeStackNavigator<SettingsStackParamList>();

// 프로필·알림·생리 주기 설정은 설정 탭 안에서 밀고 들어가는 서브 화면이다(HomeStack과 같은 구조).
export default function SettingsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SettingsMain" component={SettingsScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="PeriodSettings" component={PeriodSettingsScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
    </Stack.Navigator>
  );
}
