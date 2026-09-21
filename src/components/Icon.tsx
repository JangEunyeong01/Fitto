import React from 'react';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

export type IconName =
  | 'home'
  | 'diet'
  | 'health'
  | 'settings'
  | 'plus'
  | 'chevronLeft'
  | 'chevronRight'
  | 'close'
  | 'search'
  | 'moon'
  | 'water'
  | 'weight'
  | 'arrowUp'
  | 'arrowDown';

/**
 * 아이콘 크기는 세 단계만 쓴다(UI 기준서 8장). 예전에는 13~20까지 8종이 섞여 있었다.
 * 숫자를 아무거나 넣을 수 없게 타입으로 막는다 — 16: 줄 안·행 끝, 20: 버튼·탭, 24: 강조.
 */
export type IconSize = 16 | 20 | 24;

interface IconProps {
  name: IconName;
  size?: IconSize;
  color: string;
  /** 크게 쓸 땐 선을 조금 얇게, 작게 쓸 땐 두껍게 잡아야 굵기가 같아 보인다. */
  strokeWidth?: number;
}

/**
 * 앱 전체 아이콘. 전에는 ‹ › × ⚙ 🌙 🔍 같은 문자와 이모지를 썼는데,
 * 이모지는 기기마다 다르게 그려지고 문자는 광학 중심이 안 맞아 크기·정렬이 제각각이었다.
 *
 * 24 그리드에 선으로만 그리고 끝을 둥글게 처리해 앱의 둥근 톤(radius 12~23,
 * 부드러운 그림자)과 맞춘다. 채움이 필요한 곳이 생기면 fill 옵션을 따로 만든다.
 */
export default function Icon({ name, size = 20, color, strokeWidth = 1.8 }: IconProps) {
  const stroke: StrokeProps = {
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    fill: 'none',
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {renderPaths(name, stroke)}
    </Svg>
  );
}

interface StrokeProps {
  stroke: string;
  strokeWidth: number;
  strokeLinecap: 'round';
  strokeLinejoin: 'round';
  fill: 'none';
}

function renderPaths(name: IconName, p: StrokeProps) {
  switch (name) {
    case 'home':
      return (
        <>
          <Path d="M4 10.4 12 4l8 6.4" {...p} />
          <Path d="M6 9.6V19a1.4 1.4 0 0 0 1.4 1.4h9.2A1.4 1.4 0 0 0 18 19V9.6" {...p} />
        </>
      );

    // 식단·음식 기록 공통. 김이 오르는 그릇.
    // 김은 S자로 그려야 작게 줄여도 "뜨거운 음식"으로 읽힌다. 직선으로 하면 그냥 점처럼 보였다.
    case 'diet':
      return (
        <>
          <Path d="M3.2 10.8h17.6" {...p} />
          <Path d="M4.8 10.8a7.2 7.2 0 0 0 14.4 0" {...p} />
          <Path d="M9.4 7.8c-1-1.3 1-1.9 0-3.2" {...p} />
          <Path d="M14.6 7.8c-1-1.3 1-1.9 0-3.2" {...p} />
        </>
      );

    // 헬스·운동 기록 공통. 덤벨을 가로로 눕힌 모양.
    // 원판을 안쪽은 길게 바깥쪽은 짧게 해야 덤벨로 보인다. 길이가 같으면 막대그래프처럼 읽혔다.
    case 'health':
      return (
        <>
          <Path d="M4.6 10.2v3.6" {...p} />
          <Path d="M7.8 7.4v9.2" {...p} />
          <Path d="M16.2 7.4v9.2" {...p} />
          <Path d="M19.4 10.2v3.6" {...p} />
          <Path d="M7.8 12h8.4" {...p} />
        </>
      );

    // 설정. 톱니바퀴는 작게 그리면 톱니가 뭉개져서 슬라이더로 간다.
    case 'settings':
      return (
        <>
          <Path d="M4 7.5h8.2" {...p} />
          <Path d="M17.8 7.5H20" {...p} />
          <Circle cx={15} cy={7.5} r={2.2} {...p} />
          <Path d="M4 16.5h4.2" {...p} />
          <Path d="M13.8 16.5H20" {...p} />
          <Circle cx={11} cy={16.5} r={2.2} {...p} />
        </>
      );

    case 'plus':
      return (
        <>
          <Path d="M12 5.5v13" {...p} />
          <Path d="M5.5 12h13" {...p} />
        </>
      );

    case 'chevronLeft':
      return <Path d="M14.5 6.5 9 12l5.5 5.5" {...p} />;

    case 'chevronRight':
      return <Path d="M9.5 6.5 15 12l-5.5 5.5" {...p} />;

    case 'close':
      return (
        <>
          <Path d="m6.8 6.8 10.4 10.4" {...p} />
          <Path d="m17.2 6.8-10.4 10.4" {...p} />
        </>
      );

    case 'search':
      return (
        <>
          <Circle cx={10.8} cy={10.8} r={6} {...p} />
          <Path d="m15.4 15.4 4.1 4.1" {...p} />
        </>
      );

    case 'moon':
      return <Path d="M20.5 13.4A8.6 8.6 0 1 1 10.6 3.5a6.7 6.7 0 0 0 9.9 9.9Z" {...p} />;

    case 'water':
      return <Path d="M12 3.6c3 3.4 5.2 6.2 5.2 8.8a5.2 5.2 0 0 1-10.4 0c0-2.6 2.2-5.4 5.2-8.8Z" {...p} />;

    // 체중 기록. 체중계 위에서 본 모양 + 눈금 바늘.
    case 'weight':
      return (
        <>
          <Rect x={4} y={4} width={16} height={16} rx={3.6} {...p} />
          <Path d="M8.8 15.2a3.2 3.2 0 0 1 6.4 0" {...p} />
          <Path d="M12 15.2 14 11.6" {...p} />
        </>
      );

    case 'arrowUp':
      return (
        <>
          <Path d="M12 19V5.5" {...p} />
          <Path d="M6.6 10.9 12 5.5l5.4 5.4" {...p} />
        </>
      );

    case 'arrowDown':
      return (
        <>
          <Path d="M12 5v13.5" {...p} />
          <Path d="M6.6 13.1 12 18.5l5.4-5.4" {...p} />
        </>
      );
  }
}
