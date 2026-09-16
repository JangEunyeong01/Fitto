import type { Food } from '../data/foods';

/**
 * 질환별 주의 음식 판정 (명세 F-023·F-026).
 * 기준은 1회 제공량이고, 공공 API를 붙여도 같은 규칙을 그대로 쓴다(API 명세 v1.1의 cautions).
 * 의학 기준이 아니라 "한 끼에 이 정도면 많다" 수준의 초안값이다.
 */
const THRESHOLDS = {
  /** 나트륨(mg) — 하루 권장 2,000mg의 30%쯤 */
  hypertension: 600,
  /** 당류(g) */
  diabetes: 15,
  /** 지방(g) */
  hyperlipidemia: 20,
};

/** 퓨린이 많은 음식. 영양성분 DB에 퓨린 값이 없어 이름으로 거른다. */
const GOUT_KEYWORDS = ['곱창', '내장', '간', '등푸른', '고등어', '멸치', '새우', '맥주', '육수'];

const REASONS: Record<string, string> = {
  hypertension: '나트륨이 많아요',
  diabetes: '당류가 많아요',
  hyperlipidemia: '지방이 많아요',
  gout: '퓨린이 많은 재료예요',
};

/** 이 음식이 주의가 필요한 질환 코드들. 영양 정보가 없으면 판정하지 않는다. */
export function getCautions(food: Food): string[] {
  const hits: string[] = [];
  if ((food.sodium ?? 0) >= THRESHOLDS.hypertension) hits.push('hypertension');
  if ((food.sugar ?? 0) >= THRESHOLDS.diabetes) hits.push('diabetes');
  if ((food.fat ?? 0) >= THRESHOLDS.hyperlipidemia) hits.push('hyperlipidemia');
  if (GOUT_KEYWORDS.some((k) => food.name.includes(k))) hits.push('gout');
  return hits;
}

/** 사용자의 질환과 겹치는 첫 번째 주의 항목. 없으면 null. */
export function findCautionHit(food: Food, conditions: string[]): string | null {
  return getCautions(food).find((c) => conditions.includes(c)) ?? null;
}

/** "나트륨이 많아요" 같은 사유 문구. */
export function cautionReason(code: string): string {
  return REASONS[code] ?? '주의가 필요해요';
}
