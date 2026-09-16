/**
 * 내장 음식 데이터 (README 4장). 구현 시 공공데이터포털 식품영양성분 API로 대체한다.
 * tags는 온보딩에서 받은 "못 먹는 음식" 코드(constants/codes.ts의 AVOID_TAGS)와 대조한다.
 */
export interface Food {
  id: string;
  name: string;
  amount: string;
  kcal: number;
  tags: string[];
  note?: string;
}

export const FOODS: Food[] = [
  { id: 'f1', name: '닭가슴살 구이', amount: '100g', kcal: 165, tags: [], note: '단백질 31g' },
  { id: 'f2', name: '현미밥', amount: '1공기 210g', kcal: 310, tags: [] },
  { id: 'f3', name: '그릭요거트', amount: '150g', kcal: 130, tags: ['dairy'] },
  { id: 'f4', name: '아몬드 한 줌', amount: '25g', kcal: 145, tags: ['nuts'] },
  { id: 'f5', name: '땅콩버터 토스트', amount: '1장', kcal: 290, tags: ['nuts', 'gluten'] },
  { id: 'f6', name: '연어 샐러드', amount: '1인분', kcal: 340, tags: ['seafood'] },
  { id: 'f7', name: '두부조림', amount: '150g', kcal: 180, tags: ['soy'] },
];

/** 퍼스널 추천 식단 (README 예시 3종). 썸네일은 실제 음식 사진으로 교체 대상. */
export const RECOMMENDED_MEALS: Food[] = [
  { id: 'r1', name: '연어 포케볼', amount: '1인분', kcal: 480, tags: ['seafood'] },
  { id: 'r2', name: '두부 유부초밥', amount: '1인분', kcal: 420, tags: ['soy'] },
  { id: 'r3', name: '단호박 수프', amount: '1인분', kcal: 260, tags: [] },
];

/** 사용자의 못 먹는 음식 목록에 걸리는지. 걸리는 태그 코드를 돌려준다(화면에는 labelOf로 라벨을 붙인다). */
export function findAllergyHit(food: Food, avoid: string[]): string | null {
  return food.tags.find((t) => avoid.includes(t)) ?? null;
}

/**
 * amount 문자열("1공기 210g", "150g")에서 1회 제공량 그램 수를 뽑는다.
 * "1인분"·"1장"처럼 그램 정보가 없으면 null — 이런 음식은 g 단위 입력을 막는다.
 * ponytail: 문자열 파싱. 식품영양성분 API로 바꾸면 servingGrams 필드를 그대로 쓴다.
 */
export function gramsPerServing(food: Food): number | null {
  const m = food.amount.match(/(\d+(?:\.\d+)?)\s*g\b/);
  return m ? Number(m[1]) : null;
}
