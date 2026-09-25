// Fitto 디자인 토큰 — design-source/design_handoff_fitto/README.md 값 그대로 이식.
// Pretendard Variable 폰트 파일이 준비되면 fonts.ts에서 로드해 fontFamily를 교체한다.
// 현재는 README의 폴백 규칙(각 플랫폼 한글 시스템 폰트)에 따라 시스템 기본 폰트를 사용한다.

import type { TextStyle } from 'react-native';
import { FONT_FAMILY, type FontWeightKey } from './fonts';

/**
 * 색은 두 층으로 나눈다(UI 기준서 2장).
 *
 * - 팔레트(brand): 원본 색. 면·차트·캐릭터·그라데이션에 쓴다
 * - 역할(ThemeColors): 화면이 쓰는 이름. 글씨와 누르는 요소는 반드시 여기서 고른다
 *
 * 예전에는 팔레트만 있어서 brand.blue 하나가 버튼 면·링크 글씨·선택 테두리·차트에 동시에 쓰였다.
 * 파스텔은 면으로는 괜찮지만 흰 바탕 위 글씨로 쓰면 대비가 1.9:1이라 읽기 어렵다.
 * 역할을 나눠두면 팔레트를 새로 잡아도 값만 바꾸면 되고, 화면 코드는 그대로다.
 *
 * 대비는 라이트 #F4F8FA / 다크 #0E151B 배경 기준으로 잰 값이다. 본문 4.5:1, 테두리 등은 3:1 이상.
 */
export interface ThemeColors {
  bg: string;
  /** 유리 카드 면. */
  surface: string;
  /** 카드 안의 한 겹 더 옅은 면(코멘트 상자 등). */
  surfaceSubtle: string;
  /** 시트·안내창·입력칸처럼 투명하면 안 되는 면. */
  surfaceSolid: string;
  /** 비활성 버튼 면. */
  surfaceMuted: string;
  /** 게이지·막대의 빈 칸, 장식 원. 정보를 담지 않는다. */
  fillMuted: string;
  /** 강조 안 한 차트 막대. fillMuted로는 카드 면에 묻혀서 한 단계 진하게(시안 07). */
  fillStrong: string;

  /** 제목·본문·수치. */
  textPrimary: string;
  /** 라벨·설명·단위. 4.5:1 이상. */
  textSecondary: string;
  /** 입력칸 힌트만. 라벨이 항상 따로 있어 보조 정보로 보고 4.5:1에 못 미치는 걸 기록해 둔다. */
  textPlaceholder: string;
  /** 비활성 글씨. 대비 기준 예외. */
  textDisabled: string;
  /** 파스텔 주 버튼 위 글씨. 흰 글씨는 1.9:1이라 짙은 남색을 쓴다. */
  textOnPrimary: string;
  /** 링크·상태 라벨·강조 수치. 파스텔을 글씨로 쓰지 않으려고 둔다. */
  textAccent: string;
  textGood: string;
  textWarn: string;
  textDanger: string;

  /** 유리 카드 가장자리만. 입력칸에 쓰면 칸이 안 보인다. */
  borderGlass: string;
  /** 구분선. 장식이라 대비 기준이 없다. */
  borderDivider: string;
  /** 입력칸·보조 버튼·꺼진 스위치. 3:1 이상. */
  borderInput: string;
  /** 선택된 칩·선택지. */
  borderSelected: string;
  focusRing: string;

  shadowColor: string;
}

export const lightColors: ThemeColors = {
  bg: '#F4F8FA',
  surface: 'rgba(255,255,255,.62)',
  surfaceSubtle: 'rgba(255,255,255,.42)',
  surfaceSolid: '#FFFFFF',
  surfaceMuted: '#EEF3F6',
  fillMuted: 'rgba(44,62,80,.06)',
  fillStrong: 'rgba(44,62,80,.10)',

  textPrimary: '#2C3E50', // 10.3:1
  textSecondary: '#5C7282', // 4.7:1 (예전 #8FA3B1은 2.4:1)
  textPlaceholder: '#6F8594', // 3.9:1 — 미달, 기록
  textDisabled: '#8FA3B1',
  textOnPrimary: '#1B3445', // 파스텔 버튼 위 6.8:1
  textAccent: '#2B77A6', // 4.9:1
  textGood: '#3E7D5A', // 4.9:1
  textWarn: '#8F6A12', // 5.0:1
  textDanger: '#A84B32', // 5.7:1

  borderGlass: 'rgba(255,255,255,.75)',
  borderDivider: 'rgba(44,62,80,.09)',
  borderInput: '#7F94A3', // 3.2:1
  borderSelected: '#2B77A6',
  focusRing: '#2B77A6',

  shadowColor: 'rgba(44,62,80,.10)',
};

