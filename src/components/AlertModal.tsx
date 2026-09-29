import React from 'react';
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import PrimaryButton from './PrimaryButton';
import TextLink from './TextLink';
import { useTheme } from '../theme/useTheme';
import { radius, weight } from '../theme/tokens';

const DIM = 'rgba(20,32,42,0.42)';
const CARD_SHADOW = 'rgba(20,32,42,0.18)';

interface AlertModalProps {
  visible: boolean;
  onClose: () => void;
  /** 제목 위에 얹는 그림·라벨(피또, "HAPPY BIRTHDAY"). */
  top?: React.ReactNode;
  title?: string;
  body: React.ReactNode;
  primaryLabel: string;
  onPrimary: () => void;
  /** 회색 "나중에". 없으면 칠한 버튼 하나만 둔다(생일처럼 거절할 게 없는 알림). */
  laterLabel?: string;
}

/**
 * 가운데 알림창 공통 틀(시안 36~38, 규칙 21).
 *
 * 로그인 풀림·운동 3일 없음·생일 세 창이 따로 그려져 있어서 여백·버튼 모양이 조금씩 달랐다.
 * 흰 카드 모서리 24, 가운데 정렬, 제목 17 / 본문 14, **칠한 버튼 하나 + 그 아래 회색 "나중에"**.
 * 박스 버튼 두 개를 나란히 두지 않는다 — 둘이 같은 무게로 보이면 무엇을 권하는지 흐려진다.
 */
export default function AlertModal({
  visible,
  onClose,
  top,
  title,
  body,
  primaryLabel,
  onPrimary,
  laterLabel,
}: AlertModalProps) {
  const { colors } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable
        style={[styles.backdrop, { backgroundColor: DIM }]}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="닫기"
      />
      <View style={styles.center} pointerEvents="box-none">
        <View
          accessibilityViewIsModal
          style={[styles.card, { backgroundColor: colors.surfaceSolid, shadowColor: CARD_SHADOW }, !laterLabel && styles.cardSolo]}
        >
          {top}
          {!!title && <Text style={[styles.title, { color: colors.textPrimary }, !!top && styles.titleAfterTop]}>{title}</Text>}
          {typeof body === 'string' ? (
            <Text style={[styles.body, { color: colors.textSecondary }]}>{body}</Text>
          ) : (
            body
          )}
          <View style={styles.primary}>
            <PrimaryButton label={primaryLabel} onPress={onPrimary} />
          </View>
          {!!laterLabel && (
            <View style={styles.later}>
              <TextLink tone="muted" label={laterLabel} onPress={onClose} />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 26,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: radius.sheetTop,
    paddingTop: 26,
    paddingHorizontal: 22,
    paddingBottom: 12,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 1,
    shadowRadius: 50,
    elevation: 12,
  },
  // "나중에"가 없으면 그 자리만큼 아래 여백을 준다.
  cardSolo: {
    paddingBottom: 22,
  },
  title: {
    fontSize: 17,
    ...weight(700),
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  titleAfterTop: {
    marginTop: 14,
  },
  body: {
    fontSize: 14,
    lineHeight: 14 * 1.55,
    textAlign: 'center',
    marginTop: 8,
  },
  primary: {
    alignSelf: 'stretch',
    marginTop: 20,
  },
  later: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
