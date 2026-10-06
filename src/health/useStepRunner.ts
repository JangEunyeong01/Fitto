import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useAppStore } from '../store/useAppStore';
import { STEP_SOURCE, getAvailability, hasStepPermission, readDailySteps, requestStepPermission, type StepAvailability } from './steps';

/** 연결할 때는 한 달치, 평소엔 지난 일주일만 다시 읽는다(늦게 동기화된 걸음이 앞 날짜에 붙기도 한다). */
const FIRST_DAYS = 30;
const REFRESH_DAYS = 7;

export type ConnectResult = 'connected' | 'denied' | StepAvailability;

/** 걸음 연결(홈 걸음 카드·걸음 상세·설정에서 부른다). 권한을 묻고 한 달치를 가져온다. */
export async function connectSteps(): Promise<ConnectResult> {
  const availability = await getAvailability();
  if (availability !== 'available') return availability;
  if (!(await requestStepPermission())) return 'denied';
  const { applyDeviceSteps, setStepSource } = useAppStore.getState();
  setStepSource(STEP_SOURCE);
  applyDeviceSteps(await readDailySteps(FIRST_DAYS));
  return 'connected';
}

/** 지금 연결돼 있으면 지난 일주일을 다시 읽는다. 시스템 설정에서 권한을 거뒀으면 "연결 전"으로 되돌린다. */
export async function refreshSteps(): Promise<void> {
  const { stepSource, applyDeviceSteps, setStepSource } = useAppStore.getState();
  if (stepSource === 'none') return;
  try {
    if (!(await hasStepPermission())) {
      setStepSource('none');
      return;
    }
    applyDeviceSteps(await readDailySteps(REFRESH_DAYS));
  } catch {
    // 헬스 커넥트가 잠깐 응답하지 않는 경우가 있다. 다음에 앱을 열 때 다시 읽으면 된다.
  }
}

/**
 * 걸음 새로 읽기를 언제 할지. App에서 한 번만 부른다(동기화·알림 runner와 같은 자리).
 * 앱을 켤 때와 다시 앞으로 나올 때. 헬스 커넥트는 변화를 밀어주지 않아서 열 때마다 묻는다.
 */
export function useStepRunner(): void {
  useEffect(() => {
    refreshSteps();
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') refreshSteps();
    });
    return () => sub.remove();
  }, []);
}
