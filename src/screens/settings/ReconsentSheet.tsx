import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import ConsentSheet, { Agreed } from './ConsentSheet';
import { useTheme } from '../../theme/useTheme';
import { typography, weight } from '../../theme/tokens';
import { TERMS_VERSION, changesSince, formatTermsDate } from '../../data/terms';
import { agreeTerms } from '../../api/auth';
import { ApiError } from '../../api/client';
import { useAuthStore } from '../../store/useAuthStore';
import { useReconsentStore } from '../../store/useReconsentStore';
import { useToastStore } from '../../store/useToastStore';

const NONE: Agreed = { terms: false, privacy: false, health: false };

/**
 * 바뀐 약관에 다시 동의(명세 5-5). 가입 시트를 그대로 쓰고 위에 "바뀐 점"만 얹는다 —
 * 동의하는 문서와 체크 방식이 가입 때와 같아야 무엇에 동의하는지 헷갈리지 않는다.
 * 닫으면 "나중에"다. 쓰던 기능은 그대로고, 설정 > 약관 및 정책에서 다시 열 수 있다.
 */
export default function ReconsentSheet() {
  const { colors } = useTheme();
  const open = useReconsentStore((s) => s.open);
  const hide = useReconsentStore((s) => s.hide);
  const token = useAuthStore((s) => s.accessToken);
  const agreedVersion = useAuthStore((s) => s.agreedTermsVersion);
  const setAgreedTermsVersion = useAuthStore((s) => s.setAgreedTermsVersion);
  const showToast = useToastStore((s) => s.show);

  const [agreed, setAgreed] = useState<Agreed>(NONE);
  const [busy, setBusy] = useState(false);

  // 열 때마다 체크를 비운다. 지난번에 체크하다 닫은 상태가 남아 있으면 읽지 않고 동의하게 된다.
  useEffect(() => {
    if (open) setAgreed(NONE);
  }, [open]);

  const changes = changesSince(agreedVersion ?? null);

  const confirm = async () => {
    if (!token || busy) return;
    setBusy(true);
    try {
      const user = await agreeTerms(TERMS_VERSION, token);
      setAgreedTermsVersion(user.agreedTermsVersion ?? TERMS_VERSION);
      hide();
      showToast('바뀐 약관에 동의했어요');
    } catch (e) {
      if (e instanceof ApiError && e.code === 'TERMS_OUTDATED') showToast('약관이 또 바뀌었어요. 앱을 새 버전으로 받아 주세요');
      else if (e instanceof ApiError) showToast(e.message);
      else showToast('동의를 보내지 못했어요. 잠시 후 다시 시도해 주세요');
    } finally {
      setBusy(false);
    }
  };

  const intro = (
    <View style={[styles.intro, { backgroundColor: colors.fillMuted }]}>
      <Text style={[styles.introTitle, { color: colors.textPrimary }]}>
        {formatTermsDate(TERMS_VERSION)}부터 약관이 바뀌었어요
      </Text>
      {changes.map((v) =>
        v.changes.map((c) => (
          <Text key={v.version + c} style={[styles.change, { color: colors.textPrimary }]}>
            · {c}
          </Text>
        ))
      )}
      <Text style={[styles.introNote, { color: colors.textSecondary }]}>
        동의하지 않아도 지금 쓰던 기능은 그대로 쓸 수 있어요. 나중에 설정 › 약관 및 정책에서 다시 동의할 수 있어요.
      </Text>
    </View>
  );

  return (
    <ConsentSheet
      visible={open}
      agreed={agreed}
      onChange={setAgreed}
      onConfirm={confirm}
      onClose={hide}
      busy={busy}
      title="약관이 바뀌었어요"
      confirmLabel="동의하고 계속"
      intro={intro}
    />
  );
}

const styles = StyleSheet.create({
  intro: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    gap: 4,
  },
  introTitle: {
    fontSize: 15,
    ...weight(700),
    marginBottom: 4,
  },
  change: {
    ...typography.bodySm,
    lineHeight: 20,
  },
  introNote: {
    ...typography.caption,
    lineHeight: 18,
    marginTop: 6,
  },
});
