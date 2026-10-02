import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useAppStore } from '../store/useAppStore';
import { NOTIFICATIONS_SUPPORTED, listenTaps, reschedule } from './schedule';

/**
 * 알림 예약을 언제 다시 걸지 정하는 곳. App에서 한 번만 부른다(동기화의 useSyncRunner와 같은 자리).
 *
 * - 앱을 켤 때, 다시 앞으로 나올 때 — 사흘치만 걸어두니 열 때마다 앞으로 민다
 * - 알림 설정·성격·목표·기록이 바뀔 때 — "목표까지 ○ml"와 이미 기록한 끼니를 반영한다
 * - 알림을 눌렀을 때 — 관련 화면으로 간다
 *
 * expo-notifications는 schedule.ts만 불러온다. Expo Go 안드로이드에선 불러오기만 해도 멈추기 때문이다.
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

    const stopTaps = listenTaps();

    return () => {
      if (timer) clearTimeout(timer);
      unsubscribe();
      appState.remove();
      stopTaps();
    };
  }, []);
}
