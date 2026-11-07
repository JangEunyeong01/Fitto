/**
 * 동기화 실패를 어떻게 다룰지와 "한 번만 돌리기". RN·저장소에 묶이지 않은 순수 함수라
 * scripts/check-sync.mjs가 그대로 불러 점검한다.
 */

/** 실패 하나를 보고 정하는 다음 행동. */
export type FailureAction =
  /** 원하는 상태에 이미 와 있다(지우려던 게 이미 없다). 성공으로 보고 넘어간다. */
  | 'done'
  /** 토큰이 만료됐다. 갱신하고 같은 작업을 다시. */
  | 'refresh'
  /** 지금은 안 된다. 횟수를 세지 않고 멈췄다가 다음 차례에 다시. */
  | 'pause'
  /** 서버가 이 요청을 거절했다. 횟수를 세고, 이번 차례는 여기서 끝낸다. */
  | 'count';

/** 요청이 어떻게 실패했는지. 연결 실패면 status가 없다. */
export interface Failure {
  network: boolean;
  status?: number;
}

/**
 * 연결이 끊긴 것과 서버가 잠깐 못 받는 것(5xx·429)은 요청 탓이 아니다. 횟수를 세면
 * 서버가 배포 중이거나 잠에서 깨는 몇 분 사이에 멀쩡한 기록이 "올리지 못한 기록"으로 넘어간다.
 *
 * ponytail: 서버 버그로 같은 요청이 계속 500이면 대기열이 거기서 멈춘다. 그런 일이 생기면
 * 5xx도 긴 간격으로 세는 쪽으로 바꾼다.
 */
export function classifyFailure(opKind: string, f: Failure): FailureAction {
  if (f.network) return 'pause';
  const status = f.status ?? 0;
  // 응답을 못 받았는데 서버는 지웠을 수 있다. 다시 보낸 삭제가 404면 이미 된 것이다.
  if (opKind.endsWith('.remove') && status === 404) return 'done';
  if (status === 401) return 'refresh';
  if (status >= 500 || status === 429) return 'pause';
  return 'count';
}

/**
 * 진행 중인 호출이 있으면 새로 시작하지 않고 그 결과를 같이 기다린다.
 *
 * 토큰 갱신용. 서버는 이미 쓴 refreshToken이 다시 오면 탈취로 보고 그 계정 토큰을 전부 폐기한다.
 * 갱신을 부르는 곳이 셋(올리기·내려받기·지난 날짜)이라, 동시에 두 번 나가면 모든 기기에서 로그아웃된다.
 */
export function singleFlight<T>(fn: () => Promise<T>): () => Promise<T> {
  let running: Promise<T> | null = null;
  return () => {
    if (!running) {
      running = fn().finally(() => {
        running = null;
      });
    }
    return running;
  };
}
