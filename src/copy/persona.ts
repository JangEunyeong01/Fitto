// README "성격별 문구" 표를 그대로 옮긴 문구 리소스. 하드코딩 카피 대신 이 테이블을 통해서만 참조한다.
import type { Persona } from '../store/useAppStore';

export const personaLabel: Record<Persona, string> = {
  friendly: '친근형',
  strict: '엄격형',
  neutral: '차분형',
};

export const personaOnboardingCopy: Record<Persona, string> = {
  friendly: '오늘도 같이 힘내볼까요? 편하게 이야기하듯 알려드릴게요.',
  strict: '목표 달성을 위해 명확하고 단호하게 안내합니다.',
  neutral: '수치 중심으로 담백하게 상태를 알려드립니다.',
};

export const personaCopy = {
  homeGreeting: {
    friendly: (v: { remainKcal: number; remainWater: number }) =>
      `오늘도 같이 힘내볼까요? 물 ${v.remainWater}ml만 더 마시면 완전 만족이에요!`,
    strict: (v: { remainKcal: number; remainWater: number }) =>
      `오늘 목표까지 ${v.remainKcal}kcal 남았습니다. 물은 ${v.remainWater}ml 부족합니다.`,
    neutral: (v: { consumedKcal: number; currentWater: number }) =>
      `오늘 섭취 ${v.consumedKcal}kcal, 물 ${v.currentWater}ml입니다.`,
  },
  kcalComment: {
    friendly: (v: { remainKcal: number }) => `아직 ${v.remainKcal}kcal 남았어요. 저녁은 편하게 드셔도 괜찮아요 :)`,
    strict: (v: { consumedKcal: number; percent: number }) => `섭취 ${v.consumedKcal}kcal. 목표 대비 ${v.percent}%입니다.`,
    neutral: (v: { remainKcal: number }) => `남은 칼로리 ${v.remainKcal}kcal.`,
  },
  exerciseComment: {
    friendly: () => '어제 많이 걸으셨으니 오늘은 가볍게 몸 풀어요!',
    strict: () => '목표는 체중 감량입니다. 유산소 20분을 채우세요.',
    neutral: () => '추천 운동 2개가 있습니다.',
  },
  periodComment: {
    friendly: (v: { day: number }) => `${v.day}일차예요. 오늘은 무리하지 말고 따뜻하게 있어요.`,
    strict: (v: { day: number }) => `${v.day}일차. 강도 높은 운동은 권장하지 않습니다.`,
    neutral: (v: { day: number }) => `생리 ${v.day}일차입니다.`,
  },
  layDownTitle: {
    friendly: () => '피또가 드러누웠어요',
    strict: () => '3일간 운동 기록 없음',
    neutral: () => '운동 기록 3일 없음',
  },
  layDownBody: {
    friendly: () => '3일 동안 운동 기록이 없어요. 같이 5분만 걸어볼까요? 저도 일어날게요!',
    strict: () => '기록이 없으면 계획을 조정할 수 없습니다. 오늘 5분이라도 채우세요.',
    neutral: () => '운동 기록이 3일간 없습니다. 가벼운 걷기를 추천합니다.',
  },
  waterAlarm: {
    friendly: () => '물 마실 시간이에요! 한 잔이면 촉촉해질 수 있어요 💧',
    strict: () => '수분 섭취가 2시간째 없습니다. 지금 250ml 채우세요.',
    neutral: (v: { remain: number }) => `물 섭취 알림 · 목표까지 ${v.remain}ml 남음`,
  },
  birthdayMessage: {
    friendly: (v: { name: string }) => `${v.name}님, 생일 축하해요! 오늘은 케이크 한 조각쯤 괜찮아요. 목표도 살짝 늘려뒀어요 🎂`,
    strict: (v: { name: string }) => `${v.name}님, 생일 축하합니다. 오늘은 목표를 조금 여유롭게 잡아두었습니다.`,
    neutral: (v: { name: string }) => `${v.name}님의 생일입니다. 오늘 목표 칼로리에 200kcal을 더했습니다.`,
  },
  waterStage: {
    friendly: [
      '입이 바싹 말랐어요… 한 잔만 부탁해요!',
      '아직 목이 말라요. 같이 한 잔 어때요?',
      '좋아요, 이 페이스면 괜찮아요!',
      '거의 다 왔어요! 한 잔만 더요.',
      '완전 만족! 오늘 물은 합격이에요 ✨',
    ],
    strict: [
      '수분 섭취가 심각하게 부족합니다.',
      '목표의 절반도 못 채웠습니다.',
      '평균 수준입니다. 계속 유지하세요.',
      '목표까지 얼마 남지 않았습니다.',
      '목표 달성. 내일도 같은 페이스로.',
    ],
    neutral: [
      '수분 섭취 20% 이하.',
      '수분 섭취 부족 상태.',
      '수분 섭취 보통.',
      '목표 근접.',
      '목표 달성.',
    ],
  },
} as const;

export const waterStageNames = ['바싹 마름', '목마름', '보통', '촉촉', '완전 만족'] as const;
