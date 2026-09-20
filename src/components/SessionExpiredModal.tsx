import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/useTheme';
import { radius, typography, weight, white } from '../theme/tokens';
import { useAuthStore } from '../store/useAuthStore';
import { useOutboxStore } from '../store/useOutboxStore';

const DIM = 'rgba(20,32,42,0.42)';
const CARD_SHADOW = 'rgba(20,32,42,0.3)';

/**
 * 로그인이 풀렸을 때 한 번 띄우는 안내(명세 4장).
 *
 * 예전에는 토큰 갱신이 거절되면 조용히 로그아웃됐다. 화면은 그대로라 알 방법이 없고,
 * 기록은 기기에만 쌓이다가 폰을 바꿀 때 사라진다. 복구하려면 사용자가 움직여야 하는 오류라
 * 토스트가 아니라 확인을 받는 창으로 띄운다.
 */
export default function SessionExpiredModal() {
  const navigation = useNavigation<any>();
  const { colors, primaryGradient } = useTheme();
  const visible = useAuthStore((s) => s.sessionExpired);
  const dismiss = useAuthStore((s) => s.dismissSessionExpired);
  const pendingCount = useOutboxStore((s) => s.items.length);

  if (!visible) return null;

  const goLogin = () => {
    dismiss();
    // 설정 탭 안의 로그인 화면으로 보낸다. 탭을 먼저 옮겨야 그 스택이 살아난다.
    navigation.navigate('Main', { screen: 'Settings', params: { screen: 'Login' } });
  };

  return (
    <View style={styles.overlay}>
      <Pressable style={[styles.backdrop, { backgroundColor: DIM }]} onPress={dismiss} />
      <View style={styles.center} pointerEvents="box-none">
        <View style={[styles.card, { backgroundColor: colors.solid, borderColor: colors.stroke, shadowColor: CARD_SHADOW }]}>
          <Text style={[styles.title, { color: colors.txt }]}>로그인이 풀렸어요</Text>
          <Text style={[styles.body, { color: colors.sub }]}>
            기록은 이 기기에 그대로 있어요.
            {pendingCount > 0 ? ` 아직 올리지 못한 기록 ${pendingCount}건은 다시 로그인하면 이어서 올라가요.` : ''}
          </Text>

          <View style={styles.buttonRow}>
            <Pressable onPress={dismiss} style={[styles.laterBtn, { borderColor: colors.line }]}>
              <Text style={[styles.laterLabel, { color: colors.sub }]}>나중에</Text>
            </Pressable>
            <Pressable onPress={goLogin} style={styles.loginWrap}>
              <LinearGradient colors={primaryGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.loginBtn}>
                <Text style={styles.loginLabel}>다시 로그인</Text>
              </LinearGradient>
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
    zIndex: 950,
  },
  backdrop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 26,
  },
  card: {
    width: '100%',
    borderWidth: 1,
    borderRadius: radius.sheetTop,
    paddingVertical: 24,
    paddingHorizontal: 22,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 1,
    shadowRadius: 50,
    elevation: 12,
  },
  title: {
    fontSize: 16.5,
    ...weight(700),
  },
  body: {
    ...typography.body,
    marginTop: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 9,
    marginTop: 20,
  },
  laterBtn: {
    flex: 1,
    height: 46,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  laterLabel: typography.rowLabel,
  loginWrap: {
    flex: 1,
  },
  loginBtn: {
    height: 46,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginLabel: {
    ...typography.sectionTitle,
    color: white,
  },
});
