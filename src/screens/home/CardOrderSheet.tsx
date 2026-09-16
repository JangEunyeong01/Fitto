import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/useTheme';
import { useAppStore, CardId, ESSENTIAL_CARDS } from '../../store/useAppStore';
import PrimaryButton from '../../components/PrimaryButton';
import Icon from '../../components/Icon';
import { overlay, typography } from '../../theme/tokens';

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

export default function CardOrderSheet({ visible, onClose }: CardOrderSheetProps) {
  const { colors, radius, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const cardOrder = useAppStore((s) => s.cardOrder);
  const cardHidden = useAppStore((s) => s.cardHidden);
  const periodOn = useAppStore((s) => s.periodOn);
  const setCardOrder = useAppStore((s) => s.setCardOrder);
  const setCardHidden = useAppStore((s) => s.setCardHidden);
  const resetCardOrder = useAppStore((s) => s.resetCardOrder);

  // 홈과 같은 기준으로 거른다. 생리 기능을 꺼두면 홈에 안 나오는 카드라
  // 순서 시트에만 남아 있으면 눌러도 아무 일이 없는 행이 된다.
  const rows = cardOrder.filter((id) => id !== 'period' || periodOn);

  /**
   * cardOrder가 아니라 화면에 보이는 목록 기준으로 자리를 바꾼다.
   * 숨겨진 카드가 중간에 끼어 있을 때 그것과 교환해버리면 눌러도 순서가 그대로인 것처럼 보인다.
   */
  const move = (id: CardId, dir: -1 | 1) => {
    const targetId = rows[rows.indexOf(id) + dir];
    if (!targetId) return;
    const next = [...cardOrder];
    const from = next.indexOf(id);
    const to = next.indexOf(targetId);
    [next[from], next[to]] = [next[to], next[from]];
    setCardOrder(next);
  };

  const toggleHidden = (id: CardId) => {
    setCardHidden(cardHidden.includes(id) ? cardHidden.filter((c) => c !== id) : [...cardHidden, id]);
  };

  if (!visible) return null;

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheetWrap, { paddingBottom: insets.bottom + 16 }]}>
        <View
          style={[
            styles.sheet,
            { backgroundColor: colors.solid, paddingHorizontal: spacing.screenX, borderTopLeftRadius: radius.sheetTop, borderTopRightRadius: radius.sheetTop },
          ]}
        >
          <View style={[styles.grabber, { backgroundColor: colors.line }]} />
          <Text style={[styles.title, { color: colors.txt }]}>홈 카드 순서</Text>

          {rows.map((id, index) => {
            const hidden = cardHidden.includes(id);
            const atTop = index === 0;
            const atBottom = index === rows.length - 1;
            return (
              <View key={id} style={[styles.row, { borderColor: colors.line }]}>
                <Text style={[styles.rowLabel, { color: hidden ? colors.sub : colors.txt }]}>{CARD_LABELS[id]}</Text>
                <View style={styles.rowActions}>
                  <Pressable onPress={() => move(id, -1)} disabled={atTop} style={styles.iconBtn}>
                    <Icon name="arrowUp" size={16} color={atTop ? colors.line : colors.txt} />
                  </Pressable>
                  <Pressable onPress={() => move(id, 1)} disabled={atBottom} style={styles.iconBtn}>
                    <Icon name="arrowDown" size={16} color={atBottom ? colors.line : colors.txt} />
                  </Pressable>
                  {ESSENTIAL_CARDS.includes(id) ? (
                    <View style={[styles.toggleBtn, styles.essentialBtn, { borderColor: colors.line }]}>
                      <Text style={[styles.toggleText, { color: colors.sub }]}>항상 표시</Text>
                    </View>
                  ) : (
                    <Pressable onPress={() => toggleHidden(id)} style={[styles.toggleBtn, { borderColor: colors.line }]}>
                      <Text style={[styles.toggleText, { color: colors.txt }]}>{hidden ? '표시' : '숨김'}</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            );
          })}

          <View style={styles.bottomRow}>
            <Pressable onPress={resetCardOrder} style={[styles.defaultBtn, { borderColor: colors.line }]}>
              <Text style={[styles.defaultLabel, { color: colors.txt }]}>기본값</Text>
            </Pressable>
            <PrimaryButton label="완료" onPress={onClose} style={styles.doneBtn} />
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
    zIndex: 900,
  },
  backdrop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: overlay.sheetBackdrop,
  },
  sheetWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheet: {
    paddingTop: 10,
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    marginBottom: 14,
  },
  title: {
    ...typography.sheetTitle,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: typography.rowLabel,
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconBtn: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginLeft: 4,
  },
  essentialBtn: {
    // 누를 수 없는 상태라는 걸 눌리는 버튼과 구분해서 보여준다.
    borderStyle: 'dashed',
  },
  toggleText: typography.label,
  bottomRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  defaultBtn: {
    height: 48,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  defaultLabel: typography.rowLabel,
  doneBtn: {
    flex: 1,
  },
});
