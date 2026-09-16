// README "1. 온보딩" 표의 확정 문구.
// 성별·활동량·목표·태그 선택지는 저장 코드와 함께 constants/codes.ts에 있다.
import type { Persona } from '../../store/useAppStore';

export const PERSONA_OPTIONS: { key: Persona; label: string; desc: string }[] = [
  { key: 'friendly', label: '친근형', desc: '오늘도 같이 운동해볼까요? 💪' },
  { key: 'strict', label: '엄격형', desc: '오늘 목표 달성하셨나요?' },
  { key: 'neutral', label: '차분형', desc: '오늘 칼로리를 확인하세요.' },
];

export const STEP_LABELS = [
  'FITTO',
  'STEP 1 · 기본 정보',
  'STEP 2 · 활동량',
  'STEP 3 · 목표',
  'STEP 4 · 건강 상태',
  'STEP 5 · 식단 취향',
  'STEP 6 · 못 먹는 음식',
  'STEP 7 · 피또 성격',
  '완료',
];

export const TOTAL_STEPS = 9;
