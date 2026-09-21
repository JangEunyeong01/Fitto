import React from 'react';
import { View, Text, Pressable, Image, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme/useTheme';
import { alpha, radius, typography, weight } from '../../theme/tokens';
import { personaCopy } from '../../copy/persona';
import { useAppStore } from '../../store/useAppStore';
import { useToastStore } from '../../store/useToastStore';
import { newId } from '../../utils/id';
import { dateKey } from '../../utils/timeOfDay';
import { FITTO_HELLO } from '../../theme/assets';

interface LayDownModalProps {
  visible: boolean;
  onClose: () => void;
}

const DIM = 'rgba(20,32,42,0.42)';
const CARD_SHADOW = 'rgba(20,32,42,0.3)';

/** "5분만 걷기"로 기록되는 운동. 문구와 실제 기록을 맞춘다. */
const WALK_MINUTES = 5;
const WALK_KCAL = 25;

// README 12장 + 프로토타입: 운동 기록이 3일 비면 뜨는 모달.
// 전용 "드러누운 포즈" 일러스트가 아직 없어 기본 캐릭터를 눕혀서 쓴다(프로토타입도 동일).
export default function LayDownModal({ visible, onClose }: LayDownModalProps) {
  const { colors, primaryGradient } = useTheme();
  const persona = useAppStore((s) => s.persona);
  const addExercise = useAppStore((s) => s.addExercise);
  const showToast = useToastStore((s) => s.show);

  if (!visible) return null;

  const title = personaCopy.layDownTitle[persona]();
  const body = personaCopy.layDownBody[persona]();

  const handleWalk = () => {
    addExercise(dateKey(), { id: newId(), name: '걷기', minutes: WALK_MINUTES, kcal: WALK_KCAL });
    showToast(`걷기 ${WALK_MINUTES}분 기록 완료`);
    onClose();
  };

  return (
    <View style={styles.overlay}>
      <Pressable style={[styles.backdrop, { backgroundColor: DIM }]} onPress={onClose} />
      <View style={styles.center} pointerEvents="box-none">
        <View style={[styles.card, { backgroundColor: colors.surfaceSolid, borderColor: colors.borderGlass, shadowColor: CARD_SHADOW }]}>
          <View style={styles.charSlot}>
            <Image source={FITTO_HELLO} style={styles.char} resizeMode="contain" accessibilityLabel="드러누운 피또" />
          </View>

          <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>{body}</Text>

          <View style={styles.buttonRow}>
            <Pressable onPress={onClose} style={[styles.laterBtn, { borderColor: colors.borderDivider }]}>
              <Text style={[styles.laterLabel, { color: colors.textSecondary }]}>나중에</Text>
            </Pressable>
            <Pressable onPress={handleWalk} style={styles.walkWrap}>
              <LinearGradient colors={primaryGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.walkBtn}>
                <Text style={[styles.walkLabel, { color: colors.textOnPrimary }]}>{WALK_MINUTES}분만 걷기</Text>
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
    zIndex: 945,
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
    alignItems: 'center',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 1,
    shadowRadius: 50,
    elevation: 12,
  },
  charSlot: {
    height: 104,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  char: {
    width: 132,
    height: 132,
    // 프로토타입과 같은 각도로 눕힌다.
    transform: [{ rotate: '98deg' }, { translateY: 6 }],
  },
  title: {
    fontSize: 17,
    ...weight(700),
    marginTop: 14,
    textAlign: 'center',
  },
  body: {
    ...typography.body,
    marginTop: 7,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 9,
    marginTop: 18,
    alignSelf: 'stretch',
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
  walkWrap: {
    flex: 1,
  },
  walkBtn: {
    height: 46,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  walkLabel: {
    ...typography.sectionTitle,
  },
});
