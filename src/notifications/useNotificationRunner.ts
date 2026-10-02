import { useEffect } from 'react';
import { AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useAppStore } from '../store/useAppStore';
import { NOTIFICATIONS_SUPPORTED, openTarget, reschedule } from './schedule';
import type { NotifyTarget } from './plan';

/**
 * 알림 예약을 언제 다시 걸지 정하는 곳. App에서 한 번만 부른다(동기화의 useSyncRunner와 같은 자리).
 *
 * - 앱을 켤 때, 다시 앞으로 나올 때 — 사흘치만 걸어두니 열 때마다 앞으로 민다
 * - 알림 설정·성격·목표·기록이 바뀔 때 — "목표까지 ○ml"와 이미 기록한 끼니를 반영한다
 * - 알림을 눌렀을 때 — 관련 화면으로 간다
 */
export function useNotificationRunner(): void {
  useEffect(() => {
    if (!NOTIFICATIONS_SUPPORTED) return;

    reschedule();

    // 물 한 잔마다 바로 다시 걸면 연달아 누를 때 수십 번 돈다. 잠깐 모았다가 한 번에.
    let timer: ReturnType<typeof setTimeout> | null = null;
    const later = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(reschedule, 1500);
    };
    const unsubscribe = useAppStore.subscribe((s, prev) => {
      if (
        s.alarms !== prev.alarms ||
        s.persona !== prev.persona ||
        s.goals !== prev.goals ||
        s.dailyRecords !== prev.dailyRecords ||
        s.periodOn !== prev.periodOn ||
        s.periodSettings !== prev.periodSettings
      ) {
        later();
      }
    });

    const appState = AppState.addEventListener('change', (next) => {
      if (next === 'active') reschedule();
    });

    const open = (r: Notifications.NotificationResponse) => {
      const target = r.notification.request.content.data?.target as NotifyTarget | undefined;
      if (target) openTarget(target);
    };
    // 앱이 꺼진 상태에서 알림을 눌러 켜진 경우.
    Notifications.getLastNotificationResponseAsync().then((r) => r && open(r));
    const tap = Notifications.addNotificationResponseReceivedListener(open);

    return () => {
      if (timer) clearTimeout(timer);
      unsubscribe();
      appState.remove();
      tap.remove();
    };
  }, []);
}