export const darkColors: ThemeColors = {
  bg: '#0E151B',
  surface: 'rgba(255,255,255,.075)',
  surfaceSubtle: 'rgba(255,255,255,.05)',
  surfaceSolid: '#16202A',
  surfaceMuted: 'rgba(255,255,255,.05)',
  fillMuted: 'rgba(255,255,255,.07)',
  fillStrong: 'rgba(255,255,255,.12)',

  textPrimary: '#E7F1F6', // 16.0:1
  textSecondary: '#8098A8', // 6.1:1
  textPlaceholder: '#6A7F92', // 4.0:1 — 미달, 기록
  textDisabled: '#56687A',
  textOnPrimary: '#0E151B', // 파스텔 버튼 위 9.7:1
  textAccent: '#89C4E1', // 어두운 바탕에서는 파스텔이 그대로 읽힌다
  textGood: '#7CC39A',
  textWarn: '#E0B656',
  textDanger: '#E08B70',

  borderGlass: 'rgba(255,255,255,.14)',
  borderDivider: 'rgba(255,255,255,.10)',
  borderInput: '#62778A', // 3.6:1
  borderSelected: '#89C4E1',
  focusRing: '#89C4E1',

  shadowColor: 'rgba(0,0,0,.35)',
};

export const brand = {
  blue: '#89C4E1',
  blueDeep: '#7FB6DC',
  mint: '#A8D8B9',
  lavender: '#C4B5E8',
  yellow: '#FFE082',
  peach: '#FFAB91',
  gray: '#B0BEC5',
} as const;

/**
 * 상태 색 — 막대·점처럼 **면으로** 쓰는 값. 글씨에는 ThemeColors의 textGood/textWarn/textDanger를 쓴다.
 * warn은 예전 #C79A2E가 막대로 써도 2.6:1이라 한 단계 내렸다(3.6:1).
 */
export const semantic = {
  good: '#5B9E78',
  warn: '#AD8024',
  danger: '#C1674A',
} as const;

export const white = '#FFFFFF';

