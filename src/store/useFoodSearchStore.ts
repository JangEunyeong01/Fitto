import { create } from 'zustand';

interface FoodSearchState {
  open: boolean;
  /** 기록할 날짜(dateKey). null이면 오늘. 식단 탭에서 지난 날짜를 보고 있을 때 그 날에 넣으려고 받는다. */
  date: string | null;
  /** 최근 검색어. 앱을 껐다 켜면 사라지는 세션 상태로 둔다. */
  recent: string[];
  show: (date?: string) => void;
  hide: () => void;
  addRecent: (keyword: string) => void;
}

const MAX_RECENT = 6;

export const useFoodSearchStore = create<FoodSearchState>((set) => ({
  open: false,
  date: null,
  recent: [],
  show: (date) => set({ open: true, date: date ?? null }),
  hide: () => set({ open: false }),
  addRecent: (keyword) =>
    set((s) => {
      const k = keyword.trim();
      if (!k) return {};
      return { recent: [k, ...s.recent.filter((r) => r !== k)].slice(0, MAX_RECENT) };
    }),
}));
