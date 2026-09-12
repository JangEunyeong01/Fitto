import { create } from 'zustand';

// 운동 추가 시트(명세 F-034). 헬스 탭·빠른 기록 어디서든 열 수 있게 앱 루트에 하나만 둔다.
interface ExerciseSheetState {
  open: boolean;
  show: () => void;
  hide: () => void;
}

export const useExerciseSheetStore = create<ExerciseSheetState>((set) => ({
  open: false,
  show: () => set({ open: true }),
  hide: () => set({ open: false }),
}));
