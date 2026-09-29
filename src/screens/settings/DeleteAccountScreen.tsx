import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tabBarSpace } from '../../navigation/TabBar';
import { useNavigation } from '@react-navigation/native';
import ScreenBackground from '../../components/ScreenBackground';
import GlassCard from '../../components/GlassCard';
import PrimaryButton from '../../components/PrimaryButton';
import TextLink from '../../components/TextLink';
import DetailHeader from '../detail/DetailHeader';
import { RadioMark } from '../onboarding/OptionRow';
import { ROW_PAD } from './SettingsRow';
import { useTheme } from '../../theme/useTheme';
import { typography, weight } from '../../theme/tokens';
import { useAuthStore } from '../../store/useAuthStore';
import type { DeletionReason } from '../../api/auth';

/** 무엇이 지워지는지 먼저 보여준다. "정말요?"만 두 번 묻는 건 확인이 아니다. */
const ERASED = [
  '식단·운동·물·걸음·체중 기록',
  '생리 주기 설정과 기록',
  '레시피와 운동 루틴',
  '프로필과 목표 설정',
];

const REASONS: { code: DeletionReason; label: string }[] = [
  { code: 'tedious', label: '기록하는 게 번거로워요' },
  { code: 'too_many_notifications', label: '알림이 너무 자주 와요' },
  { code: 'missing_feature', label: '원하는 기능이 없어요' },
  { code: 'other_app', label: '다른 앱을 쓰려고요' },
  { code: 'privacy', label: '개인정보가 걱정돼요' },
  { code: 'other', label: '기타' },
];

/**
 * 회원 탈퇴 1단계(시안 40) — 지워지는 것과 떠나는 이유.
 *
 * 탈퇴는 세 단계다: 여기서 무엇이 지워지는지 보고 → 비밀번호로 본인 확인 → 알림창에서 마지막 확인.
 * 이유는 고르지 않아도 넘어간다. 직접 쓰는 칸은 두지 않았다 — 연락처나 병명을 적으면 익명이 깨진다.
 * 알림 때문에 떠나려는 사람에게는 탈퇴 대신 알림만 줄이는 길을 보여준다.
 */
export default function DeleteAccountScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const authEmail = useAuthStore((s) => s.email);
  const [reason, setReason] = useState<DeletionReason | null>(null);

  return (
    <ScreenBackground showTimeGradient={false}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 14, paddingBottom: tabBarSpace(insets.bottom) }]}
        showsVerticalScrollIndicator={false}
      >
        <DetailHeader title="회원 탈퇴" />

        <GlassCard style={styles.card}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>지워지는 것</Text>
          <Text style={[styles.desc, { color: colors.textSecondary }]}>{authEmail} 계정과 아래 기록이 모두 지워져요.</Text>
          {ERASED.map((item) => (
            <Text key={item} style={[styles.listItem, { color: colors.textPrimary }]}>
              · {item}
            </Text>
          ))}
          <Text style={[styles.warn, { color: colors.textDanger }]}>
            지운 기록은 되돌릴 수 없어요. 이 기기에 있는 기록도 함께 지워지고 온보딩부터 다시 시작해요.
          </Text>
        </GlassCard>

        <GlassCard style={styles.card} noPadding>
          <View style={styles.reasonHead}>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>떠나시는 이유 (선택)</Text>
            <Text style={[styles.hint, { color: colors.textSecondary }]}>답은 피또를 고치는 데만 써요.</Text>
          </View>
          {REASONS.map((r, i) => {
            const on = reason === r.code;
            return (
              <React.Fragment key={r.code}>
                {i > 0 && <View style={[styles.divider, { backgroundColor: colors.borderDivider }]} />}
                <Pressable
                  // 고른 걸 다시 누르면 비운다. 선택 항목이라 안 고른 상태로 돌아갈 길이 있어야 한다.
                  onPress={() => setReason(on ? null : r.code)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  style={({ pressed }) => [styles.reasonRow, pressed && { backgroundColor: colors.fillMuted }]}
                >
                  <RadioMark on={on} />
                  <Text style={[styles.reasonLabel, { color: colors.textPrimary }, on && weight(700)]}>{r.label}</Text>
                </Pressable>
              </React.Fragment>
            );
          })}
          <View style={[styles.fullDivider, { backgroundColor: colors.borderDivider }]} />
          <View style={styles.notifyRow}>
            <Text style={[styles.hint, styles.notifyText, { color: colors.textSecondary }]}>
              알림이 부담스러우면 탈퇴 대신 알림만 줄일 수 있어요
            </Text>
            <TextLink label="알림 설정" onPress={() => navigation.navigate('Notifications')} />
          </View>
        </GlassCard>

        <View style={styles.buttons}>
          <PrimaryButton
            label="다음"
            onPress={() => navigation.navigate('DeleteAccountConfirm', { reason: reason ?? undefined })}
          />
          <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" style={styles.stayBtn}>
            <Text style={[styles.stayLabel, { color: colors.textSecondary }]}>계속 쓸게요</Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
  },
  card: {
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    ...weight(700),
  },
  desc: {
    fontSize: 13,
    lineHeight: 13 * 1.5,
    marginTop: 4,
    marginBottom: 2,
  },
  listItem: {
    fontSize: 14,
    lineHeight: 14 * 1.5,
    marginTop: 4,
  },
  warn: {
    fontSize: 13,
    ...weight(600),
    lineHeight: 13 * 1.5,
    marginTop: 12,
  },
  reasonHead: {
    paddingTop: ROW_PAD,
    paddingHorizontal: ROW_PAD,
    paddingBottom: 2,
  },
  hint: {
    ...typography.caption,
    lineHeight: 18,
    marginTop: 4,
  },
  reasonRow: {
    minHeight: 52,
    paddingHorizontal: ROW_PAD,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reasonLabel: {
    fontSize: 15,
    ...weight(600),
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: ROW_PAD,
  },
  fullDivider: {
    height: StyleSheet.hairlineWidth,
  },
  notifyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 6,
    paddingHorizontal: ROW_PAD,
  },
  notifyText: {
    flex: 1,
    marginTop: 0,
  },
  buttons: {
    marginTop: 8,
  },
  stayBtn: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stayLabel: {
    fontSize: 15,
    ...weight(600),
  },
});
