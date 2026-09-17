import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isSameTarget, type OutboxItem, type SyncOp } from '../sync/types';

/**
 * 서버로 보낼 작업 대기열(아웃박스).
 *
 * 기기에 저장하는 이유는 앱을 껐다 켜도 남아 있어야 하기 때문이다.
 * 지하철에서 기록하고 앱을 닫아도, 다음에 연결되면 그때 올라간다.
 *
 * ponytail: 순서대로 하나씩 보낸다. 병렬로 보내면 빨라지지만
 * "추가 → 삭제"가 뒤집혀 도착할 수 있다. 기록 앱에서 그 위험이 속도보다 크다.
 */
interface OutboxState {
  items: OutboxItem[];
  /** 마지막으로 성공한 시각. 설정 화면의 동기화 상태 표시에 쓴다. */
  lastSyncedAt: number | null;
  enqueue: (op: SyncOp) => void;
  shift: () => void;
  retryLater: () => void;
  markSynced: () => void;
  clear: () => void;
}

/** 이 횟수를 넘겨 실패하면 버린다. 고칠 수 없는 요청을 무한히 재시도하지 않는다. */
export const MAX_TRIES = 5;

export const useOutboxStore = create<OutboxState>()(
  persist(
    (set) => ({
      items: [],
      lastSyncedAt: null,

      enqueue: (op) =>
        set((s) => {
          // 같은 대상을 또 바꿨으면 새로 쌓지 않는다. 보낼 때 최신 값을 읽어가므로
          // 물을 다섯 번 눌러도 요청은 한 번이면 된다.
          if (s.items.some((item) => isSameTarget(item.op, op))) {
            return {};
          }
          const item: OutboxItem = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            op,
            createdAt: Date.now(),
            tries: 0,
          };
          return { items: [...s.items, item] };
        }),

      /** 맨 앞 작업을 성공 처리하고 큐에서 뺀다. */
      shift: () => set((s) => ({ items: s.items.slice(1), lastSyncedAt: Date.now() })),

      /**
       * 맨 앞 작업을 실패 처리한다. 횟수를 넘기면 버리고 다음으로 넘어간다 —
       * 하나가 막혀서 뒤의 기록이 영영 안 올라가는 상황을 막는다.
       */
      retryLater: () =>
        set((s) => {
          const [head, ...rest] = s.items;
          if (!head) {
            return {};
          }
          const next = { ...head, tries: head.tries + 1 };
          return { items: next.tries >= MAX_TRIES ? rest : [next, ...rest] };
        }),

      markSynced: () => set({ lastSyncedAt: Date.now() }),

      /** 로그아웃·데이터 초기화 때 비운다. 남겨두면 다음 계정으로 올라간다. */
      clear: () => set({ items: [], lastSyncedAt: null }),
    }),
    {
      name: 'fitto-outbox-storage',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
    }
  )
);
