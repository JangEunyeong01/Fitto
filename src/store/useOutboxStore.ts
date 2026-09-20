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
 * 순서대로 하나씩 보낸다. 병렬로 보내면 빨라지지만
 * "추가 → 삭제"가 뒤집혀 도착할 수 있다. 기록 앱에서 그 위험이 속도보다 크다.
 */
/**
 * 재시도 횟수를 다 쓰고 올리지 못한 작업.
 *
 * 예전에는 조용히 버렸다. 기기에는 기록이 남아 있으니 화면상 문제가 없어 보이지만,
 * 폰을 바꾸면 그 기록만 사라진다. 사용자가 모르는 채로 기록을 잃는 게 가장 나쁜 실패라
 * 버리지 않고 여기에 옮겨두고 설정 화면에서 보여준다.
 */
export interface FailedItem extends OutboxItem {
  failedAt: number;
  /** 서버가 준 사유. 화면에 그대로 보여줄 수 있는 문장이다(명세 0-6). */
  reason: string;
}

interface OutboxState {
  items: OutboxItem[];
  /** 마지막으로 성공한 시각. 설정 화면의 동기화 상태 표시에 쓴다. */
  lastSyncedAt: number | null;
  failed: FailedItem[];
  enqueue: (op: SyncOp) => void;
  shift: () => void;
  retryLater: (reason: string) => void;
  markSynced: () => void;
  /** 실패 목록을 큐 뒤에 다시 넣는다. 설정 화면의 "다시 시도". */
  retryFailed: () => void;
  /** 실패 목록만 비운다. 사용자가 포기하기로 한 경우. */
  clearFailed: () => void;
  clear: () => void;
}

/** 이 횟수를 넘겨 실패하면 큐에서 빼고 실패 목록으로 옮긴다. 같은 요청을 무한히 재시도하지 않는다. */
export const MAX_TRIES = 5;

/** 실패 목록 상한. 서버가 계속 거절하는 상황에서 저장소가 끝없이 불어나지 않게 한다. */
const MAX_FAILED = 50;

export const useOutboxStore = create<OutboxState>()(
  persist(
    (set) => ({
      items: [],
      lastSyncedAt: null,
      failed: [],

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
       * 맨 앞 작업을 실패 처리한다. 횟수를 넘기면 큐에서 빼서 실패 목록으로 옮긴다 —
       * 하나가 막혀서 뒤의 기록이 영영 안 올라가는 상황을 막되, 사라지지는 않게.
       */
      retryLater: (reason) =>
        set((s) => {
          const [head, ...rest] = s.items;
          if (!head) {
            return {};
          }
          const next = { ...head, tries: head.tries + 1 };
          if (next.tries < MAX_TRIES) {
            return { items: [next, ...rest] };
          }
          const failed = [...s.failed, { ...next, failedAt: Date.now(), reason }];
          return { items: rest, failed: failed.slice(-MAX_FAILED) };
        }),

      markSynced: () => set({ lastSyncedAt: Date.now() }),

      // 큐 뒤에 붙인다. 앞에 넣으면 같은 이유로 또 막혀서 새 기록까지 밀린다.
      retryFailed: () =>
        set((s) => ({
          items: [...s.items, ...s.failed.map(({ failedAt, reason, ...item }) => ({ ...item, tries: 0 }))],
          failed: [],
        })),

      clearFailed: () => set({ failed: [] }),

      /** 로그아웃·데이터 초기화 때 비운다. 남겨두면 다음 계정으로 올라간다. */
      clear: () => set({ items: [], failed: [], lastSyncedAt: null }),
    }),
    {
      name: 'fitto-outbox-storage',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
    }
  )
);
