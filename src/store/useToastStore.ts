import { create } from 'zustand';

/** 토스트 오른쪽 글씨 버튼. 되돌릴 수 있는 기록·삭제에만 단다("실행 취소"). */
export interface ToastAction {
  label: string;
  onPress: () => void;
}

interface ToastState {
  message: string | null;
  action: ToastAction | null;
  seq: number;
  show: (message: string, action?: ToastAction) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  message: null,
  action: null,
  seq: 0,
  show: (message, action) => set((s) => ({ message, action: action ?? null, seq: s.seq + 1 })),
}));
