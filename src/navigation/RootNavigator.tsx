import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAppStore } from '../store/useAppStore';
import { useAuthStore } from '../store/useAuthStore';
import OnboardingScreen from '../screens/onboarding/OnboardingScreen';
import AccountChoiceScreen from '../screens/onboarding/AccountChoiceScreen';
import SignupScreen from '../screens/settings/SignupScreen';
import LoginScreen from '../screens/settings/LoginScreen';
import MainTabs from './MainTabs';

export type RootStackParamList = {
  Onboarding: undefined;
  AccountChoice: undefined;
  Signup: undefined;
  Login: undefined;
  Main: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const onboardingDone = useAppStore((s) => s.onboardingDone);
  const accountPromptSeen = useAppStore((s) => s.accountPromptSeen);
  const isMember = useAuthStore((s) => s.status) === 'member';

  // 온보딩을 마치면 계정 선택을 한 번 거친다. 이미 로그인한 상태면 물을 이유가 없다.
  const askAccount = onboardingDone && !accountPromptSeen && !isMember;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!onboardingDone ? (
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      ) : askAccount ? (
        // 가입·로그인 화면은 설정 탭에도 있지만, 이때는 탭이 아직 없어서 여기에도 둔다.
        <>
          <Stack.Screen name="AccountChoice" component={AccountChoiceScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
        </>
      ) : (
        <Stack.Screen name="Main" component={MainTabs} />
      )}
    </Stack.Navigator>
  );
}
