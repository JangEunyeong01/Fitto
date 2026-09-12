import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, View, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenBackground from '../../components/ScreenBackground';
import HomeHeader from './HomeHeader';
import HeroRow from './HeroRow';
import KcalCard from './cards/KcalCard';
import WaterCard from './cards/WaterCard';
import ActivityCard from './cards/ActivityCard';
import StepsCard from './cards/StepsCard';
import ExerciseCard from './cards/ExerciseCard';
import WeekCard from './cards/WeekCard';
import PeriodCard from './cards/PeriodCard';
import LayDownModal from './LayDownModal';
import CardOrderSheet from './CardOrderSheet';
import BirthdayBanner from './BirthdayBanner';
import { useAppStore, CardId } from '../../store/useAppStore';
import { useCardOrderSheetStore } from '../../store/useCardOrderSheetStore';
import { useBirthdayModalStore } from '../../store/useBirthdayModalStore';
import { useTutorialStore, type TutorialTargetId } from '../../store/useTutorialStore';
import { dateKey, isBirthdayToday } from '../../utils/timeOfDay';
import { hasNoExerciseForDays } from '../../utils/health';

// B 히어로(확정 기본안): 물·걸음만 반폭 2열, 나머지는 전폭.
const HALF_WIDTH_CARDS = new Set<CardId>(['water', 'steps']);

