import { request, wakeServer } from './client';
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
 * 사용자가 화면 앞에서 기다리는 요청은 잠든 서버를 먼저 깨우고 보낸다.
 *
 * 운영 서버(무료 요금제)는 15분 쉬면 잠들고 깨는 데 1분 30초쯤 걸린다. 그동안 보낸 요청은
 * 응답을 못 받지만 서버는 깨어난 뒤 그 요청을 처리한다 — 그래서 **같은 요청을 다시 보내면 안 된다.**
 * 가입을 다시 보내면 방금 만든 계정 때문에 409가 오고, 비밀번호 변경은 이미 바뀐 비밀번호로 검사해 실패한다.
 *
 * 대신 아무 일도 하지 않는 /health로 깨운 뒤 본 요청을 한 번만 보낸다.
 * 기록 동기화는 대기열이 알아서 다시 보내므로 이 과정이 필요 없다.
 */
async function awake<T>(run: () => Promise<T>): Promise<T> {
  await wakeServer();
  return run();
}

export function signup(params: {
  email: string;
  password: string;
  profile: SignupProfile;
  /** 게스트로 앱을 처음 쓴 시각. 가입했다고 "함께한 지 1일"로 돌아가지 않게 넘긴다(F-008). */
  startedAt?: string;
}): Promise<AuthResult> {
  return awake(() => request<AuthResult>('/auth/signup', { method: 'POST', body: params }));
}

export function login(email: string, password: string): Promise<AuthResult> {
  return awake(() => request<AuthResult>('/auth/login', { method: 'POST', body: { email, password } }));
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
  return awake(() => request<AuthTokens>('/users/me/password', { method: 'PATCH', body: params, token }));
}

/** 탈퇴(명세 5장). 서버의 기록이 모두 지워진다. 되돌릴 수 없다. */
export function deleteAccount(password: string, token: string): Promise<void> {
  return awake(() => request<void>('/users/me', { method: 'DELETE', body: { password }, token }));
}

/** 게스트로 쌓은 기기 기록을 계정으로 옮긴다(명세 6장). */
export function importGuestData(payload: ImportPayload, token: string): Promise<ImportResult> {
  return request<ImportResult>('/me/import', { method: 'POST', body: payload, token });
}

export function getMe(token: string): Promise<User> {
  return request<User>('/users/me', { token });
}
