import { request } from './client';
import type { AuthTokens, ImportPayload, ImportResult, User } from './types';

/**
 * 인증 API (명세 4장). 이 네 개만 토큰 없이 부를 수 있다.
 * 화면은 이 함수들을 쓰고 fetch를 직접 부르지 않는다.
 */

export interface SignupProfile {
  name: string;
  gender: string | null;
  age: number | null;
  height: number | null;
  weight: number | null;
  targetWeight: number | null;
  activityLevel: string | null;
  goal: string | null;
  diseases: string[];
  customDiseases: string[];
  preferredFoods: string[];
  customPreferredFoods: string[];
  allergies: string[];
  customAllergies: string[];
  personality: string;
}

export interface AuthResult extends AuthTokens {
  user: User;
}

/**
 * 로그인·가입은 사용자가 화면 앞에서 기다리는 요청이다.
 *
 * 운영 서버(무료 요금제)는 15분 쉬면 잠들고 깨는 데 1분 30초쯤 걸린다.
 * iOS가 요청을 60초에서 끊어버리므로 첫 시도는 거의 실패하는데, 그 시도가 서버를 깨워둔다.
 * 그래서 두 번 더 보낸다. 나머지 API는 기록 동기화라 대기열이 알아서 다시 보내므로 필요 없다.
 */
const WAKE_OPTIONS = { timeoutMs: 55_000, wakeRetries: 2 } as const;

export function signup(params: {
  email: string;
  password: string;
  profile: SignupProfile;
  /** 게스트로 앱을 처음 쓴 시각. 가입했다고 "함께한 지 1일"로 돌아가지 않게 넘긴다(F-008). */
  startedAt?: string;
}): Promise<AuthResult> {
  return request<AuthResult>('/auth/signup', { method: 'POST', body: params, ...WAKE_OPTIONS });
}

export function login(email: string, password: string): Promise<AuthResult> {
  return request<AuthResult>('/auth/login', { method: 'POST', body: { email, password }, ...WAKE_OPTIONS });
}

export function refresh(refreshToken: string): Promise<AuthTokens> {
  return request<AuthTokens>('/auth/refresh', { method: 'POST', body: { refreshToken } });
}

export function logout(refreshToken: string): Promise<void> {
  return request<void>('/auth/logout', { method: 'POST', body: { refreshToken } });
}

/**
 * 비밀번호 변경(명세 5장). 바꾸면 다른 기기는 로그아웃되고, 이 기기가 쓸 새 토큰이 돌아온다.
 * 돌려받은 토큰을 저장하지 않으면 이 기기까지 로그아웃된다.
 */
export function changePassword(
  params: { currentPassword: string; newPassword: string },
  token: string
): Promise<AuthTokens> {
  return request<AuthTokens>('/users/me/password', { method: 'PATCH', body: params, token, ...WAKE_OPTIONS });
}

/** 탈퇴(명세 5장). 서버의 기록이 모두 지워진다. 되돌릴 수 없다. */
export function deleteAccount(password: string, token: string): Promise<void> {
  return request<void>('/users/me', { method: 'DELETE', body: { password }, token, ...WAKE_OPTIONS });
}

/** 게스트로 쌓은 기기 기록을 계정으로 옮긴다(명세 6장). */
export function importGuestData(payload: ImportPayload, token: string): Promise<ImportResult> {
  return request<ImportResult>('/me/import', { method: 'POST', body: payload, token });
}

export function getMe(token: string): Promise<User> {
  return request<User>('/users/me', { token });
}
