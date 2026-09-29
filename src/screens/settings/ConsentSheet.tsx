import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import BottomSheet from '../../components/BottomSheet';
import PrimaryButton from '../../components/PrimaryButton';
import { RadioMark } from '../onboarding/OptionRow';
import { useTheme } from '../../theme/useTheme';
import { typography, weight } from '../../theme/tokens';
import { TERMS, TermsId } from '../../data/terms';

export type Agreed = Record<TermsId, boolean>;

interface ConsentSheetProps {
  visible: boolean;
  agreed: Agreed;
  onChange: (next: Agreed) => void;
  onView: (id: TermsId) => void;
  onConfirm: () => void;
  onClose: () => void;
  busy?: boolean;
}

/**
 * 가입 직전 약관 동의 시트(시안 35). 셋 다 필수라 모두 체크해야 버튼이 켜진다.
 * 체크 상태는 부르는 쪽이 들고 있다 — "보기"로 본문을 보고 돌아와도 체크가 남아야 해서다.
 */
export default function ConsentSheet({ visible, agreed, onChange, onView, onConfirm, onClose, busy }: ConsentSheetProps) {
  const { colors } = useTheme();
  const all = TERMS.every((t) => agreed[t.id]);
  const setAll = (v: boolean) => onChange({ terms: v, privacy: v, health: v });

  return (
    <BottomSheet
      visible={visible}
      title="약관 동의"
      onClose={onClose}
      footer={<PrimaryButton label="동의하고 계정 만들기" onPress={onConfirm} loading={busy} disabled={!all} />}
    >
      <Pressable
        onPress={() => setAll(!all)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: all }}
        style={[styles.row, styles.allRow]}
      >
        <RadioMark on={all} />
        <Text style={[styles.allLabel, { color: colors.textPrimary }]}>전체 동의</Text>
      </Pressable>
      <View style={[styles.divider, { backgroundColor: colors.borderDivider }]} />

      {TERMS.map((t, i) => (
        <React.Fragment key={t.id}>
          {i > 0 && <View style={[styles.divider, { backgroundColor: colors.borderDivider }]} />}
          <View style={styles.row}>
            {/* 체크 영역과 "보기"를 나눠 둔다. 줄 전체를 누르면 체크, 오른쪽 글씨만 본문으로 간다. */}
            <Pressable
              onPress={() => onChange({ ...agreed, [t.id]: !agreed[t.id] })}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: agreed[t.id] }}
              accessibilityLabel={`필수, ${t.title}`}
              style={styles.checkArea}
            >
              <RadioMark on={agreed[t.id]} />
              <Text style={[styles.label, { color: colors.textPrimary }]}>
                <Text style={[styles.required, { color: colors.textSecondary }]}>필수 </Text>
                {t.title}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => onView(t.id)}
              accessibilityRole="link"
              accessibilityLabel={`${t.title} 보기`}
              style={styles.viewBtn}
            >
              <Text style={[styles.view, { color: colors.textSecondary }]}>보기</Text>
            </Pressable>
          </View>
        </React.Fragment>
      ))}

      <Text style={[styles.note, { color: colors.textSecondary }]}>
        몸무게·질환 같은 건강 정보는 목표 칼로리 계산과 기록에만 써요.
      </Text>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
  },
  allRow: {
    minHeight: 56,
    gap: 12,
  },
  allLabel: {
    fontSize: 16,
    ...weight(700),
  },
  checkArea: {
    flex: 1,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  label: {
    flex: 1,
    fontSize: 15,
    ...weight(600),
  },
  required: {
    fontSize: 12,
    ...weight(600),
  },
  viewBtn: {
    minHeight: 44,
    minWidth: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  view: {
    fontSize: 13,
    ...weight(600),
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  note: {
    ...typography.caption,
    lineHeight: 18,
    marginTop: 10,
  },
});
