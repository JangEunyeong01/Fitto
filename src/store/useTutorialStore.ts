import { create } from 'zustand';

export interface TargetRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * 각 단계가 가리키는 홈 화면 요소. HomeScreen에서 measureInWindow로 좌표를 등록한다.
 * settingsTab은 탭바의 설정 칸(TabBar에서 잰다) — "카드 순서" 단계가 가리킨다. 예전엔 첫 카드를 가리켰는데
 * 그게 2단계와 같은 칼로리 카드라 무엇을 알려주는지 구분이 안 됐다.
 */
export type TutorialTargetId = 'hero' | 'kcal' | 'water' | 'steps' | 'settingsTab';

export const TUTORIAL_STEPS: { target: TutorialTargetId; title: string; body: string }[] = [
  {
    target: 'hero',
    title: '피또가 먼저 인사해요',
    body: '시간대와 오늘 기록에 맞춰 한마디를 건네요. 기록이 쌓일수록 말이 달라져요.',
  },
  {
    target: 'kcal',
    title: '칼로리는 숫자보다 표정으로',
    body: '피또 얼굴이 5단계로 오늘 상태를 알려줘요. 숫자는 그 다음에 보면 돼요.',
  },
  {
    target: 'water',
    title: '물은 손끝으로',
    body: '컵을 위아래로 끌거나 −/+ 버튼으로 마신 만큼 기록해요. 목표에 가까워지면 피또가 촉촉해져요.',
  },
  {
    target: 'steps',
    title: '자세히 보고 싶을 땐 상세로',
    body: '카드의 상세를 누르면 일·주·월로 기간을 바꿔 보고 목표도 여기서 고쳐요.',
  },
  {
    target: 'settingsTab',
    title: '홈 카드는 원하는 순서로',
    body: '아무 카드나 길게 누르면 순서를 바꾸고 숨길 수 있어요. 설정 › 홈 카드 순서에서도 바꿀 수 있어요.',
  },
];

interface TutorialState {
  open: boolean;
  step: number;
  targets: Partial<Record<TutorialTargetId, TargetRect>>;
  start: () => void;
  next: () => void;
  close: () => void;
  setTarget: (id: TutorialTargetId, rect: TargetRect) => void;
}

export const useTutorialStore = create<TutorialState>((set, get) => ({
  open: false,
  step: 0,
  targets: {},
  start: () => set({ open: true, step: 0 }),
  next: () => {
    const { step } = get();
    if (step >= TUTORIAL_STEPS.length - 1) set({ open: false, step: 0 });
    else set({ step: step + 1 });
  },
  close: () => set({ open: false, step: 0 }),
  setTarget: (id, rect) => set((s) => ({ targets: { ...s.targets, [id]: rect } })),
}));
