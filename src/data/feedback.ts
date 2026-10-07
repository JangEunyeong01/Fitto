import { Platform } from 'react-native';

/**
 * 설정 > 의견 보내기. 비공개 테스트 동안 구글 폼으로 받는다(무료, 서버 일 없음).
 *
 * - formUrl: 폼의 응답 링크(…/viewform). 비어 있으면 설정에 줄을 아예 안 보인다 — 눌러도 아무 일 없는 줄은 고장처럼 보인다.
 * - envEntry: 폼에 "앱 정보" 단답형 질문을 만들고 "미리 채운 링크 받기"로 얻은 번호(예: 'entry.123456789').
 *   버전·OS를 미리 채워 두면 테스터가 적지 않아도 어느 빌드에서 난 버그인지 안다.
 */
export const FEEDBACK = { formUrl: '', envEntry: '' };

/** 앱 버전·OS·계정 여부. 사람을 알아볼 수 있는 값은 넣지 않는다. */
export function feedbackEnv(appVersion: string, signedIn: boolean): string {
  return `피또 ${appVersion} · ${Platform.OS} ${Platform.Version} · ${signedIn ? '계정' : '게스트'}`;
}

/** 열 주소. 폼 주소가 없으면 null. */
export function feedbackUrl(env: string): string | null {
  if (!FEEDBACK.formUrl) return null;
  if (!FEEDBACK.envEntry) return FEEDBACK.formUrl;
  const sep = FEEDBACK.formUrl.includes('?') ? '&' : '?';
  return `${FEEDBACK.formUrl}${sep}usp=pp_url&${FEEDBACK.envEntry}=${encodeURIComponent(env)}`;
}
