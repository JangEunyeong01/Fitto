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
  signIn: (params: { accessToken: string; refreshToken: string; email: string }) => void;
  updateTokens: (params: { accessToken: string; refreshToken: string }) => void;
  signOut: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      status: 'guest',
      accessToken: null,
      refreshToken: null,
      email: null,

      signIn: ({ accessToken, refreshToken, email }) =>
        set({ status: 'member', accessToken, refreshToken, email }),

      // 토큰 갱신(명세 0-4). 갱신할 때마다 새 refreshToken으로 바꿔야 한다 —
      // 서버가 쓴 토큰을 사용 처리하므로 예전 것을 들고 있으면 다음 갱신이 막힌다.
      updateTokens: ({ accessToken, refreshToken }) => set({ accessToken, refreshToken }),

      signOut: () => set({ status: 'guest', accessToken: null, refreshToken: null, email: null }),
    }),
    {
      name: 'fitto-auth-storage',
      storage: createJSONStorage(() => tokenStorage),
      version: 1,
    }
  )
);
