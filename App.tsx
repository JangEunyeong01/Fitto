import React from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import RootNavigator from './src/navigation/RootNavigator';
import Toast from './src/components/Toast';
import QuickLogSheet from './src/components/QuickLogSheet';
import FoodSearchSheet from './src/screens/diet/FoodSearchSheet';
import ExerciseSheet from './src/screens/health/ExerciseSheet';
import BirthdayModal from './src/screens/home/BirthdayModal';
import TutorialOverlay from './src/components/TutorialOverlay';
import SessionExpiredModal from './src/components/SessionExpiredModal';
import { useTheme } from './src/theme/useTheme';
import { useFittoFonts } from './src/theme/fonts';
import { lightColors } from './src/theme/tokens';
import { useSyncRunner } from './src/sync/useSyncRunner';

function AppShell() {
  const { mode } = useTheme();
  // 로그인 상태라면 기기에 쌓인 기록을 서버로 올린다. 게스트면 아무 일도 하지 않는다.
  useSyncRunner();
  return (
    <>
      {/* 시트들은 화면 전체를 덮는 오버레이지만 useNavigation을 쓰므로
          NavigationContainer 안에 둔다. */}
      <NavigationContainer>
        <View style={{ flex: 1 }}>
          <RootNavigator />
          <QuickLogSheet />
          <FoodSearchSheet />
          <ExerciseSheet />
          {/* 로그인 화면으로 보내야 해서 NavigationContainer 안에 둔다. */}
          <SessionExpiredModal />
        </View>
      </NavigationContainer>
      <BirthdayModal />
      {/* 튜토리얼은 탭바까지 덮어야 해서 NavigationContainer 바깥에 둔다.
          홈 화면 안에 두면 탭바가 딤 위로 올라와 튜토리얼 중에 다른 탭으로 나갈 수 있었다. */}
      <TutorialOverlay />
      <Toast />
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
    </>
  );
}

export default function App() {
  // Pretendard가 올라오기 전에 그리면 시스템 폰트로 한 번 그려졌다가 바뀌면서
  // 글자 폭이 튄다. 로딩될 때까지 배경색만 깔아둔다.
  const fontsReady = useFittoFonts();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        {fontsReady ? <AppShell /> : <View style={{ flex: 1, backgroundColor: lightColors.bg }} />}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
