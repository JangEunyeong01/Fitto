import { create } from 'zustand';

/**
 * 약관 다시 동의 시트(전역). 앱을 열 때·로그인 직후 useTermsRunner가 열고, 설정 > 약관 및 정책에서도 연다.
 * upcoming은 서버가 알려준 "곧 시행될 버전" — 홈의 미리 알림 줄이 쓴다. 저장하지 않는다(열 때마다 다시 받는다).
 */
interface ReconsentState {
  open: boolean;
  upcoming: string | null;
  show: () => void;
  hide: () => void;
  setUpcoming: (v: string | null) => void;
}

export const useReconsentStore = create<ReconsentState>((set) => ({
  open: false,
  upcoming: null,
  show: () => set({ open: true }),
  hide: () => set({ open: false }),
  setUpcoming: (v) => set({ upcoming: v }),
}));
