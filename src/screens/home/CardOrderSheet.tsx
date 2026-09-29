import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import BottomSheet from '../../components/BottomSheet';
import PrimaryButton from '../../components/PrimaryButton';
import ToggleSwitch from '../../components/ToggleSwitch';
import Icon from '../../components/Icon';
import { useTheme } from '../../theme/useTheme';
import { useAppStore, CardId, ESSENTIAL_CARDS } from '../../store/useAppStore';
import { weight } from '../../theme/tokens';

interface CardOrderSheetProps {
  visible: boolean;
  onClose: () => void;
}

const CARD_LABELS: Record<CardId, string> = {
  kcal: '칼로리',
  water: '물 섭취',
  act: '활동',
  steps: '걸음수',
  ex: '오늘 운동',
  week: '주간 요약',
  period: '생리 주기',
};

/** 줄 높이. 끄는 동안 손가락 위치를 몇 번째 자리인지로 바꿀 때 이 값으로 나눈다. */
const ROW = 52;

/**
 * 홈 카드 순서(시안 34). 줄을 길게 눌러 끌어서 옮기고, 스위치로 숨긴다.
 *
 * 예전엔 줄마다 위·아래 버튼이 있어서 맨 아래 카드를 맨 위로 올리려면 여섯 번 눌러야 했다.
 * 끌기는 이미 쓰고 있던 gesture-handler + reanimated로 만들었다(물 카드 드래그와 같은 도구). 새 라이브러리는 없다.
 * 끌기를 못 쓰는 사람(스크린리더)을 위해 줄마다 "위로·아래로 옮기기" 동작을 남겨 둔다.
 */
export default function CardOrderSheet({ visible, onClose }: CardOrderSheetProps) {
  const { colors } = useTheme();
  const cardOrder = useAppStore((s) => s.cardOrder);
  const cardHidden = useAppStore((s) => s.cardHidden);
  // 홈에서 안 보이는 생리 카드는 순서 목록에서도 뺀다(HomeScreen의 visibleCards와 같은 조건).
  const periodOn = useAppStore((s) => s.periodOn && s.periodSetupDone);
  const setCardOrder = useAppStore((s) => s.setCardOrder);
  const setCardHidden = useAppStore((s) => s.setCardHidden);
  const resetCardOrder = useAppStore((s) => s.resetCardOrder);

  // 홈과 같은 기준으로 거른다. 생리 기능을 꺼두면 홈에 안 나오는 카드라
  // 순서 시트에만 남아 있으면 옮겨도 아무 일이 없는 줄이 된다.
  const rows = cardOrder.filter((id) => id !== 'period' || periodOn);

  // 끄는 중인 줄과, 지금 놓으면 들어갈 자리.
  const [drag, setDrag] = useState<{ id: CardId; from: number; to: number } | null>(null);

  /** 보이는 목록 안에서 from → to로 옮기고, 목록에 없는 카드(꺼둔 생리 카드)는 뒤에 그대로 붙인다. */
  const commitMove = (from: number, to: number) => {
    if (from === to) return;
    const next = [...rows];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setCardOrder([...next, ...cardOrder.filter((id) => !rows.includes(id))]);
  };

  const toggleHidden = (id: CardId) => {
    setCardHidden(cardHidden.includes(id) ? cardHidden.filter((c) => c !== id) : [...cardHidden, id]);
  };

  /** 끄는 동안 나머지 줄이 비켜서는 자리. 끄는 줄이 지나간 칸만큼 한 칸씩 당기거나 민다. */
  const slotOf = (index: number) => {
    if (!drag || index === drag.from) return index;
    if (drag.from < drag.to && index > drag.from && index <= drag.to) return index - 1;
    if (drag.from > drag.to && index < drag.from && index >= drag.to) return index + 1;
    return index;
  };

  return (
    <BottomSheet
      visible={visible}
      title="홈 카드 순서"
      onClose={onClose}
      footer={
        <View style={styles.footerRow}>
          <Pressable onPress={resetCardOrder} accessibilityRole="button" style={styles.resetBtn}>
            <Text style={[styles.resetLabel, { color: colors.textSecondary }]}>기본값으로</Text>
          </Pressable>
          <PrimaryButton label="완료" onPress={onClose} style={styles.doneBtn} />
        </View>
      }
    >
      <Text style={[styles.hint, { color: colors.textSecondary }]}>
        줄을 길게 눌러 원하는 자리로 옮겨요. 스위치를 끄면 홈에서 숨겨요. 칼로리와 걸음수는 항상 보여요.
      </Text>

      {/* 시트는 Modal 안이라, 안드로이드에서 제스처를 받으려면 여기서 한 번 더 감싸야 한다. */}
      <GestureHandlerRootView>
        <View style={{ height: rows.length * ROW }}>
          {drag && (
            // 놓으면 들어갈 자리. 옅은 회색 칸으로 미리 보여준다.
            <View style={[styles.placeholder, { top: drag.to * ROW + 4, backgroundColor: colors.fillMuted }]} />
          )}
          {rows.map((id, index) => (
            <DragRow
              key={id}
              id={id}
              index={index}
              slot={slotOf(index)}
              count={rows.length}
              label={CARD_LABELS[id]}
              hidden={cardHidden.includes(id)}
              essential={ESSENTIAL_CARDS.includes(id)}
              dragging={drag?.id === id}
              divider={index < rows.length - 1}
              onToggle={() => toggleHidden(id)}
              onDragStart={() => setDrag({ id, from: index, to: index })}
              onDragMove={(to) => setDrag((d) => (d && d.to !== to ? { ...d, to } : d))}
              onDragEnd={(to) => {
                setDrag(null);
                commitMove(index, to);
              }}
              onStep={(dir) => commitMove(index, Math.max(0, Math.min(rows.length - 1, index + dir)))}
            />
          ))}
        </View>
      </GestureHandlerRootView>
    </BottomSheet>
  );
}

