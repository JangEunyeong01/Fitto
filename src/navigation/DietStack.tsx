import React from 'react';
import { STACK_OPTIONS } from './transitions';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DietScreen from '../screens/diet/DietScreen';
import RecipeScreen from '../screens/recipe/RecipeScreen';
import DietAnalysisScreen from '../screens/diet/DietAnalysisScreen';

export type DietStackParamList = {
  DietMain: undefined;
  Recipe: undefined;
  DietAnalysis: undefined;
};

const Stack = createNativeStackNavigator<DietStackParamList>();

// 나만의 레시피·식단 분석은 식단 화면 하단 2버튼에서 들어가는 서브 화면이다.
export default function DietStack() {
  return (
    <Stack.Navigator screenOptions={STACK_OPTIONS}>
      <Stack.Screen name="DietMain" component={DietScreen} />
      <Stack.Screen name="Recipe" component={RecipeScreen} />
      <Stack.Screen name="DietAnalysis" component={DietAnalysisScreen} />
    </Stack.Navigator>
  );
}
