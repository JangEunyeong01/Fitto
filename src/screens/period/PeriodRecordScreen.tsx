import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { tabBarSpace } from '../../navigation/TabBar';
import ScreenBackground from '../../components/ScreenBackground';
import GlassCard from '../../components/GlassCard';
import SelectChip from '../../components/SelectChip';
import TextField from '../../components/TextField';
import PrimaryButton from '../../components/PrimaryButton';
import DateNavigator from '../../components/DateNavigator';
import Icon from '../../components/Icon';
import DetailHeader from '../detail/DetailHeader';
import { useTheme } from '../../theme/useTheme';
import { typography, weight } from '../../theme/tokens';
import { useAppStore } from '../../store/useAppStore';
import { useToastStore } from '../../store/useToastStore';
import { dateKey } from '../../utils/timeOfDay';
import {
  CUSTOM_MAX,
  CUSTOM_PREFIX,
  PERIOD_TAG_GROUPS,
  frequentTags,
  periodTagLabel,
  type TagGroup,
} from '../../constants/periodTags';

/** 접힌 항목에서 처음 보이는 칩 수. 한 줄 반쯤. */
const COLLAPSED_COUNT = 6;

/**
 * 생리 일일 기록(삼성 헬스 생리 기록 참고). 증상·기분·성생활·점액·부정 출혈·배란 테스트·직접 입력, 복용약·메모.
 *
 * 칩을 누를 때마다 저장하지 않고 화면 안에서만 바꾸다가 "완료"에서 하루치를 한 번에 저장한다.
 * 그래야 "취소"가 의미가 있고 동기화도 한 번만 나간다. 위에서 날짜를 바꾸면 고치던 날은 먼저 저장한다
 * (모르고 날짜를 넘겼다가 입력이 사라지면 더 화난다).
 */
