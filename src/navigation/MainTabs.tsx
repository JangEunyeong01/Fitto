import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { TAB_OPTIONS } from './transitions';
import TabBar from './TabBar';
import HomeStack from './HomeStack';
import DietStack from './DietStack';
import HealthStack from './HealthStack';
import SettingsStack from './SettingsStack';

export type MainTabsParamList = {
  Home: undefined;
  Diet: undefined;
  Health: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<MainTabsParamList>();

export default function MainTabs() {
  return (
    <Tab.Navigator screenOptions={TAB_OPTIONS} tabBar={(props) => <TabBar {...props} />}>
      <Tab.Screen name="Home" component={HomeStack} />
      <Tab.Screen name="Diet" component={DietStack} />
      <Tab.Screen name="Health" component={HealthStack} />
      <Tab.Screen name="Settings" component={SettingsStack} />
    </Tab.Navigator>
  );
}
