import { Platform, Linking } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import type * as NotificationsModule from 'expo-notifications';
import { useAppStore } from '../store/useAppStore';
import { toDateKey } from '../utils/periodCycle';
import { navigationRef } from '../navigation/navigationRef';
import { planNotifications, type NotifyTarget } from './plan';
import { personaCopy } from '../copy/persona';

/**
 * 기기 알림 예약(plan.ts가 만든 목록대로).
 *
 * 매번 전부 지우고 다시 건다. 하나씩 고치는 것보다 단순하고, 많아야 50개라 금방 끝난다.
 * 웹에는 기기 알림이 없어서 아무것도 하지 않는다(설정 화면에 "앱에서만"으로 표시).
 *
 * 안드로이드 Expo Go는 SDK 53부터 expo-notifications를 **불러오기만 해도** 에러로 멈춘다(원격 푸시를 빼면서 생긴 제약,
 * 로컬 알림만 써도 걸린다). 그래서 import 대신 필요할 때만 require하고, Expo Go 안드로이드에서는 아예 안 부른다.
 * 실제 알림은 개발용 빌드(development build)에서 확인한다.
 */
const IS_ANDROID_EXPO_GO =
  Platform.OS === 'android' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export const NOTIFICATIONS_SUPPORTED = Platform.OS !== 'web' && !IS_ANDROID_EXPO_GO;

/** 알림이 안 되는 이유. 설정 화면 안내 문구에 쓴다. */
export const UNSUPPORTED_REASON = IS_ANDROID_EXPO_GO
  ? '알림은 개발용 빌드에서 울려요. Expo Go 안드로이드에서는 꺼져 있어요.'
  : '알림은 휴대폰 앱에서만 울려요.';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const Notifications: typeof NotificationsModule | null = NOTIFICATIONS_SUPPORTED ? require('expo-notifications') : null;

const ANDROID_CHANNEL = 'reminders';

// 앱을 보고 있을 때도 알림을 띄운다. 물 알림은 앱 안에 있어도 놓치기 쉽다.
if (Notifications) {
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
  if (!Notifications) return 'unsupported';
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

/** 알림을 처음 켤 때만 묻는다. 이미 거절했으면 OS가 다시 묻지 않으니 설정 앱으로 보내야 한다. */
export async function requestPermission(): Promise<PermissionState> {
  if (!Notifications) return 'unsupported';
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

// 앱을 켤 때, 앞으로 나올 때, 기록이 바뀔 때가 거의 동시에 겹친다. 두 번이 섞여 돌면
// 먼저 시작한 쪽이 옛 기록으로 만든 예약을 나중에 덮어쓸 수 있어서, 앞 번이 끝난 뒤에 돈다.
let queue: Promise<void> = Promise.resolve();

/** 지금 설정·기록으로 예약을 갈아끼운다. 권한이 없으면 지우기만 한다. */
export function reschedule(): Promise<void> {
  queue = queue.then(rescheduleNow, rescheduleNow);
  return queue;
}

async function rescheduleNow(): Promise<void> {
  if (!Notifications) return;
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

/**
 * 개발 확인용: 10초 뒤 물 알림 하나. 정각까지 기다리지 않고 표시·누르면 이동을 본다.
 * 화면에서는 __DEV__일 때만 버튼을 보여준다.
 */
export async function scheduleTestNotification(): Promise<boolean> {
  if (!Notifications || (await getPermission()) !== 'granted') return false;
  const s = useAppStore.getState();
  const remain = Math.max(0, s.goals.water - (s.dailyRecords[toDateKey(new Date())]?.water ?? 0));
  await Notifications.scheduleNotificationAsync({
    identifier: 'dev-test',
    content: {
      title: '물 마시기 (테스트)',
      body: (personaCopy.waterAlarm[s.persona] as (v: { remain: number }) => string)({ remain }),
      data: { target: 'home' },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 10, channelId: ANDROID_CHANNEL },
  });
  return true;
}

/**
 * 알림을 눌렀을 때 화면을 옮기도록 듣는다. 앱이 꺼진 상태에서 알림으로 켜진 경우도 한 번 처리한다.
 * 해제 함수를 돌려준다. 알림이 안 되는 환경에선 아무것도 하지 않는다.
 */
export function listenTaps(): () => void {
  if (!Notifications) return () => {};
  const open = (r: NotificationsModule.NotificationResponse) => {
    const target = r.notification.request.content.data?.target as NotifyTarget | undefined;
    if (target) openTarget(target);
  };
  Notifications.getLastNotificationResponseAsync().then((r) => r && open(r));
  const sub = Notifications.addNotificationResponseReceivedListener(open);
  return () => sub.remove();
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
