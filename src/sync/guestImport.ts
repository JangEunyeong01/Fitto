import { importGuestData } from '../api/auth';
import { ApiError } from '../api/client';
import { toImportPayload } from '../api/mappers';
import { useAppStore } from '../store/useAppStore';
import { useAuthStore } from '../store/useAuthStore';
import { useToastStore } from '../store/useToastStore';
import { refreshToken } from './syncEngine';

/**
 * 게스트로 쌓은 기기 기록을 계정으로 옮긴다(명세 6장).
 *
 * 가입·로그인 화면은 받은 토큰으로 **이걸 먼저 끝낸 뒤** 로그인 상태로 바꾼다. 예전엔 로그인부터 해서
 * 러너가 바로 내려받기를 시작했고, 이전이 서버에 닿기 전에 받은 빈 오늘 기록이 기기 기록을 덮을 수 있었다.
 *
 * 실패하면 화면이 `importPending`을 켠 채 로그인하고, 내려받기 직전에 `retryPendingImport`가 다시 보낸다.
 * 서버가 같은 ID·같은 날짜 값은 건너뛰어서 여러 번 보내도 기록이 두 번 생기지 않는다.
 *
 * @returns 옮긴 기록 개수
 */
export async function importGuest(token: string): Promise<number> {
  // 보내는 그 순간의 기기 값. 실패 뒤 다시 보낼 때는 그사이 더한 기록까지 같이 간다.
  const s = useAppStore.getState();
  const payload = toImportPayload({
    dailyRecords: s.dailyRecords,
    weightLog: s.weightLog,
    periodSettings: s.periodSettings,
    periodSetupDone: s.periodSetupDone,
    periodLogs: s.periodLogs,
    recipes: s.recipes,
    routines: s.routines,
    customIngredients: s.customIngredients,
  });
  const imported = await importGuestData(payload, token);
  return Object.values(imported.imported).reduce((a, v) => a + v, 0);
}

/**
 * 못 옮긴 게스트 기록이 있으면 다시 보낸다.
 *
 * @returns 내려받아도 되면 true. 아직 못 옮겼으면 false — 지금 받으면 서버의 빈 값이 기기 기록을 덮는다.
 */
export async function retryPendingImport(): Promise<boolean> {
  const auth = useAuthStore.getState();
  if (!auth.importPending) return true;
  if (auth.status !== 'member' || !auth.accessToken) return false;

  try {
    let count: number;
    try {
      count = await importGuest(auth.accessToken);
    } catch (e) {
      if (!(e instanceof ApiError && e.status === 401)) throw e;
      const fresh = await refreshToken();
      if (!fresh) return false;
      count = await importGuest(fresh);
    }
    useAuthStore.getState().setImportPending(false);
    if (count > 0) useToastStore.getState().show(`기록 ${count}개를 계정에 옮겼어요`);
    return true;
  } catch {
    // 연결이 없거나 서버가 거절했다. 표시를 그대로 두고 다음 차례에 다시.
    // ponytail: 서버가 같은 이유로 계속 거절하면(400) 영영 못 내려받는다. 생기면 실패 목록처럼 설정 화면에 띄운다.
    return false;
  }
}
