import { useAuthStore } from '../store/useAuthStore';
import { useOutboxStore } from '../store/useOutboxStore';
import type { SyncOp } from './types';

/**
 * 기록이 바뀌었음을 동기화 대기열에 알린다.
 *
 * 게스트면 아무것도 하지 않는다 — 서버에 계정이 없으니 보낼 곳이 없다(명세 3-2).
 * 스토어가 이 함수만 알고 API는 모르게 두어서, 기록 로직과 통신을 섞지 않는다.
 */
export function enqueueSync(op: SyncOp): void {
  if (useAuthStore.getState().status !== 'member') {
    return;
  }
  useOutboxStore.getState().enqueue(op);
}
