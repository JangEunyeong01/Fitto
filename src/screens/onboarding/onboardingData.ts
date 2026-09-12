// README "1. 온보딩" 표의 확정 문구. 라벨은 계산식 키(utils/goals.ts)와 그대로 맞물린다.
import type { Persona } from '../../store/useAppStore';

// BMR 공식이 생물학적 성별 두 가지만 구분해서 선택지도 둘만 둔다(명세 F-002).
export const GENDERS = ['여성', '남성'] as const;

export const ACTIVITY_OPTIONS = [
  { label: '거의 안 움직여요', desc: '종일 앉아서 생활' },
  { label: '가볍게 움직여요', desc: '주 1~2회 가벼운 운동' },
  { label: '보통이에요', desc: '주 3~4회 운동' },
  { label: '많이 움직여요', desc: '주 5회 이상 운동' },
  { label: '매우 활동적이에요', desc: '육체 노동 · 매일 운동' },
];

export const GOAL_OPTIONS = [
  { label: '체중 감량', desc: '천천히, 무리 없이' },
  { label: '체중 증가', desc: '건강하게 늘리기' },
  { label: '체중 유지', desc: '지금 상태를 지키기' },
  { label: '건강 관리', desc: '질환·컨디션 관리' },
  { label: '근력 강화', desc: '단백질 중심 식단' },
  { label: '체력 증진', desc: '지구력·활동량 늘리기' },
];

export const HEALTH_TAGS = ['당뇨', '고혈압', '고지혈증', '관절염', '위염', '빈혈', '통풍', '갑상선'];

export const TASTE_TAGS = ['한식', '양식', '일식', '중식', '분식', '샐러드', '채식', '아시안', '베이커리'];

export const AVOID_TAGS = [
  '견과류',
  '유제품',
  '해산물',
  '갑각류',
  '달걀',
  '밀(글루텐)',
  '대두',
  '복숭아',
  '매운 음식',
  '돼지고기',
];

export const PERSONA_OPTIONS: { key: Persona; label: string; desc: string }[] = [
  { key: 'friendly', label: '친근형', desc: '오늘도 같이 운동해볼까요? 💪' },
  { key: 'strict', label: '엄격형', desc: '오늘 목표 달성하셨나요?' },
  { key: 'neutral', label: '중립형', desc: '오늘 칼로리를 확인하세요.' },
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
