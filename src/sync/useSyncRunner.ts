import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import { useOutboxStore } from '../store/useOutboxStore';
import { runSync } from './syncEngine';

/** 큐가 비어 있어도 주기적으로 한 번씩 확인한다. 실패로 멈춰 있던 작업을 다시 집어 든다. */
const INTERVAL_MS = 30_000;

/**
 * 동기화를 언제 돌릴지 정하는 곳. App에서 한 번만 부른다.
 *
 * 세 시점에 돌린다.
 * - 큐에 새 작업이 쌓였을 때 (기록하자마자)
 * - 앱이 다시 앞으로 나왔을 때 (연결이 돌아왔을 가능성이 높다)
 * - 30초마다 (실패해서 남아 있는 작업 재시도)
 */
export function useSyncRunner(): void {
  useEffect(() => {
    // 앱을 켤 때 남아 있던 작업부터 비운다.
    runSync();

    const unsubscribeOutbox = useOutboxStore.subscribe((state, prev) => {
      if (state.items.length > prev.items.length) {
        runSync();
      }
    });

    // 로그인하면 바로 한 번 돌린다. 게스트로 쌓인 건 가입 때 import로 올라가고,
    // 그 뒤에 생긴 기록은 여기서 따라붙는다.
    const unsubscribeAuth = useAuthStore.subscribe((state, prev) => {
      if (state.status === 'member' && prev.status !== 'member') {
        runSync();
      }
    });

    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        runSync();
      }
    });

    const timer = setInterval(runSync, INTERVAL_MS);

    return () => {
      unsubscribeOutbox();
      unsubscribeAuth();
      subscription.remove();
      clearInterval(timer);
    };
  }, []);
}
