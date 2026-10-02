import { Platform, Linking } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import type * as HealthConnectModule from 'react-native-health-connect';
import { Pedometer } from 'expo-sensors';
import type { StepSource } from '../store/useAppStore';
import { addDays, toDateKey } from '../utils/periodCycle';

/**
 * 폰 건강 데이터에서 날짜별 걸음 읽기.
 *
 * - 안드로이드: 헬스 커넥트. 삼성 헬스·구글 핏 걸음이 여기 모인다. 하루씩 **합계(aggregate)**로 묻는다 —
 *   기록을 하나씩 읽어 더하면 두 앱이 같은 걸음을 각자 올린 경우 두 번 센다. 합계는 헬스 커넥트가 겹침을 빼준다.
 * - iOS: 기기 만보계(CoreMotion). 지난 7일까지만 읽힌다. 걸음을 세는 칩이 없는 아이패드는 "사용할 수 없음".
 * - 안드로이드 기본 만보계는 앱이 켜져 있는 동안만 세고 지난 기록을 못 읽어서 쓰지 않는다.
 *
 * 헬스 커넥트 모듈은 Expo Go에 없어서 import 대신 필요할 때만 require한다(알림과 같은 이유).
 */

export type StepAvailability = 'available' | 'needs-install' | 'unsupported';

const IN_EXPO_GO = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// eslint-disable-next-line @typescript-eslint/no-require-imports
const HC: typeof HealthConnectModule | null =
  Platform.OS === 'android' && !IN_EXPO_GO ? require('react-native-health-connect') : null;

export const STEP_SOURCE: StepSource = Platform.OS === 'android' ? 'health-connect' : Platform.OS === 'ios' ? 'pedometer' : 'none';

/** 이 기기에서 걸음을 읽을 수 있는지. */
export async function getAvailability(): Promise<StepAvailability> {
  if (Platform.OS === 'android') {
    if (!HC) return 'unsupported';
    const status = await HC.getSdkStatus();
    if (status === HC.SdkAvailabilityStatus.SDK_AVAILABLE) return 'available';
    // 안드로이드 9 미만은 헬스 커넥트를 못 쓴다. 그 위인데 없거나 업데이트가 필요하면 플레이스토어로 보낸다.
    if (typeof Platform.Version === 'number' && Platform.Version < 28) return 'unsupported';
    return 'needs-install';
  }
  if (Platform.OS === 'ios') {
    return (await Pedometer.isAvailableAsync()) ? 'available' : 'unsupported';
  }
  return 'unsupported';
}

/** 헬스 커넥트 설정 화면(어느 앱이 무엇을 보내는지 보는 곳). 안드로이드 전용. */
export const openHealthConnect = () => HC?.openHealthConnectSettings();

/** 걸음이 하나도 안 들어올 때 무엇을 켜면 되는지. 플랫폼마다 다르다. */
export const EMPTY_SOURCE_HINT =
  Platform.OS === 'android'
    ? '헬스 커넥트에 걸음이 아직 없어요. 삼성 헬스 › 설정 › 헬스 커넥트에서 걸음 보내기를 켜고, 삼성 헬스를 한 번 열어 주세요.'
    : '최근 7일 걸음이 없어요. 설정 › 개인정보 보호 › 동작 및 피트니스에서 피또를 허용했는지 확인해 주세요.';

export const openInstallPage = () =>
  Linking.openURL('market://details?id=com.google.android.apps.healthdata').catch(() =>
    Linking.openURL('https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata'),
  );

/** 걸음 읽기 권한을 묻는다. 허용했으면 true. */
export async function requestStepPermission(): Promise<boolean> {
  if (Platform.OS === 'android' && HC) {
    await HC.initialize();
    const granted = await HC.requestPermission([{ accessType: 'read', recordType: 'Steps' }]);
    return granted.some((p) => 'recordType' in p && p.recordType === 'Steps');
  }
  if (Platform.OS === 'ios') {
    const { granted } = await Pedometer.requestPermissionsAsync();
    return granted;
  }
  return false;
}

