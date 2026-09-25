import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { tokenStorage } from './tokenStorage';

/**
 * 로그인 상태(명세 3-1).
 *
 * guest  — 계정 없이 기기에 저장하며 쓰는 상태. 앱의 모든 기능을 쓸 수 있다
 * member — 로그인해서 서버와 동기화하는 상태
 *
 * 앱 데이터(useAppStore)와 저장소를 나눈 이유는 로그아웃 때문이다.
 * 로그아웃은 토큰만 지우면 되는데, 한 저장소에 두면 기록까지 건드릴 위험이 생긴다.
 *
 * 토큰은 앱 데이터와 다른 저장소에 둔다(tokenStorage). 네이티브에서는 OS 보안 저장소를 쓴다.
 */
export type AuthStatus = 'guest' | 'member';

interface AuthState {
  status: AuthStatus;
  accessToken: string | null;
  refreshToken: string | null;
  /** 로그인한 계정 이메일. 설정 화면에 보여준다. */
  email: string | null;
  /**
   * 이메일로 받은 코드를 맞혔는지(명세 5-4). 오타 난 주소로 가입했으면 비밀번호를 찾을 수 없어서 알려준다.
   * null(또는 예전에 저장된 상태라 값이 없음)은 "아직 모름" — 서버에서 받아오기 전에는 경고를 띄우지 않는다.
   */
  emailVerified: boolean | null;
  /**
   * 사용자가 로그아웃한 게 아니라 토큰이 만료·폐기돼 로그인이 풀린 상태.
   * 알려주지 않으면 기록이 서버에 안 올라가는 걸 한참 뒤에야 알게 된다.
   */
  sessionExpired: boolean;
  signIn: (params: { accessToken: string; refreshToken: string; email: string; emailVerified: boolean }) => void;
  setEmailVerified: (v: boolean) => void;
  updateTokens: (params: { accessToken: string; refreshToken: string }) => void;
  signOut: () => void;
  /** 갱신이 거절돼 로그인이 풀렸을 때. 로그아웃과 달리 사용자에게 알린다. */
  expireSession: () => void;
  dismissSessionExpired: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      status: 'guest',
      accessToken: null,
      refreshToken: null,
      email: null,
      emailVerified: null,
      sessionExpired: false,

      signIn: ({ accessToken, refreshToken, email, emailVerified }) =>
        set({ status: 'member', accessToken, refreshToken, email, emailVerified, sessionExpired: false }),

      setEmailVerified: (v) => set({ emailVerified: v }),

      // 토큰 갱신(명세 0-4). 갱신할 때마다 새 refreshToken으로 바꿔야 한다 —
      // 서버가 쓴 토큰을 사용 처리하므로 예전 것을 들고 있으면 다음 갱신이 막힌다.
      updateTokens: ({ accessToken, refreshToken }) => set({ accessToken, refreshToken }),

      signOut: () =>
        set({
          status: 'guest',
          accessToken: null,
          refreshToken: null,
          email: null,
          emailVerified: null,
          sessionExpired: false,
        }),

      // 기기 기록은 건드리지 않는다. 다시 로그인하면 대기열이 그대로 이어서 올라간다.
      expireSession: () =>
        set({ status: 'guest', accessToken: null, refreshToken: null, sessionExpired: true }),

      dismissSessionExpired: () => set({ sessionExpired: false }),
    }),
    {
      name: 'fitto-auth-storage',
      storage: createJSONStorage(() => tokenStorage),
      version: 1,
    }
  )
);
