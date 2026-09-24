import { Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';

/**
 * 폰 잠금으로 본인 확인. 화면 잠금이 이것만 쓴다.
 *
 * 앱 전용 비밀번호를 따로 두지 않았다. 폰에는 이미 지문·얼굴·PIN이 있고,
 * 여기서 비밀번호를 하나 더 만들면 사용자는 외울 게 늘고 우리는 그걸 안전하게 보관할 책임이 생긴다.
 * 지문·얼굴이 안 되면 OS가 알아서 폰 PIN 입력으로 넘겨준다(disableDeviceFallback: false).
 */

/** 웹 미리보기에는 생체 인증이 없다. 설정에서 줄을 보여주되 토글은 막는다. */
export const SCREEN_LOCK_SUPPORTED = Platform.OS !== 'web';

/** 폰에 잠금(PIN·패턴·지문·얼굴 중 하나라도)이 걸려 있는지. 없으면 확인할 방법이 없다. */
export async function hasDeviceLock(): Promise<boolean> {
  if (!SCREEN_LOCK_SUPPORTED) return false;
  const level = await LocalAuthentication.getEnrolledLevelAsync();
  return level !== LocalAuthentication.SecurityLevel.NONE;
}

export type OwnerCheck = 'ok' | 'failed' | 'no-device-lock';

/**
 * 예외를 밖으로 던지지 않는다. 잠금 화면이 이 결과만 보고 움직이는데,
 * 던지면 "인증 중" 표시가 풀리지 않아 잠금 풀기 버튼이 영영 반응하지 않는다.
 */
export async function confirmOwner(promptMessage: string): Promise<OwnerCheck> {
  try {
    if (!(await hasDeviceLock())) return 'no-device-lock';
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: '취소',
      fallbackLabel: '비밀번호 입력',
      disableDeviceFallback: false,
    });
    return result.success ? 'ok' : 'failed';
  } catch {
    return 'failed';
  }
}