const CARD_COMPONENTS: Record<CardId, React.ComponentType> = {
  kcal: KcalCard,
  water: WaterCard,
  act: ActivityCard,
  steps: StepsCard,
  ex: ExerciseCard,
  week: WeekCard,
  period: PeriodCard,
};

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const cardOrder = useAppStore((s) => s.cardOrder);
  const cardHidden = useAppStore((s) => s.cardHidden);
  const periodOn = useAppStore((s) => s.periodOn);
  const periodSetupDone = useAppStore((s) => s.periodSetupDone);
  const seedMockToday = useAppStore((s) => s.seedMockToday);
  const profile = useAppStore((s) => s.profile);
  const setBirthdayShownYear = useAppStore((s) => s.setBirthdayShownYear);
  const sheetVisible = useCardOrderSheetStore((s) => s.open);
  const showSheet = useCardOrderSheetStore((s) => s.show);
  const hideSheet = useCardOrderSheetStore((s) => s.hide);
  const showBirthday = useBirthdayModalStore((s) => s.show);
  const setTutorialTarget = useTutorialStore((s) => s.setTarget);
  const startTutorial = useTutorialStore((s) => s.start);
  const tutorialOpen = useTutorialStore((s) => s.open);
  const tutorialStep = useTutorialStore((s) => s.step);
  const tutorialDone = useAppStore((s) => s.tutorialDone);
  const setTutorialDone = useAppStore((s) => s.setTutorialDone);
  const dailyRecords = useAppStore((s) => s.dailyRecords);
  const layDownShownDate = useAppStore((s) => s.layDownShownDate);
  const setLayDownShownDate = useAppStore((s) => s.setLayDownShownDate);
  const [layDownOpen, setLayDownOpen] = useState(false);

  // 튜토리얼 하이라이트 프레임이 가리킬 실제 화면 좌표. onLayout의 좌표는 부모 기준이라
  // 스크롤 오프셋이 빠지므로 measureInWindow로 절대 좌표를 받는다.
  const slotRefs = useRef<Partial<Record<CardId, View | null>>>({});

  const measureCard = (cardId: CardId, targetId: TutorialTargetId) => {
    slotRefs.current[cardId]?.measureInWindow((x, y, width, height) => {
      // 웹에서는 레이아웃 직후 0이 잡히는 경우가 있어 유효한 값일 때만 등록한다.
      if (width > 0 && height > 0) setTutorialTarget(targetId, { x, y, width, height });
    });
  };

  // 배너는 생일 당일 내내 떠 있고 몇 번이든 다시 열 수 있다.
  // birthdayShownYear는 올해 축하를 이미 전달했다는 기록으로, 배너 노출을 막지는 않는다.
  const isBirthday = isBirthdayToday(profile.birthdayMonth, profile.birthdayDay);

  const openBirthday = () => {
    showBirthday();
    setBirthdayShownYear(new Date().getFullYear());
  };

  useEffect(() => {
    seedMockToday(dateKey());
  }, []);

  // README: 운동 기록이 3일 비면 드러눕기 모달을 띄운다. 하루 한 번까지만.
  // 튜토리얼과 겹치지 않게 튜토리얼이 끝난 뒤에만 확인한다.
  useEffect(() => {
    if (!tutorialDone || tutorialOpen) return;
    const today = dateKey();
    if (layDownShownDate === today) return;
    if (!hasNoExerciseForDays(dailyRecords, 3)) return;
    setLayDownOpen(true);
    setLayDownShownDate(today);
  }, [tutorialDone, tutorialOpen, dailyRecords, layDownShownDate]);

  // 온보딩을 막 끝낸 사용자에게 한 번만 보여준다. 이후에는 설정에서 다시 볼 수 있다.
  useEffect(() => {
    if (tutorialDone) return;
    const timer = setTimeout(() => {
      startTutorial();
      setTutorialDone(true);
    }, 600); // 카드 레이아웃 측정이 끝난 뒤 띄운다.
    return () => clearTimeout(timer);
  }, [tutorialDone]);

  // 명세 F-017: 생리 카드는 기능이 켜져 있고 시작일을 입력한 뒤에만 보인다. 기본값 예측을 사실처럼 보여주지 않으려고.
  const visibleCards = cardOrder.filter(
    (id) => !cardHidden.includes(id) && (id !== 'period' || (periodOn && periodSetupDone))
  );

  /** 한 카드가 어떤 튜토리얼 단계의 대상인지. 첫 카드는 "카드 순서" 단계가 가리킨다. */
  const targetIdFor = (cardId: CardId): TutorialTargetId | null => {
    if (cardId === 'kcal') return 'kcal';
    if (cardId === 'water') return 'water';
    return null;
  };

  const measureAllTargets = () => {
    measureCard('kcal', 'kcal');
    measureCard('water', 'water');
    if (visibleCards[0]) measureCard(visibleCards[0], 'firstCard');
  };

  // 튜토리얼이 열리는 시점의 스크롤 위치 기준으로 다시 재야 프레임이 카드에 정확히 붙는다.
  useEffect(() => {
    if (!tutorialOpen) return;
    measureAllTargets();
  }, [tutorialOpen, tutorialStep]);

  return (
    <ScreenBackground>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 14, paddingBottom: 108 }]}
        showsVerticalScrollIndicator={false}
      >
        <HomeHeader />
        {isBirthday && <BirthdayBanner name={profile.nickname} onPress={openBirthday} />}
        <HeroRow />

        <Pressable onLongPress={showSheet} delayLongPress={550} style={styles.grid}>
          {visibleCards.map((id, index) => {
            const Card = CARD_COMPONENTS[id];
            const half = HALF_WIDTH_CARDS.has(id);
            return (
              <View
                key={id}
                style={half ? styles.slotHalf : styles.slotFull}
                ref={(node) => {
                  slotRefs.current[id] = node;
                }}
                onLayout={() => {
                  const target = targetIdFor(id);
                  if (target) measureCard(id, target);
                  if (index === 0) measureCard(id, 'firstCard');
                }}
              >
                <Card />
              </View>
            );
          })}
        </Pressable>

      </ScrollView>

      <CardOrderSheet visible={sheetVisible} onClose={hideSheet} />
      <LayDownModal visible={layDownOpen} onClose={() => setLayDownOpen(false)} />
    </ScreenBackground>
  );
}

const GUTTER = 6; // 카드 간격 12px의 절반을 각 슬롯 좌우에 준다.

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
  },
  // B 히어로: 반폭 카드(물·걸음)가 같은 행에 나란히 흐르도록 wrap 그리드로 둔다.
  // gap 대신 슬롯 패딩 + 컨테이너 음수 마진을 쓰는 이유는 RN에 calc()가 없어
  // width:50% 와 gap 을 함께 쓰면 행이 넘치기 때문이다.
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'stretch',
    marginHorizontal: -GUTTER,
  },
  slotFull: {
    width: '100%',
    paddingHorizontal: GUTTER,
    paddingBottom: 12,
  },
  slotHalf: {
    width: '50%',
    paddingHorizontal: GUTTER,
    paddingBottom: 12,
  },
  cardSlot: {
    width: '100%',
  },
});
