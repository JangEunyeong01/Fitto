import { create } from 'zustand';

// 운동 추가 시트(명세 F-034). 헬스 탭·빠른 기록 어디서든 열 수 있게 앱 루트에 하나만 둔다.
interface ExerciseSheetState {
  open: boolean;
  /** 기록할 날짜(dateKey). null이면 오늘. 헬스 탭에서 지난 날짜를 보고 있을 때 그 날에 넣으려고 받는다. */
  date: string | null;
  show: (date?: string) => void;
  hide: () => void;
}

export const useExerciseSheetStore = create<ExerciseSheetState>((set) => ({
  open: false,
  date: null,
  show: (date) => set({ open: true, date: date ?? null }),
  hide: () => set({ open: false }),
}));
