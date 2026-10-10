import { useEffect } from 'react';
import { AppState } from 'react-native';
import { getTermsVersions } from '../api/auth';
import { TERMS_VERSION } from '../data/terms';
import { useAuthStore } from '../store/useAuthStore';
import { useReconsentStore } from '../store/useReconsentStore';
import { useToastStore } from '../store/useToastStore';
import { dateKey } from '../utils/timeOfDay';

/**
 * 바뀐 약관에 다시 동의를 묻는다(명세 5-5). App에서 한 번만 부른다(동기화·알림 runner와 같은 자리).
 *
 * - 지금 유효한 버전은 서버가 날짜로 정한다(GET /terms). 앱에 든 문안이 옛 것일 수 있어서다.
 * - 계정이 있을 때만. 게스트는 서버에 아무것도 보내지 않으니 가입할 때 그때 버전으로 동의한다 —
 *   게스트까지 열 때마다 서버를 부르면 잠든 서버를 괜히 깨운다.
 * - "나중에"를 누르면 하루에 한 번까지만 다시 묻는다. 거절해도 쓰던 기능은 그대로다.
 */
export async function checkTerms(): Promise<void> {
  const auth = useAuthStore.getState();
  // 서버에서 동의 버전을 받아오기 전(undefined)에는 묻지 않는다 — 옛 저장 상태라 값이 없을 수 있다.
  if (auth.status !== 'member' || auth.agreedTermsVersion === undefined) return;

  let versions: { current: string; upcoming: string | null };
  try {
    versions = await getTermsVersions();
  } catch {
    return; // 오프라인이거나 서버가 깨는 중. 다음에 열 때 다시 본다.
  }
  useReconsentStore.getState().setUpcoming(versions.upcoming);

  const agreed = auth.agreedTermsVersion;
  // 지금 버전에, 또는 곧 시행될 버전에 미리 동의했으면 묻지 않는다.
  if (agreed === versions.current || (versions.upcoming !== null && agreed === versions.upcoming)) return;

  const today = dateKey();
  if (useAuthStore.getState().reconsentAskedOn === today) return;
  useAuthStore.getState().setReconsentAskedOn(today);

  // 서버의 지금 버전이 이 앱에 든 문안보다 새것이면 보여줄 문안이 없다. 동의를 받으면 안 본 글에 동의시키는 셈이다.
  if (TERMS_VERSION < versions.current) {
    useToastStore.getState().show('약관이 바뀌었어요. 앱을 새 버전으로 받아 주세요');
    return;
  }
  useReconsentStore.getState().show();
}

export function useTermsRunner(): void {
  const status = useAuthStore((s) => s.status);
  const agreed = useAuthStore((s) => s.agreedTermsVersion);

  // 로그인 직후·서버에서 동의 버전을 받아온 직후에도 한 번 본다.
  useEffect(() => {
    checkTerms();
  }, [status, agreed]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') checkTerms();
    });
    return () => sub.remove();
  }, []);
}