/** 권한이 아직 살아 있는지. 사용자가 시스템 설정에서 끌 수 있어서 읽기 전에 본다. */
export async function hasStepPermission(): Promise<boolean> {
  if (Platform.OS === 'android' && HC) {
    await HC.initialize();
    const granted = await HC.getGrantedPermissions();
    return granted.some((p) => 'recordType' in p && p.recordType === 'Steps');
  }
  if (Platform.OS === 'ios') {
    return (await Pedometer.getPermissionsAsync()).granted;
  }
  return false;
}

/** 시스템 쪽 연결 끊기. 안드로이드는 헬스 커넥트 권한을 거둔다. iOS는 앱이 권한을 거둘 수 없어 설정으로 보낸다. */
export async function disconnectSteps(): Promise<void> {
  if (Platform.OS === 'android' && HC) {
    await HC.initialize();
    await HC.revokeAllPermissions();
  }
}

/**
 * 오늘을 포함해 지난 days일의 날짜 구간. 자정~다음 자정(기기 시간대).
 * 끝은 다음 날 0시로 둔다 — 23:59:59로 끝내면 마지막 1초에 걸은 걸음이 빠진다.
 */
export function dayRanges(today: Date, days: number): { day: string; start: Date; end: Date }[] {
  const todayKey = toDateKey(today);
  const out: { day: string; start: Date; end: Date }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = addDays(todayKey, -i);
    const [y, m, d] = day.split('-').map(Number);
    out.push({ day, start: new Date(y, m - 1, d), end: new Date(y, m - 1, d + 1) });
  }
  return out;
}

/**
 * 개발 빌드 진단: 오늘 걸음이 0일 때 "헬스 커넥트에 걸음이 없는 것"과 "피또가 못 읽는 것"을 가른다.
 * 합계·원본 기록 수·어느 앱이 썼는지(dataOrigins)·받은 권한을 Metro 터미널에 찍는다.
 */
async function logStepDiagnostics(today: { day: string; start: Date; end: Date }): Promise<void> {
  if (!HC) return;
  try {
    const filter = { operator: 'between' as const, startTime: today.start.toISOString(), endTime: today.end.toISOString() };
    const agg = await HC.aggregateRecord({ recordType: 'Steps', timeRangeFilter: filter });
    const raw = await HC.readRecords('Steps', { timeRangeFilter: filter });
    const granted = await HC.getGrantedPermissions();
    console.log('[걸음 진단]', JSON.stringify({
      day: today.day,
      range: [filter.startTime, filter.endTime],
      aggregateTotal: agg.COUNT_TOTAL,
      aggregateOrigins: agg.dataOrigins,
      rawCount: raw.records.length,
      rawSum: raw.records.reduce((a, r) => a + r.count, 0),
      rawOrigins: [...new Set(raw.records.map((r) => r.metadata?.dataOrigin))],
      granted,
    }));
  } catch (e) {
    console.log('[걸음 진단] 실패', String(e));
  }
}

/** 지난 days일(오늘 포함)의 날짜별 걸음. 읽을 수 없는 날은 결과에서 빠진다. */
export async function readDailySteps(days: number): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  const ranges = dayRanges(new Date(), days);

  if (Platform.OS === 'android' && HC) {
    await HC.initialize();
    for (const r of ranges) {
      const res = await HC.aggregateRecord({
        recordType: 'Steps',
        timeRangeFilter: { operator: 'between', startTime: r.start.toISOString(), endTime: r.end.toISOString() },
      });
      out[r.day] = res.COUNT_TOTAL ?? 0;
    }
    if (__DEV__) await logStepDiagnostics(ranges[ranges.length - 1]);
    return out;
  }

  if (Platform.OS === 'ios') {
    // CoreMotion은 지난 7일까지만 준다. 그보다 앞은 묻지 않는다.
    const now = new Date();
    for (const r of ranges.slice(-7)) {
      const { steps } = await Pedometer.getStepCountAsync(r.start, r.end > now ? now : r.end);
      out[r.day] = steps;
    }
  }
  return out;
}
