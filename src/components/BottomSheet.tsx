import React from 'react';
import { View, Text, Pressable, ScrollView, Modal, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from './Icon';
import { useTheme } from '../theme/useTheme';
import { overlay, typography } from '../theme/tokens';

interface BottomSheetProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  /** 아래에 고정되는 버튼 자리(저장 등). 내용이 길어 스크롤돼도 늘 보인다. */
  footer?: React.ReactNode;
}

/**
 * 바텀시트 공통 틀(시안 규칙: 흰 면, 위 모서리 24, 손잡이 36×4, 제목 17 왼쪽 · 닫기 × 오른쪽, 뒤는 어둡게).
 * 시트마다 따로 그리다 보니 여백·손잡이·닫기 버튼 크기가 제각각이라 한 군데로 모았다.
 * 뒤를 누르거나 안드로이드 뒤로가기를 누르면 닫힌다.
 */
export default function BottomSheet({ visible, title, onClose, children, footer }: BottomSheetProps) {
  const { colors, radius } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable
        style={[styles.backdrop, { backgroundColor: overlay.sheetBackdrop }]}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="닫기"
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.kav}
        pointerEvents="box-none"
      >
        <View
          accessibilityViewIsModal
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surfaceSolid,
              borderTopLeftRadius: radius.sheetTop,
              borderTopRightRadius: radius.sheetTop,
              paddingBottom: footer ? 0 : insets.bottom + 16,
            },
          ]}
        >
          <View style={[styles.grabber, { backgroundColor: colors.borderDivider }]} />
          <View style={styles.headerRow}>
            <Text style={[typography.sheetTitle, styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
              {title}
            </Text>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="닫기" style={styles.closeBtn}>
              <Icon name="close" size={20} color={colors.textSecondary} />
            </Pressable>
          </View>
          <ScrollView style={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
          {footer && <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>{footer}</View>}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** 시트 좌우 여백. 카드 안쪽 여백(18)과 같다. */
export const SHEET_PAD = 18;

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  kav: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '88%',
    paddingTop: 10,
    paddingHorizontal: SHEET_PAD,
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    marginBottom: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    height: 44,
  },
  title: {
    flex: 1,
  },
  closeBtn: {
    width: 44,
    height: 44,
    marginRight: -12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 내용이 길면 이쪽이 줄고 아래 버튼은 남는다.
  body: {
    flexShrink: 1,
  },
  footer: {
    paddingTop: 12,
  },
});
