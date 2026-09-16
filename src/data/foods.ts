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
  /** 1회 제공량 기준 영양소. 질환별 주의 판정(utils/foodCaution.ts)에 쓴다. */
  sodium?: number;
  sugar?: number;
  fat?: number;
}

export const FOODS: Food[] = [
  { id: 'f1', name: '닭가슴살 구이', amount: '100g', kcal: 165, tags: [], note: '단백질 31g', sodium: 70, sugar: 0, fat: 3.6 },
  { id: 'f2', name: '현미밥', amount: '1공기 210g', kcal: 310, tags: [], sodium: 5, sugar: 0.5, fat: 2.4 },
  { id: 'f3', name: '그릭요거트', amount: '150g', kcal: 130, tags: ['dairy'], sodium: 55, sugar: 6, fat: 4 },
  { id: 'f4', name: '아몬드 한 줌', amount: '25g', kcal: 145, tags: ['nuts'], sodium: 0, sugar: 1, fat: 12.5 },
  { id: 'f5', name: '땅콩버터 토스트', amount: '1장', kcal: 290, tags: ['nuts', 'gluten'], sodium: 380, sugar: 6, fat: 16 },
  { id: 'f6', name: '연어 샐러드', amount: '1인분', kcal: 340, tags: ['seafood'], sodium: 620, sugar: 4, fat: 22 },
  { id: 'f7', name: '두부조림', amount: '150g', kcal: 180, tags: ['soy'], sodium: 540, sugar: 3, fat: 9 },
  { id: 'f8', name: '라면', amount: '1봉', kcal: 500, tags: ['gluten'], sodium: 1700, sugar: 4, fat: 16 },
  { id: 'f9', name: '초코 라떼', amount: '1잔 350ml', kcal: 280, tags: ['dairy'], sodium: 120, sugar: 32, fat: 8 },
  { id: 'f10', name: '곱창구이', amount: '1인분', kcal: 600, tags: [], sodium: 780, sugar: 2, fat: 40 },
];

/** 퍼스널 추천 식단. 썸네일은 실제 음식 사진으로 교체 대상. */
export const RECOMMENDED_MEALS: Food[] = [
  { id: 'r1', name: '연어 포케볼', amount: '1인분', kcal: 480, tags: ['seafood'], sodium: 520, sugar: 6, fat: 18 },
  { id: 'r2', name: '두부 유부초밥', amount: '1인분', kcal: 420, tags: ['soy'], sodium: 610, sugar: 9, fat: 12 },
  { id: 'r3', name: '단호박 수프', amount: '1인분', kcal: 260, tags: [], sodium: 180, sugar: 12, fat: 6 },
  { id: 'r4', name: '닭가슴살 샐러드', amount: '1인분', kcal: 380, tags: [], sodium: 240, sugar: 4, fat: 9 },
  { id: 'r5', name: '소고기 미역국 백반', amount: '1인분', kcal: 520, tags: ['soy'], sodium: 880, sugar: 3, fat: 14 },
  { id: 'r6', name: '그릭요거트 볼', amount: '1인분', kcal: 320, tags: ['dairy'], sodium: 60, sugar: 18, fat: 8 },
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