/** #RGB 또는 #RRGGBB에 투명도를 입혀 rgba() 문자열을 만든다. 파생 색은 원본 토큰에서 계산해 쓴다. */
export function alpha(color: string, a: number): string {
  let hex = color.replace('#', '');
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

export const primaryGradient = [brand.blue, brand.blueDeep] as const;
export const primaryButtonShadow = alpha(brand.blue, 0.45);
export const primaryButtonShadowSmall = alpha(brand.blue, 0.4);

/** 로고 사각형·온보딩 진행 점에 쓰는 블루→민트 그라데이션. */
export const accentGradient = [brand.blue, brand.mint] as const;

/** 생리 주기 배지 그라데이션 (README: lavender .9 → peach .75). */
export const periodBadgeGradient = [alpha(brand.lavender, 0.9), alpha(brand.peach, 0.75)] as const;

/** 선택 상태 (README 온보딩 옵션 행). */
export const selection = {
  border: alpha(brand.blue, 0.9),
  bg: alpha(brand.blue, 0.16),
  shadow: alpha(brand.blue, 0.24),
} as const;

const SCRIM_BASE = '#101A24';

export const overlay = {
  /** 토스트 배경 (README: rgba(28,42,54,.9) + blur(10)). */
  toastBg: 'rgba(28,42,54,.9)',
  /** 튜토리얼 딤 (README 명시값). */
  tutorialDim: alpha(SCRIM_BASE, 0.62),
  /** 바텀시트 배경 딤. README에 값이 없어 튜토리얼 딤과 같은 색을 옅게 썼다. */
  sheetBackdrop: alpha(SCRIM_BASE, 0.5),
} as const;

/** 탭바 그림자 (README: 0 12px 30px rgba(44,62,80,.16)). */
export const tabBarShadowColor = alpha(lightColors.textPrimary, 0.16);

/**
 * 생일 배너·모달.
 * README 토큰 표에는 없고 원본 프로토타입에만 있는 값이라 따로 모아둔다.
 * 옅은 복숭아색은 아침 시간대 색(#FFCBB6)과 같은 값을 쓴다.
 */
const BIRTHDAY_PEACH = '#FFCBB6';
const BIRTHDAY_MODAL_INK = '#14202A';

export const birthday = {
  bannerGradient: [alpha(brand.lavender, 0.35), alpha(BIRTHDAY_PEACH, 0.35)] as const,
  avatarGradient: [brand.lavender, BIRTHDAY_PEACH] as const,
  confirmGradient: [brand.lavender, brand.blue] as const,
  modalBackdrop: alpha(BIRTHDAY_MODAL_INK, 0.44),
  modalShadow: alpha(BIRTHDAY_MODAL_INK, 0.32),
  glowLavender: alpha(brand.lavender, 0.55),
  glowPeach: alpha(BIRTHDAY_PEACH, 0.6),
  /** 모달 캐릭터 부유 주기 (프로토타입: fbob 3.4s). */
  floatDuration: 3400,
} as const;

/**
 * 캐릭터 5단계 필터 근사용 오버레이 색.
 * RN Image에 CSS filter를 걸 수 없어 반투명 레이어로 대체한다.
 * 최종 5단계 일러스트가 준비되면 이미지 스왑으로 바뀌면서 함께 제거된다.
 */
export const characterOverlay = {
  desaturate: '#8FA3B1',
  vivid: brand.blue,
  brighten: white,
} as const;

/**
 * 애니메이션 (README 애니메이션 표).
 * easing은 Easing.bezier(...)에 그대로 펼쳐 넣는 cubic-bezier 제어점이다.
 */
const EASE_OUT_SHEET: readonly [number, number, number, number] = [0.2, 0.9, 0.3, 1];

export const motion = {
  /** 물 단계 변화 시 채도·크기 전환 (README: filter .4s, transform .4s). */
  characterState: 400,
  characterFloatReset: 300,
  /** fbob 부유 진폭. 단계별 주기는 utils/health.ts의 floatDurationMs. */
  floatOffsetY: -7,
  /** 게이지 채움 (README: .5s cubic-bezier(.2,.9,.3,1)). */
  gaugeFill: 500,
  gaugeEasing: EASE_OUT_SHEET,
  /** fin — 토스트·모달 등장 (.24–.3s). */
  fadeIn: 240,
  fadeOut: 200,
  /** fin의 시작 오프셋 (translateY 10px). */
  fadeInOffsetY: 10,
  /** fsheet — 바텀시트 (.28s). */
  sheet: 280,
  sheetEasing: EASE_OUT_SHEET,
  /** 탭 전환·스위치 (.22s). */
  tab: 220,
  /** fpulse — 튜토리얼 하이라이트 (2.2s). */
  pulse: 2200,
  /** fwave — 컵 수면 물결 (2.6s). */
  wave: 2600,
  /** 토스트 자동 소멸까지 유지 시간. 1.9초는 두 줄 문구를 다 읽기 전에 사라졌다(UI 기준서 5-7). */
  toastVisible: 3000,
} as const;

export type TimeSlot = 'dawn' | 'morning' | 'day' | 'after' | 'evening' | 'night';

/** name은 헤더 시간대 칩에, greeting은 히어로 행 인사말에 쓴다. */
export const timeSlots: Record<TimeSlot, { color: string; name: string; greeting: string }> = {
  dawn: { color: '#2C3E50', name: '새벽', greeting: '좋은 새벽' },
  morning: { color: '#FFCBB6', name: '아침', greeting: '좋은 아침' },
  day: { color: '#89C4E1', name: '낮', greeting: '좋은 오후' },
  after: { color: '#A8D8B9', name: '오후', greeting: '나른한 오후' },
  evening: { color: '#C4B5E8', name: '저녁', greeting: '편안한 저녁' },
  night: { color: '#6B5B95', name: '밤', greeting: '늦은 밤' },
};

/**
 * 숫자가 바뀔 때 자릿수가 흔들리지 않게 고정폭 숫자를 쓴다.
 * `as const`로 두면 readonly라 StyleSheet에 넣을 수 없어서 타입을 명시한다.
 */
export const tabularNums: TextStyle['fontVariant'] = ['tabular-nums'];

/**
 * 굵기 한 단계를 스타일 조각으로 만든다.
 *
 * Pretendard는 굵기별로 파일이 나뉘어 있어서 fontWeight만 바꿔서는 두께가 안 변한다.
 * 반드시 fontFamily를 함께 바꿔야 한다. fontWeight를 같이 남기는 이유는
 * 폰트 로딩이 실패했을 때 시스템 폰트가 대신 굵어지게 하기 위해서다.
 *
 * 굵기를 상황에 따라 바꾸는 곳(선택된 칩, 오늘 요일 등)에서도 이걸 펼쳐 쓴다.
 */
export function weight(w: FontWeightKey) {
  return { fontWeight: String(w) as '400' | '500' | '600' | '700', fontFamily: FONT_FAMILY[w] };
}

/**
 * 글자 크기 단계 (UI 기준서 3장). 5계층 10단계, **가장 작은 글자는 12px.**
 *
 * 예전에는 크기가 16종(9.5~27)이었고 0.5px 차이는 눈으로 구분되지 않아 위계만 흐려졌다.
 * 카드 제목(12.5)과 본문(12.5)이 같은 크기라 무엇이 제목인지 읽히지 않았고,
 * 9.5·10.5px 글자는 폰에서 읽기 어려웠다.
 */
const TYPE_SCALE = {
  /** 홈 칼로리 카드의 섭취 숫자 하나. 화면에서 가장 먼저 읽혀야 하는 값이라 한 단계를 따로 둔다(시안 02). */
  displayXl: 36,
  displayLg: 28,
  displayMd: 24,
  heading1: 20,
  heading2: 17,
  heading3: 15,
  bodyLg: 15,
  bodyMd: 14,
  labelLg: 15,
  labelMd: 13,
  caption: 12,
} as const;

/**
 * 텍스트 역할표. 화면에서 fontSize를 직접 쓰지 말고 여기서 골라 쓴다.
 * 역할 이름은 화면 코드가 이미 쓰고 있는 것을 유지하고, 크기만 위 단계에 맞췄다.
 */
export const typography = {
  // Heading
  /** 탭 화면 제목(식단·헬스·설정). 시안 규칙 7: 24. */
  screenTitle: { fontSize: TYPE_SCALE.displayMd, ...weight(700), letterSpacing: -0.7, lineHeight: 24 * 1.25 },
  /** 상세 화면 제목(뒤로가기 옆). 시안은 19인데 단계에 없는 값이라 20으로 맞췄다. */
  subScreenTitle: { fontSize: TYPE_SCALE.heading1, ...weight(700), letterSpacing: -0.5, lineHeight: 20 * 1.35 },
  onboardingTitle: { fontSize: TYPE_SCALE.displayMd, ...weight(700), letterSpacing: -0.7, lineHeight: 24 * 1.32 },

  // Display — 대표 수치. 카드별 크기가 따로 필요한 곳은 화면에서 fontSize만 덮어쓴다.
  heroNumber: { fontSize: TYPE_SCALE.displayXl, ...weight(700), letterSpacing: -1.4, fontVariant: tabularNums },
  bigNumber: { fontSize: TYPE_SCALE.displayLg, ...weight(700), letterSpacing: -1.05, fontVariant: tabularNums },
  midNumber: { fontSize: TYPE_SCALE.displayMd, ...weight(700), letterSpacing: -0.9, fontVariant: tabularNums },

  /** 카드 제목. 본문(14)보다 커야 제목으로 읽힌다(예전 12.5 = 본문과 같은 크기). */
  cardTitle: { fontSize: TYPE_SCALE.heading3, ...weight(700), lineHeight: 15 * 1.4 },
  sectionTitle: { fontSize: TYPE_SCALE.heading3, ...weight(700), lineHeight: 15 * 1.4 },
  /** 시트·모달 제목. */
  sheetTitle: { fontSize: TYPE_SCALE.heading2, ...weight(700), lineHeight: 17 * 1.4 },
  /** 강조되는 항목 이름(닉네임, 빈 상태 제목). */
  itemTitle: { fontSize: TYPE_SCALE.bodyLg, ...weight(700), lineHeight: 15 * 1.45 },

  // Label
  /** 목록 행의 이름. */
  rowLabel: { fontSize: 14, ...weight(600) },
  /** 입력 위 라벨, 칩 글씨 같은 작은 라벨. */
  label: { fontSize: TYPE_SCALE.labelMd, ...weight(600) },
  /** 표에서 강조되는 값. */
  value: { fontSize: 14, ...weight(700) },
  /** 단위·보조 수치. */
  unit: { fontSize: TYPE_SCALE.labelMd, ...weight(600) },

  // Body
  /** 설명 문단. */
  body: { fontSize: TYPE_SCALE.bodyMd, ...weight(400), lineHeight: 14 * 1.55 },
  /** 좁은 자리의 설명. */
  bodySm: { fontSize: TYPE_SCALE.labelMd, ...weight(500), lineHeight: 13 * 1.5 },

  // Caption — 12px 아래로 내려가지 않는다.
  caption: { fontSize: TYPE_SCALE.caption, ...weight(500), lineHeight: 12 * 1.4 },
  /** 차트 축·카드 하단 캡션. 예전 10.5px. */
  captionSm: { fontSize: TYPE_SCALE.caption, ...weight(500) },
  /** 범례·요일 머리글. 예전 9.5px. */
  micro: { fontSize: TYPE_SCALE.caption, ...weight(600) },
  badge: { fontSize: TYPE_SCALE.caption, ...weight(700) },

  // 입력·버튼
  input: { fontSize: TYPE_SCALE.labelLg, ...weight(500) },
  buttonLabel: { fontSize: TYPE_SCALE.labelLg, ...weight(700) },
  buttonLabelSm: { fontSize: TYPE_SCALE.labelMd, ...weight(700) },

  sectionLabel: { fontSize: TYPE_SCALE.caption, ...weight(700), letterSpacing: 0.8, textTransform: 'uppercase' as const },
};

export const spacing = {
  screenX: 16,
  onboardingX: 24,
  bottomTabScreen: 108,
  bottomSubScreen: 40,
  cardGap: 12,
  cardGapCompact: 10,
  /** 시안 규칙 8: 카드 여백 18. */
  cardPadding: 18,
};

/**
 * 모서리 4단계 (UI 기준서 4장). 예전에는 23·26·22·18·16·14·12 일곱 가지가 섞여 있어서
 * 비슷한 카드인데 모서리가 1~3px씩 달랐다. 원형(지름의 절반)은 이 단계와 상관없이 크기에서 정한다.
 */
const RADIUS_SCALE = { xl: 24, lg: 16, md: 14, sm: 10 } as const;

export const radius = {
  /** 카드 */
  cardBig: RADIUS_SCALE.xl,
  /** 카드 안 블록 */
  blockMid: RADIUS_SCALE.lg,
  /** 버튼·입력칸 */
  button: RADIUS_SCALE.md,
  /** 칩·배지·작은 아이콘 버튼 */
  chip: RADIUS_SCALE.sm,
  /** 시트 위쪽 */
  sheetTop: RADIUS_SCALE.xl,
  /** 하단 플로팅 탭바 */
  tabBar: RADIUS_SCALE.xl,
  /** 탭바 안 선택 항목·FAB */
  tabItem: RADIUS_SCALE.lg,
  fab: RADIUS_SCALE.lg,
  /** 온보딩 옵션 행 */
  optionRow: RADIUS_SCALE.lg,
};

export const gauge = {
  kcalBarHeight: 9,
  kcalBarRadius: 6,
  stepsBarHeight: 8,
  stepsBarRadius: 5,
  ratioBarHeight: 11,
  ratioBarRadius: 6,
};

export const minTouchTarget = 44;

/**
 * 카드 그림자. 시안 규칙 8 "그림자 약하게" — 0 4px 16px rgba(44,62,80,.06).
 * 예전 0 10px 30px은 카드마다 떠 보여서, 바탕을 조용히 두려는 방향(Quiet Base)과 맞지 않았다.
 */
export const glassShadow = {
  light: {
    shadowColor: 'rgba(44,62,80,.06)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 2,
  },
  dark: {
    shadowColor: darkColors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 2,
  },
};

export function resolveColors(mode: 'light' | 'dark'): ThemeColors {
  return mode === 'dark' ? darkColors : lightColors;
}
