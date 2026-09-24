import React from 'react';
import { Text, StyleSheet, type StyleProp, type TextStyle } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { weight } from '../theme/tokens';
import type { MatchRange } from '../utils/hangul';

interface HighlightTextProps {
  text: string;
  /** 검색어가 걸린 자리. null이면 그냥 글씨로 그린다. */
  match: MatchRange | null;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}

/**
 * 검색어가 걸린 부분만 색을 입힌다.
 *
 * 목록이 왜 이 순서로 나왔는지 보여주는 장치다. 특히 초성 검색은 "ㄱㅊ"를 쳤을 때
 * 김치·고추장이 같이 나오는데, 어느 글자 때문인지 안 보이면 결과가 엉뚱해 보인다.
 *
 * 색만으로 알리지 않는다 — 굵기도 함께 바꾼다(기준서 접근성).
 */
export default function HighlightText({ text, match, style, numberOfLines }: HighlightTextProps) {
  const { colors } = useTheme();

  if (!match) {
    return (
      <Text style={style} numberOfLines={numberOfLines}>
        {text}
      </Text>
    );
  }

  const end = match.start + match.length;
  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {text.slice(0, match.start)}
      <Text style={[styles.hit, { color: colors.textAccent }]}>{text.slice(match.start, end)}</Text>
      {text.slice(end)}
    </Text>
  );
}

const styles = StyleSheet.create({
  hit: weight(700),
});
