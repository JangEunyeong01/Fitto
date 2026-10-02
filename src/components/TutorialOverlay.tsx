import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { brand, typography, weight } from '../theme/tokens';
import { useTutorialStore, TUTORIAL_STEPS } from '../store/useTutorialStore';

const DIM = 'rgba(16,26,36,0.55)';
/** 대상 둘레로 띄우는 여백. 뚫린 칸의 크기. */
const PAD = 4;
/** 꼬리(삼각형) 크기와 풍선까지의 거리. */
const TAIL = 10;
const GAP = 6;
const SIDE = 16;
const BUBBLE_MAX = 300;

/**
 * 첫 실행 튜토리얼 — 대상만 밝게 뚫고, 그 옆에 꼬리 달린 작은 말풍선.
 *
 * 예전엔 화면 폭을 가로지르는 어두운 상자 + 깜빡이는 테두리였는데, 화면 위쪽(인사)을 가리킬 땐
 * 큰 상자가 그 아래를 통째로 덮어 답답했다. 풍선은 대상 쪽으로 꼬리를 내밀어 "여기"를 가리키고,
 * 폭은 내용만큼(최대 300)만 차지한다. 대상 아래에 두되 아래가 모자라면 위로 뒤집는다.
 */
export default function TutorialOverlay() {
  const { open, step, targets, next, close } = useTutorialStore();
  const { colors } = useTheme();
  const { width: windowW, height: windowH } = useWindowDimensions();

  // NavigationContainer 바깥에 마운트돼 있어 useWindowDimensions가 0을 주는 경우가 있다.
  // 오버레이가 실제로 차지한 크기를 우선 쓴다.
  const [size, setSize] = useState({ w: 0, h: 0 });
  const screenW = size.w || windowW;
  const screenH = size.h || windowH;

  if (!open) return null;

  const current = TUTORIAL_STEPS[step];
  const raw = targets[current.target];
  const isLast = step === TUTORIAL_STEPS.length - 1;

  // 대상이 화면 밖으로 걸쳐 있으면 화면 안으로 가둔다.
  const rect =
    raw && screenH > 0
      ? (() => {
          const top = Math.max(0, raw.y);
          const bottom = Math.min(screenH, raw.y + raw.height);
          return { ...raw, y: top, height: Math.max(0, bottom - top) };
        })()
      : raw;

  // 풍선은 대상 가운데 쪽으로 붙이되 화면 밖으로 안 나가게.
  const bubbleW = Math.min(BUBBLE_MAX, screenW - SIDE * 2);
  const centerX = rect ? rect.x + rect.width / 2 : screenW / 2;
  const bubbleLeft = Math.min(Math.max(SIDE, centerX - bubbleW / 2), screenW - SIDE - bubbleW);
  // 꼬리는 대상 가운데를 가리킨다. 풍선 모서리에 걸리지 않게 안쪽으로 가둔다.
  const tailLeft = Math.min(Math.max(20, centerX - bubbleLeft - TAIL), bubbleW - 20 - TAIL * 2);

  const below = rect ? rect.y + rect.height + PAD + GAP + TAIL : screenH / 2;
  const flipAbove = rect ? below > screenH - 190 : false;
  const position = !rect
    ? { top: screenH / 2 - 80 }
    : flipAbove
      ? { bottom: screenH - (rect.y - PAD - GAP - TAIL) }
      : { top: below };

  const tail = (
    <View
      style={[
        styles.tail,
        { left: tailLeft, backgroundColor: colors.surfaceSolid },
        flipAbove ? { bottom: -TAIL } : { top: -TAIL },
      ]}
    />
  );

  return (
    <View style={styles.overlay} onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {/* 대상 둘레를 네 장으로 덮어 가리키는 곳만 밝게 남긴다. 뚫린 곳 위의 투명한 판은 튜토리얼 중 눌림을 막는다. */}
      {rect ? (
        <>
          <Pressable style={[styles.piece, { backgroundColor: DIM, left: 0, right: 0, top: 0, height: Math.max(0, rect.y - PAD) }]} />
          <Pressable style={[styles.piece, { backgroundColor: DIM, left: 0, right: 0, top: rect.y + rect.height + PAD, bottom: 0 }]} />
          <Pressable
            style={[styles.piece, { backgroundColor: DIM, left: 0, width: Math.max(0, rect.x - PAD), top: rect.y - PAD, height: rect.height + PAD * 2 }]}
          />
          <Pressable
            style={[styles.piece, { backgroundColor: DIM, left: rect.x + rect.width + PAD, right: 0, top: rect.y - PAD, height: rect.height + PAD * 2 }]}
          />
          <Pressable style={[styles.piece, { left: rect.x - PAD, top: rect.y - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 }]} />
        </>
      ) : (
        <Pressable style={[styles.piece, { backgroundColor: DIM, left: 0, right: 0, top: 0, bottom: 0 }]} />
      )}

      <View
        style={[styles.bubble, { left: bubbleLeft, width: bubbleW, backgroundColor: colors.surfaceSolid }, position]}
        accessibilityViewIsModal
      >
        {/* 꼬리를 풍선보다 먼저 그려 풍선 면이 꼬리 이음매를 덮게 한다. */}
        {tail}
        <View style={styles.bubbleInner}>
          <Text style={[styles.stepCount, { color: colors.textSecondary }]}>
            {step + 1} / {TUTORIAL_STEPS.length}
          </Text>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{current.title}</Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>{current.body}</Text>

          <View style={styles.buttonRow}>
            {!isLast && (
              <Pressable onPress={close} style={styles.textBtn} accessibilityRole="button">
                <Text style={[styles.skipLabel, { color: colors.textSecondary }]}>건너뛰기</Text>
              </Pressable>
            )}
            <Pressable onPress={next} hitSlop={4} style={[styles.nextBtn, { backgroundColor: brand.blue }]} accessibilityRole="button">
              <Text style={[styles.nextLabel, { color: colors.textOnPrimary }]}>{isLast ? '시작하기' : '다음'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 960,
  },
  piece: {
    position: 'absolute',
  },
  bubble: {
    position: 'absolute',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 10,
  },
  // 정사각형을 45도 돌려 반만 보이게 하면 삼각형 꼬리가 된다(물방울 로딩과 같은 방식).
  tail: {
    position: 'absolute',
    width: TAIL * 2,
    height: TAIL * 2,
    transform: [{ rotate: '45deg' }],
    borderRadius: 3,
  },
  bubbleInner: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  stepCount: {
    fontSize: 12,
    ...weight(600),
  },
  title: {
    fontSize: 15,
    ...weight(700),
    marginTop: 4,
  },
  body: {
    ...typography.bodySm,
    lineHeight: 20,
    marginTop: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 10,
  },
  textBtn: {
    minHeight: 44,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  skipLabel: {
    fontSize: 14,
    ...weight(600),
  },
  nextBtn: {
    height: 36,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextLabel: {
    fontSize: 14,
    ...weight(700),
  },
});
