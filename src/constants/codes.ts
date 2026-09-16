/**
 * 화면에 보이는 한글 라벨과 저장에 쓰는 코드를 한 곳에서 묶어둔다 (API 명세 v1.1 "1. 코드값").
 * 라벨을 그대로 저장하면 문구를 다듬는 순간 기존 기록이 전부 어긋나고, 서버에 보낼 때도 매번 변환해야 한다.
 */

export interface TagOption {
  code: string;
  label: string;
}

export const GENDERS = [
  { code: 'female', label: '여성' },
  { code: 'male', label: '남성' },
] as const;
export type GenderCode = (typeof GENDERS)[number]['code'];

/**
 * 칼로리 계수는 TDEE 계산용, 물 계수는 물 목표용이다(utils/goals.ts).
 * 계수를 값으로 저장하면 나중에 계수를 손볼 때 저장된 프로필이 전부 어긋나서 코드로만 저장한다.
 */
export const ACTIVITY_OPTIONS = [
  { code: 'sedentary', label: '거의 안 움직여요', desc: '종일 앉아서 생활', factor: 1.2, waterFactor: 1.0 },
  { code: 'light', label: '가볍게 움직여요', desc: '주 1~2회 가벼운 운동', factor: 1.375, waterFactor: 1.1 },
  { code: 'moderate', label: '보통이에요', desc: '주 3~4회 운동', factor: 1.55, waterFactor: 1.2 },
  { code: 'active', label: '많이 움직여요', desc: '주 5회 이상 운동', factor: 1.725, waterFactor: 1.3 },
  { code: 'very_active', label: '매우 활동적이에요', desc: '육체 노동 · 매일 운동', factor: 1.9, waterFactor: 1.4 },
] as const;
export type ActivityCode = (typeof ACTIVITY_OPTIONS)[number]['code'];

export const GOAL_OPTIONS = [
  { code: 'lose_weight', label: '체중 감량', desc: '천천히, 무리 없이', adjust: -350 },
  { code: 'gain_weight', label: '체중 증가', desc: '건강하게 늘리기', adjust: 350 },
  { code: 'maintain', label: '체중 유지', desc: '지금 상태를 지키기', adjust: 0 },
  { code: 'health', label: '건강 관리', desc: '질환·컨디션 관리', adjust: 0 },
  { code: 'strength', label: '근력 강화', desc: '단백질 중심 식단', adjust: 200 },
  { code: 'endurance', label: '체력 증진', desc: '지구력·활동량 늘리기', adjust: 100 },
] as const;
export type GoalCode = (typeof GOAL_OPTIONS)[number]['code'];

export const DISEASE_TAGS: TagOption[] = [
  { code: 'diabetes', label: '당뇨' },
  { code: 'hypertension', label: '고혈압' },
  { code: 'hyperlipidemia', label: '고지혈증' },
  { code: 'arthritis', label: '관절염' },
  { code: 'gastritis', label: '위염' },
  { code: 'anemia', label: '빈혈' },
  { code: 'gout', label: '통풍' },
  { code: 'thyroid', label: '갑상선' },
];

export const TASTE_TAGS: TagOption[] = [
  { code: 'korean', label: '한식' },
  { code: 'western', label: '양식' },
  { code: 'japanese', label: '일식' },
  { code: 'chinese', label: '중식' },
  { code: 'bunsik', label: '분식' },
  { code: 'salad', label: '샐러드' },
  { code: 'vegetarian', label: '채식' },
  { code: 'asian', label: '아시안' },
  { code: 'bakery', label: '베이커리' },
];

/** 알레르기뿐 아니라 안 먹는 음식(매운 음식·돼지고기)도 같은 목록에서 고른다. */
export const AVOID_TAGS: TagOption[] = [
  { code: 'nuts', label: '견과류' },
  { code: 'dairy', label: '유제품' },
  { code: 'seafood', label: '해산물' },
  { code: 'shellfish', label: '갑각류' },
  { code: 'egg', label: '달걀' },
  { code: 'gluten', label: '밀(글루텐)' },
  { code: 'soy', label: '대두' },
  { code: 'peach', label: '복숭아' },
  { code: 'spicy', label: '매운 음식' },
  { code: 'pork', label: '돼지고기' },
];

/** 코드를 화면용 라벨로. 목록에 없는 코드(직접 입력한 값)는 그대로 보여준다. */
export function labelOf(options: readonly TagOption[], code: string | null | undefined): string {
  if (!code) return '';
  return options.find((o) => o.code === code)?.label ?? code;
}

export function labelsOf(options: readonly TagOption[], codes: string[]): string[] {
  return codes.map((c) => labelOf(options, c));
}

/** 라벨로 코드를 찾는다. 예전 버전이 라벨을 그대로 저장해둬서 마이그레이션에 쓴다. */
export function codeOfLabel(options: readonly TagOption[], label: string): string | null {
  return options.find((o) => o.label === label)?.code ?? null;
}
