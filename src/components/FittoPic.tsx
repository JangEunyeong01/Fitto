import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { FITTO_RATIO, getFittoSvg, type FittoState } from '../theme/assets';
import { useAppStore, type Persona } from '../store/useAppStore';

interface FittoPicProps {
  state: FittoState;
  /** 가로. 세로는 그림 비율(200:244)로 정해진다. */
  size: number;
  /** 안 주면 지금 고른 성격. 온보딩처럼 아직 저장 전인 성격을 보여줄 때만 넘긴다. */
  persona?: Persona;
  style?: StyleProp<ViewStyle>;
}

/** 피또 그림 한 장. 장식이라 스크린리더는 건너뛴다 — 뜻은 옆 글씨가 전한다. */
export default function FittoPic({ state, size, persona, style }: FittoPicProps) {
  const current = useAppStore((s) => s.persona);
  // 접근성 속성은 감싸는 View에 둔다. SvgXml에 직접 주면 웹에서 DOM 속성으로 새어 나가 경고가 뜬다.
  return (
    <View style={style} accessible={false} importantForAccessibility="no-hide-descendants">
      <SvgXml xml={getFittoSvg(persona ?? current, state)} width={size} height={size * FITTO_RATIO} />
    </View>
  );
}
