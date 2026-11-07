// 피또 그림 대신 쓰는 빈 물방울. 실제 그림(fittoSvgs.ts)은 공개하지 않아 저장소에 없다(.gitignore).
// 저장소만 받은 곳(CI, 클론한 사람)은 이 파일을 fittoSvgs.ts로 복사해서 쓴다:
//   cp src/theme/fittoSvgs.placeholder.ts src/theme/fittoSvgs.ts
// 상황 이름은 scripts/build-fitto-svgs.mjs의 STATES와 같아야 한다 — 다르면 앱 코드에서 타입 검사가 깨진다.

const DROP =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -24 200 244">' +
  '<path d="M100 10 C130 60 165 100 165 140 A65 65 0 0 1 35 140 C35 100 70 60 100 10 Z" fill="#89C4E1"/>' +
  '</svg>';

const STATES = {
  hello: DROP,
  water0_dry: DROP,
  water1_thirsty: DROP,
  water2_normal: DROP,
  water3_fresh: DROP,
  water4_full: DROP,
  empty: DROP,
  laydown_puddle: DROP,
  birthday: DROP,
  lock: DROP,
  period_care: DROP,
} as const;

export const FITTO_SVGS = { friendly: STATES, strict: STATES, neutral: STATES } as const;