interface DragRowProps {
  id: CardId;
  index: number;
  /** 지금 서 있어야 할 칸. 다른 줄을 끄는 동안 비켜서면 index와 달라진다. */
  slot: number;
  count: number;
  label: string;
  hidden: boolean;
  essential: boolean;
  dragging: boolean;
  divider: boolean;
  onToggle: () => void;
  onDragStart: () => void;
  onDragMove: (to: number) => void;
  onDragEnd: (to: number) => void;
  onStep: (dir: -1 | 1) => void;
}

function DragRow({
  index,
  slot,
  count,
  label,
  hidden,
  essential,
  dragging,
  divider,
  onToggle,
  onDragStart,
  onDragMove,
  onDragEnd,
  onStep,
}: DragRowProps) {
  const { colors } = useTheme();
  const top = useSharedValue(index * ROW);
  const dragY = useSharedValue(0);
  const lastTo = useSharedValue(index);

  // 비켜설 칸이 바뀌면 부드럽게 옮겨 간다. 끄는 줄은 손가락을 따라가므로 제외.
  useEffect(() => {
    if (!dragging) top.value = withTiming(slot * ROW, { duration: 150 });
  }, [slot, dragging, top]);

  const pan = Gesture.Pan()
    // 짧게 누르면 스위치를 켜고 끄거나 시트를 스크롤할 수 있게, 길게 눌렀을 때만 끌기가 시작된다.
    .activateAfterLongPress(250)
    .onStart(() => {
      dragY.value = 0;
      lastTo.value = index;
      runOnJS(onDragStart)();
    })
    .onUpdate((e) => {
      dragY.value = e.translationY;
      const to = Math.max(0, Math.min(count - 1, Math.round((index * ROW + e.translationY) / ROW)));
      if (to !== lastTo.value) {
        lastTo.value = to;
        runOnJS(onDragMove)(to);
      }
    })
    .onEnd(() => {
      // 놓을 자리로 먼저 붙인 뒤 순서를 바꾼다. 안 그러면 한 프레임 동안 원래 자리로 튀었다가 간다.
      top.value = lastTo.value * ROW;
      dragY.value = 0;
      runOnJS(onDragEnd)(lastTo.value);
    });

  const animated = useAnimatedStyle(() => ({
    transform: [{ translateY: top.value + dragY.value }],
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        accessible
        accessibilityLabel={`${label}${hidden ? ', 숨김' : ''}`}
        accessibilityHint="길게 눌러 끌면 자리를 옮겨요"
        // 끌기를 못 쓰는 사람을 위한 같은 동작. 스크린리더에서 "위로 옮기기"를 고르면 한 칸 옮긴다.
        accessibilityActions={[
          { name: 'moveUp', label: '위로 옮기기' },
          { name: 'moveDown', label: '아래로 옮기기' },
        ]}
        onAccessibilityAction={(e) => onStep(e.nativeEvent.actionName === 'moveUp' ? -1 : 1)}
        style={[
          styles.row,
          animated,
          divider && !dragging && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderDivider },
          dragging && [styles.lifted, { backgroundColor: colors.surfaceSolid, shadowColor: colors.shadowColor }],
        ]}
      >
        <View style={styles.grip}>
          <Icon name="grip" size={20} color={colors.textSecondary} />
        </View>
        <Text
          style={[
            styles.label,
            { color: hidden ? colors.textSecondary : colors.textPrimary },
            dragging && weight(700),
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
        <View style={styles.right}>
          {essential ? (
            <Text style={[styles.always, { color: colors.textSecondary }]}>항상</Text>
          ) : (
            <ToggleSwitch value={!hidden} onChange={onToggle} />
          )}
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  hint: {
    fontSize: 12,
    ...weight(400),
    lineHeight: 18,
    marginBottom: 6,
  },
  row: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: ROW,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  // 들어 올린 줄: 흰 면 + 그림자로 떠 보이게, 좌우로 조금 넓혀 목록 위에 얹힌 느낌을 준다(시안 34).
  lifted: {
    zIndex: 2,
    marginHorizontal: -10,
    paddingHorizontal: 10,
    borderRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 6,
  },
  placeholder: {
    position: 'absolute',
    left: -4,
    right: -4,
    height: ROW - 8,
    borderRadius: 12,
  },
  grip: {
    width: 24,
    marginLeft: -2,
    alignItems: 'center',
  },
  label: {
    flex: 1,
    fontSize: 15,
    ...weight(600),
  },
  right: {
    width: 52,
    alignItems: 'flex-end',
  },
  always: {
    fontSize: 12,
    ...weight(600),
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  resetBtn: {
    minHeight: 44,
    justifyContent: 'center',
  },
  resetLabel: {
    fontSize: 15,
    ...weight(600),
  },
  doneBtn: {
    flex: 1,
  },
});
