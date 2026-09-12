import { create } from 'zustand';
import type { MealSlot } from './useAppStore';

interface FoodSearchState {
  open: boolean;
  /** 기록할 날짜(dateKey). null이면 오늘. 식단 탭에서 지난 날짜를 보고 있을 때 그 날에 넣으려고 받는다. */
  date: string | null;
  /** 끼니 카드의 +로 열었을 때 그 끼니. null이면 시트가 지금 시각에 맞는 끼니를 골라 둔다. */
  slot: MealSlot | null;
  /** 최근 기록한 음식 이름(명세 F-024: 최근 10개, 중복 제거). 앱을 껐다 켜면 사라지는 세션 상태. */
  recent: string[];
  show: (opts?: { date?: string; slot?: MealSlot }) => void;
  hide: () => void;
  addRecent: (keyword: string) => void;
}

const MAX_RECENT = 10;

export const useFoodSearchStore = create<FoodSearchState>((set) => ({
  open: false,
  date: null,
  slot: null,
  recent: [],
  show: (opts) => set({ open: true, date: opts?.date ?? null, slot: opts?.slot ?? null }),
  hide: () => set({ open: false }),
  addRecent: (keyword) =>
    set((s) => {
      const k = keyword.trim();
      if (!k) return {};
      return { recent: [k, ...s.recent.filter((r) => r !== k)].slice(0, MAX_RECENT) };
    }),
}));
