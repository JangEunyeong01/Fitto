// 캐릭터 에셋 단일 관리 지점 — 그림을 바꿀 땐 fittoSvgs.ts를 다시 만들고, 고르는 규칙은 여기서만 바꾼다.
// v3(2026-10): 성격마다 다른 그림, 상황마다 다른 표정. 예전 PNG(assets/fitto/)는 더 이상 참조하지 않는다.
import type { Persona } from '../store/useAppStore';
import { FITTO_SVGS } from './fittoSvgs';

export type FittoState = keyof (typeof FITTO_SVGS)['friendly'];

/** 물 단계 0~4 → 표정. 단계 계산은 utils/health.ts의 getWaterStageIndex. */
export const WATER_FACES = ['water0_dry', 'water1_thirsty', 'water2_normal', 'water3_fresh', 'water4_full'] as const;

/** 그림 비율(세로 / 가로). 크기는 가로로 잡고 세로는 이걸 곱한다. */
export const FITTO_RATIO = 244 / 200;

export function getFittoSvg(persona: Persona, state: FittoState): string {
  return FITTO_SVGS[persona][state];
}