export default function PeriodRecordScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { colors } = useTheme();
  const dailyRecords = useAppStore((s) => s.dailyRecords);
  const setDayPeriodRecord = useAppStore((s) => s.setDayPeriodRecord);
  const showToast = useToastStore((s) => s.show);

  const [date, setDate] = useState<string>(route.params?.date ?? dateKey());
  const saved = dailyRecords[date];
  const [codes, setCodes] = useState<string[]>([]);
  const [medication, setMedication] = useState('');
  const [memo, setMemo] = useState('');
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [customDraft, setCustomDraft] = useState<string | null>(null);

  // 날짜가 바뀌면 그날 저장된 값으로 다시 채운다.
  useEffect(() => {
    setCodes(saved?.periodSymptoms ?? []);
    setMedication(saved?.periodMedication ?? '');
    setMemo(saved?.periodMemo ?? '');
    setCustomDraft(null);
  }, [date]);

  const dirty =
    codes.join() !== (saved?.periodSymptoms ?? []).join() ||
    medication.trim() !== (saved?.periodMedication ?? '') ||
    memo.trim() !== (saved?.periodMemo ?? '');

  const save = () => setDayPeriodRecord(date, { symptoms: codes, medication, memo });

  // 자주 넣은 항목은 화면을 열 때 한 번만 센다. 고르는 도중에 목록이 바뀌면 손가락 밑 칩이 움직인다.
  const frequent = useMemo(() => frequentTags(Object.values(dailyRecords).map((r) => r.periodSymptoms)), []);
  const customs = codes.filter((c) => c.startsWith(CUSTOM_PREFIX));

  const toggle = (code: string, group?: TagGroup) => {
    setCodes((cur) => {
      if (cur.includes(code)) return cur.filter((c) => c !== code);
      // 하나만 고르는 항목이면 같은 분류의 다른 값을 뺀다.
      const rest = group?.single ? cur.filter((c) => !group.options.some((o) => o.code === c)) : cur;
      return [...rest, code];
    });
  };
  const groupOf = (code: string) => PERIOD_TAG_GROUPS.find((g) => g.options.some((o) => o.code === code));

  const addCustom = () => {
    const label = customDraft?.trim().slice(0, CUSTOM_MAX);
    if (label) {
      const code = CUSTOM_PREFIX + label;
      setCodes((cur) => (cur.includes(code) ? cur : [...cur, code]));
    }
    setCustomDraft(null);
  };

  const changeDate = (next: string) => {
    if (dirty) save();
    setDate(next);
  };

  const done = () => {
    if (dirty) {
      save();
      showToast('생리 기록을 저장했어요');
    }
    navigation.goBack();
  };

  return (
    <ScreenBackground showTimeGradient={false}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 14, paddingBottom: tabBarSpace(insets.bottom) + 64 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <DetailHeader title="기록 추가" />
        <DateNavigator date={date} onChange={changeDate} />

        <GlassCard style={styles.card}>
          {frequent.length > 0 && (
            <Section title="자주 넣은 항목" colors={colors}>
              {frequent.map((code) => (
                <SelectChip key={code} label={periodTagLabel(code)} selected={codes.includes(code)} onPress={() => toggle(code, groupOf(code))} />
              ))}
            </Section>
          )}

          {PERIOD_TAG_GROUPS.map((g) => {
            const expanded = !g.collapsible || open[g.key];
            // 접혀 있어도 고른 칩은 보이게 앞쪽 칩에 더한다.
            const shown = expanded
              ? g.options
              : g.options.filter((o, i) => i < COLLAPSED_COUNT || codes.includes(o.code));
            return (
              <Section
                key={g.key}
                title={g.title}
                colors={colors}
                expanded={g.collapsible ? !!open[g.key] : undefined}
                onToggle={g.collapsible ? () => setOpen((o) => ({ ...o, [g.key]: !o[g.key] })) : undefined}
              >
                {shown.map((o) => (
                  <SelectChip key={o.code} label={o.label} selected={codes.includes(o.code)} onPress={() => toggle(o.code, g)} />
                ))}
              </Section>
            );
          })}

          <Section title="기타" colors={colors}>
            {customs.map((code) => (
              <SelectChip key={code} label={periodTagLabel(code)} selected onPress={() => toggle(code)} />
            ))}
            {customDraft === null && <SelectChip label="+ 직접 입력" selected={false} onPress={() => setCustomDraft('')} />}
          </Section>
          {customDraft !== null && (
            <View style={styles.customRow}>
              <View style={styles.customField}>
                <TextField
                  value={customDraft}
                  onChangeText={setCustomDraft}
                  onSubmitEditing={addCustom}
                  placeholder="예: 허벅지 당김"
                  maxLength={CUSTOM_MAX}
                  autoFocus
                />
              </View>
              <PrimaryButton label="추가" variant="text" onPress={addCustom} />
            </View>
          )}
        </GlassCard>

        <GlassCard style={styles.card}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>복용약</Text>
          <TextField clearable value={medication} onChangeText={setMedication} placeholder="선택 · 예: 이부프로펜" maxLength={50} />
          <Text style={[styles.label, styles.labelGap, { color: colors.textSecondary }]}>메모</Text>
          <TextField clearable value={memo} onChangeText={setMemo} placeholder="선택 · 그날 몸 상태를 적어두세요" maxLength={200} />
        </GlassCard>
      </ScrollView>

      {/* 내용이 길어 맨 아래까지 내려가지 않아도 되게 탭바 위에 띄운다(토스트와 같은 높이). */}
      <View style={[styles.footer, { bottom: tabBarSpace(insets.bottom) - 16 }]} pointerEvents="box-none">
        <View style={[styles.footerPill, { backgroundColor: colors.surfaceSolid, shadowColor: colors.shadowColor }]}>
          <PrimaryButton label="취소" variant="text" onPress={() => navigation.goBack()} style={styles.footerBtn} />
          <View style={[styles.footerDivider, { backgroundColor: colors.borderDivider }]} />
          <PrimaryButton label="완료" variant="text" onPress={done} style={styles.footerBtn} />
        </View>
      </View>
    </ScreenBackground>
  );
}

function Section({
  title,
  children,
  colors,
  expanded,
  onToggle,
}: {
  title: string;
  children: React.ReactNode;
  colors: any;
  expanded?: boolean;
  onToggle?: () => void;
}) {
  return (
    <View style={styles.section}>
      <Pressable
        onPress={onToggle}
        disabled={!onToggle}
        style={styles.sectionHead}
        accessibilityRole={onToggle ? 'button' : 'header'}
        accessibilityState={onToggle ? { expanded } : undefined}
        accessibilityLabel={onToggle ? `${title}, ${expanded ? '접기' : '모두 보기'}` : title}
      >
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{title}</Text>
        {onToggle && (
          <View style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }}>
            <Icon name="chevronDown" size={20} color={colors.textSecondary} />
          </View>
        )}
      </Pressable>
      <View style={styles.chips}>{children}</View>
    </View>
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
  section: {
    marginBottom: 18,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 32,
    marginBottom: 6,
  },
  sectionTitle: typography.itemTitle,
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: -6,
  },
  customField: {
    flex: 1,
  },
  label: {
    ...typography.label,
    marginBottom: 6,
  },
  labelGap: {
    marginTop: 14,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  footerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 28,
    paddingHorizontal: 8,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 8,
  },
  footerBtn: {
    minWidth: 96,
  },
  footerDivider: {
    width: StyleSheet.hairlineWidth,
    height: 20,
  },
});
