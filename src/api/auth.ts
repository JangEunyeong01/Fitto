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

export function signup(params: {
  email: string;
  password: string;
  profile: SignupProfile;
  /** 게스트로 앱을 처음 쓴 시각. 가입했다고 "함께한 지 1일"로 돌아가지 않게 넘긴다(F-008). */
  startedAt?: string;
}): Promise<AuthResult> {
  return request<AuthResult>('/auth/signup', { method: 'POST', body: params });
}

export function login(email: string, password: string): Promise<AuthResult> {
  return request<AuthResult>('/auth/login', { method: 'POST', body: { email, password } });
}

export function refresh(refreshToken: string): Promise<AuthTokens> {
  return request<AuthTokens>('/auth/refresh', { method: 'POST', body: { refreshToken } });
}

export function logout(refreshToken: string): Promise<void> {
  return request<void>('/auth/logout', { method: 'POST', body: { refreshToken } });
}

/** 게스트로 쌓은 기기 기록을 계정으로 옮긴다(명세 6장). */
export function importGuestData(payload: ImportPayload, token: string): Promise<ImportResult> {
  return request<ImportResult>('/me/import', { method: 'POST', body: payload, token });
}

export function getMe(token: string): Promise<User> {
  return request<User>('/users/me', { token });
}
