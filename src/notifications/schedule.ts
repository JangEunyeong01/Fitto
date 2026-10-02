import { Platform, Linking } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useAppStore } from '../store/useAppStore';
import { toDateKey } from '../utils/periodCycle';
import { navigationRef } from '../navigation/navigationRef';
import { planNotifications, type NotifyTarget } from './plan';

/**
 * 기기 알림 예약(plan.ts가 만든 목록대로).
 *
 * 매번 전부 지우고 다시 건다. 하나씩 고치는 것보다 단순하고, 많아야 50개라 금방 끝난다.
 * 웹에는 기기 알림이 없어서 아무것도 하지 않는다(설정 화면에 "앱에서만"으로 표시).
 */
export const NOTIFICATIONS_SUPPORTED = Platform.OS !== 'web';

const ANDROID_CHANNEL = 'reminders';

// 앱을 보고 있을 때도 알림을 띄운다. 물 알림은 앱 안에 있어도 놓치기 쉽다.
if (NOTIFICATIONS_SUPPORTED) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export type PermissionState = 'granted' | 'denied' | 'undetermined' | 'unsupported';

export async function getPermission(): Promise<PermissionState> {
  if (!NOTIFICATIONS_SUPPORTED) return 'unsupported';
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

/** 알림을 처음 켤 때만 묻는다. 이미 거절했으면 OS가 다시 묻지 않으니 설정 앱으로 보내야 한다. */
export async function requestPermission(): Promise<PermissionState> {
  if (!NOTIFICATIONS_SUPPORTED) return 'unsupported';
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL, {
      name: '기록 알림',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const { status } = await Notifications.requestPermissionsAsync();
  return status;
}

export const openSystemSettings = () => Linking.openSettings();

/** 지금 설정·기록으로 예약을 갈아끼운다. 권한이 없으면 지우기만 한다. */
export async function reschedule(): Promise<void> {
  if (!NOTIFICATIONS_SUPPORTED) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  if ((await getPermission()) !== 'granted') return;

  const s = useAppStore.getState();
  const mealsLogged: Record<string, string[]> = {};
  Object.entries(s.dailyRecords).forEach(([day, rec]) => {
    mealsLogged[day] = Object.entries(rec.meals ?? {})
      .filter(([, items]) => items.length > 0)
      .map(([slot]) => slot);
  });
  const waterByDate: Record<string, number> = {};
  const today = toDateKey(new Date());
  waterByDate[today] = s.dailyRecords[today]?.water ?? 0;

  const plan = planNotifications({
    now: new Date(),
    alarms: s.alarms,
    persona: s.persona,
    waterGoal: s.goals.water,
    waterByDate,
    mealsLogged,
    period: { on: s.periodOn, setupDone: s.periodSetupDone, settings: s.periodSettings },
  });

  for (const n of plan) {
    await Notifications.scheduleNotificationAsync({
      identifier: n.id,
      content: { title: n.title, body: n.body, data: { target: n.target } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: n.at, channelId: ANDROID_CHANNEL },
    });
  }
}

/** 알림을 누르면 관련 화면으로. 앱이 꺼져 있다 켜지는 경우는 화면이 준비된 뒤에 옮긴다. */
export function openTarget(target: NotifyTarget): void {
  if (!navigationRef.isReady()) {
    setTimeout(() => openTarget(target), 300);
    return;
  }
  if (target === 'diet') navigationRef.navigate('Main', { screen: 'Diet' });
  else if (target === 'period') navigationRef.navigate('Main', { screen: 'Home', params: { screen: 'PeriodDetail' } });
  else navigationRef.navigate('Main', { screen: 'Home', params: { screen: 'HomeMain' } });
}
