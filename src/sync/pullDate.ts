import { ApiError, NetworkError } from '../api/client';
import { getDiet, getWater, getWorkout } from '../api/records';
import { toDailyRecord } from '../api/mappers';
import { useAppStore } from '../store/useAppStore';
import { useAuthStore } from '../store/useAuthStore';
import { useOutboxStore } from '../store/useOutboxStore';
import { localWriteCount } from './enqueue';
import { refreshToken } from './syncEngine';

/**
 * 지난 날짜 하나를 서버에서 받아온다.
 *
 * 로그인할 때 도는 `pullAll`은 식단·운동·물을 최근 이틀치만 받는다. 이 세 가지는 날짜마다 요청이 따로라
 * 30일치를 받으려면 요청이 90번 나가기 때문이다. 대신 **그 날짜 화면을 열 때 그때 받는다.**
 *
 * 한 번 받은 날짜는 기억해서 다시 받지 않는다. 같은 날짜를 동시에 여러 화면이 부르면 요청 하나로 묶는다.
 */
const loaded = new Set<string>();
const inflight = new Map<string, Promise<void>>();

/** `pullAll`이 이미 받아온 날짜. 화면을 열 때 같은 날짜를 또 받지 않게 알려준다. */
export function markDateLoaded(date: string): void {
  loaded.add(date);
}

/**
 * 쓰는 계정이 바뀌면 "이미 받았다"는 기억을 버린다.
 *
 * 로그아웃·세션 만료·다른 계정 로그인 경로가 각각 있어서, 화면마다 부르는 대신 여기서 한 번에 지켜본다.
 * 그대로 두면 다음 계정에서 그 날짜를 안 받아오고, 서버에 기록이 있는데도 빈 화면을 보여준다.
 */
let watchedEmail = useAuthStore.getState().email;
useAuthStore.subscribe((s) => {
  if (s.email === watchedEmail) return;
  watchedEmail = s.email;
  loaded.clear();
  inflight.clear();
});

export function isDateLoaded(date: string): boolean {
  return loaded.has(date);
}

/**
 * 받아야 할 날짜면 받아오고, 아니면 아무것도 하지 않는다.
 *
 * 실패하면 `loaded`에 넣지 않는다 — 다음에 그 날짜를 다시 열면 한 번 더 시도한다.
 */
export function pullDate(date: string): Promise<void> {
  const auth = useAuthStore.getState();
  if (auth.status !== 'member' || !auth.accessToken) return Promise.resolve();
  if (loaded.has(date)) return Promise.resolve();
  // 아직 못 올린 기록·못 옮긴 게스트 기록이 있는데 서버 값으로 덮으면 그 기록이 사라진다(pullAll과 같은 규칙).
  // 게스트 기록 이전 재시도는 pullAll이 맡는다.
  if (useOutboxStore.getState().items.length > 0 || auth.importPending) return Promise.resolve();

  const running = inflight.get(date);
  if (running) return running;

  const task = fetchDate(date, auth.accessToken)
    .then((applied) => {
      // 받는 사이 기록이 바뀌어 버렸으면 "받았다"고 적지 않는다. 다음에 그 날짜를 열면 다시 받는다.
      if (applied) loaded.add(date);
    })
    .catch((e) => {
      // 연결이 없으면 다음 기회에. 기기에 있는 기록으로 화면은 그대로 그린다.
      if (!(e instanceof NetworkError)) {
        console.warn('지난 기록을 내려받지 못했습니다', e);
      }
    })
    .finally(() => {
      inflight.delete(date);
    });

  inflight.set(date, task);
  return task;
}

async function fetchDate(date: string, token: string): Promise<boolean> {
  try {
    return await fetchOnce(date, token);
  } catch (e) {
    // accessToken이 만료됐으면 갱신하고 한 번 더. 갱신도 실패하면 그대로 던진다.
    if (e instanceof ApiError && e.status === 401) {
      const fresh = await refreshToken();
      if (!fresh) throw e;
      return fetchOnce(date, fresh);
    }
    throw e;
  }
}

/** 받아서 적용했으면 true. 받는 사이 기기 기록이 바뀌었으면 적용하지 않고 false(pullAll과 같은 규칙). */
async function fetchOnce(date: string, token: string): Promise<boolean> {
  const writesAtStart = localWriteCount();
  const [diet, workout, water] = await Promise.all([getDiet(date, token), getWorkout(date, token), getWater(date, token)]);

  if (localWriteCount() !== writesAtStart || useOutboxStore.getState().items.length > 0) {
    return false;
  }

  // 걸음·체중·생리는 날짜 범위로 한 번에 받아서 pullAll이 이미 넣어둔다. 여기서는 건드리지 않는다.
  useAppStore.getState().applyServerRecords({ dailyRecords: { [date]: toDailyRecord(diet, workout, water) } });
  return true;
}
