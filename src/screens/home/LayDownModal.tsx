import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import AlertModal from '../../components/AlertModal';
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

/** "5분만 걷기"로 기록되는 운동. 문구와 실제 기록을 맞춘다. */
const WALK_MINUTES = 5;
const WALK_KCAL = 25;

// 운동 기록이 3일 비면 뜨는 알림(시안 37). 문구는 피또 성격 카피를 그대로 쓴다.
// 전용 "드러누운 포즈" 일러스트가 아직 없어 기본 캐릭터를 눕혀서 쓴다.
export default function LayDownModal({ visible, onClose }: LayDownModalProps) {
  const persona = useAppStore((s) => s.persona);
  const addExercise = useAppStore((s) => s.addExercise);
  const showToast = useToastStore((s) => s.show);

  const handleWalk = () => {
    addExercise(dateKey(), { id: newId(), code: 'walking', name: '걷기', minutes: WALK_MINUTES, kcal: WALK_KCAL });
    showToast(`걷기 ${WALK_MINUTES}분 기록 완료`);
    onClose();
  };

  return (
    <AlertModal
      visible={visible}
      onClose={onClose}
      top={
        <View style={styles.charSlot}>
          <Image source={FITTO_HELLO} style={styles.char} resizeMode="contain" accessibilityLabel="드러누운 피또" />
        </View>
      }
      title={personaCopy.layDownTitle[persona]()}
      body={personaCopy.layDownBody[persona]()}
      primaryLabel={`${WALK_MINUTES}분만 걷기`}
      onPrimary={handleWalk}
      laterLabel="나중에"
    />
  );
}

const styles = StyleSheet.create({
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
});
