import { useAuthStore } from '../store/useAuthStore';
import { useOutboxStore } from '../store/useOutboxStore';
import type { SyncOp } from './types';

let localWrites = 0;

/**
 * 앱을 켠 뒤 기기에서 기록을 바꾼 횟수. 내려받기가 시작할 때 이 값을 적어 두고, 적용 직전에 비교한다.
 *
 * 대기열이 비었는지만 보면 모자란다. 받는 사이에 물을 한 잔 기록하고 그게 벌써 올라가 대기열이 다시 비면,
 * 그보다 먼저 받아 둔 서버 값(한 잔 전)이 방금 기록을 덮는다.
 */
export function localWriteCount(): number {
  return localWrites;
}

/**
 * 기록이 바뀌었음을 동기화 대기열에 알린다.
 *
 * 게스트면 아무것도 하지 않는다 — 서버에 계정이 없으니 보낼 곳이 없다(명세 3-2).
 * 스토어가 이 함수만 알고 API는 모르게 두어서, 기록 로직과 통신을 섞지 않는다.
 */
export function enqueueSync(op: SyncOp): void {
  localWrites++;
  if (useAuthStore.getState().status !== 'member') {
    return;
  }
  useOutboxStore.getState().enqueue(op);
}
