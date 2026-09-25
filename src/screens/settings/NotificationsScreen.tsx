import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, Image, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GlassCard from '../../components/GlassCard';
import ScreenBackground from '../../components/ScreenBackground';
import DetailHeader from '../detail/DetailHeader';
import ToggleSwitch from '../../components/ToggleSwitch';
import FittoCharacter from '../../components/FittoCharacter';
import SelectChip from '../../components/SelectChip';
import TextField from '../../components/TextField';
import { useTheme } from '../../theme/useTheme';
import { brand, typography, weight } from '../../theme/tokens';
import { useAppStore } from '../../store/useAppStore';
import { personaCopy, waterStageNames } from '../../copy/persona';
import { dateKey } from '../../utils/timeOfDay';
import { FITTO_FACE } from '../../theme/assets';

const WATER_INTERVALS = [1, 2, 3, 4];
const MOVE_THRESHOLDS = [30, 45, 60, 90];

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const alarms = useAppStore((s) => s.alarms);
  const setAlarms = useAppStore((s) => s.setAlarms);
  const persona = useAppStore((s) => s.persona);
  const goal = useAppStore((s) => s.goals.water);
  const today = useAppStore((s) => s.dailyRecords[dateKey()]?.water ?? 0);

  // 갤러리에서 마지막으로 눌러본 단계. 안 눌러봤으면 오늘 실제 단계를 보여준다.
  const [previewStage, setPreviewStage] = useState<number | null>(null);
  const remain = Math.max(0, goal - today);
  // friendly/strict는 인자를 안 받고 neutral만 remain을 쓴다 — 다른 화면(KcalCard)과 같은 방식으로 캐스팅한다.
  const waterAlarmFn = personaCopy.waterAlarm[persona] as (v: { remain: number }) => string;
  const previewCopy = waterAlarmFn({ remain });

  const activeStage = previewStage ?? Math.min(4, Math.floor((today / goal) * 5));
  const stageComment = personaCopy.waterStage[persona][activeStage];

  // 표정만 미리 본다. 예전에는 오늘 물 기록을 그 단계에 맞게 바꿨는데, 미리보기를 누르다 실제 기록이 바뀌면 안 된다.
  const pickStage = (i: number) => setPreviewStage(i);

  return (
    <ScreenBackground showTimeGradient={false}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <DetailHeader title="알림" />

        {/* 알림 여섯 개를 카드 한 장에 줄로 모은다(시안 19). 카드 여섯 장이면 스위치만 줄지어 떠 있는 화면이 된다. */}
        <GlassCard style={styles.card} noPadding>
          <View style={styles.block}>
            <ToggleRow label="물 마시기" value={alarms.water} onChange={(v) => setAlarms({ water: v })} colors={colors} />
            {alarms.water && (
              <ChipRow
                options={WATER_INTERVALS}
                value={alarms.waterEvery}
                onChange={(v) => setAlarms({ waterEvery: v })}
                suffix="시간마다"
              />
            )}
          </View>
          <Divider colors={colors} />
          <View style={styles.block}>
            <ToggleRow label="식사 기록" desc={alarms.mealTimes.join(' · ')} value={alarms.meal} onChange={(v) => setAlarms({ meal: v })} colors={colors} />
          </View>
          <Divider colors={colors} />
          <View style={styles.block}>
            <ToggleRow
              label="움직임"
              desc="이만큼 앉아 있으면 알려요"
              value={alarms.move}
              onChange={(v) => setAlarms({ move: v })}
              colors={colors}
            />
            {alarms.move && (
              <ChipRow
                options={MOVE_THRESHOLDS}
                value={alarms.moveAfter}
                onChange={(v) => setAlarms({ moveAfter: v })}
                suffix="분"
              />
            )}
          </View>
          <Divider colors={colors} />
          <View style={styles.block}>
            <ToggleRow label="체중 기록" desc="매주 월요일 아침" value={alarms.weigh} onChange={(v) => setAlarms({ weigh: v })} colors={colors} />
          </View>
          <Divider colors={colors} />
          <View style={styles.block}>
            <ToggleRow label="주간 리포트" desc="일요일 저녁" value={alarms.report} onChange={(v) => setAlarms({ report: v })} colors={colors} />
          </View>
          <Divider colors={colors} />
          <View style={styles.block}>
            <ToggleRow label="방해 금지 시간" value={alarms.quiet} onChange={(v) => setAlarms({ quiet: v })} colors={colors} />
            {alarms.quiet && (
              <View style={styles.quietRow}>
                <TimeField label="방해 금지 시작" value={alarms.quietFrom} onChange={(v) => setAlarms({ quietFrom: v })} />
                <Text style={[styles.quietDash, { color: colors.textSecondary }]}>–</Text>
                <TimeField label="방해 금지 끝" value={alarms.quietTo} onChange={(v) => setAlarms({ quietTo: v })} />
              </View>
            )}
          </View>
        </GlassCard>

        <GlassCard style={styles.card}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>알림 미리보기</Text>
          <View style={styles.previewRow}>
            <Image source={FITTO_FACE} style={styles.previewFace} resizeMode="contain" />
            <Text style={[styles.previewText, { color: colors.textPrimary }]}>{previewCopy}</Text>
          </View>
        </GlassCard>

        <GlassCard style={styles.card}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>피또 표정 5단계</Text>
          <View style={styles.galleryRow} accessibilityRole="radiogroup">
            {waterStageNames.map((name, i) => {
              const on = i === activeStage;
              return (
                <Pressable
                  key={name}
                  onPress={() => pickStage(i)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={name}
                  style={styles.galleryCell}
                >
                  {/* 고른 표정만 흰 원 + 파란 링 2px(시안 19). 나머지는 테두리 없이 얼굴만. */}
                  <View
                    style={[
                      styles.galleryCircle,
                      on && { backgroundColor: colors.surfaceSolid, borderWidth: 2, borderColor: brand.blue },
                    ]}
                  >
                    <FittoCharacter current={i} goal={4} size={34} variant="face" glow={false} />
                  </View>
                  <Text
                    style={[
                      styles.galleryLabel,
                      { color: on ? colors.textPrimary : colors.textSecondary },
                      weight(on ? 700 : 500),
                    ]}
                    numberOfLines={1}
                  >
                    {name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={[styles.stageComment, { color: colors.textSecondary }]}>{stageComment}</Text>
        </GlassCard>
      </ScrollView>
    </ScreenBackground>
  );
}

function ToggleRow({
  label,
  desc,
  value,
  onChange,
  colors,
}: {
  label: string;
  desc?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  colors: any;
}) {
  return (
    <View style={[styles.toggleRow, desc ? styles.toggleRowTall : null]}>
      <View style={styles.toggleTextCol}>
        <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>{label}</Text>
        {!!desc && <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>{desc}</Text>}
      </View>
      <ToggleSwitch value={value} onChange={onChange} />
    </View>
  );
}

function ChipRow({
  options,
  value,
  onChange,
  suffix,
}: {
  options: number[];
  value: number;
  onChange: (v: number) => void;
  suffix: string;
}) {
  return (
    <View style={styles.chipWrap}>
      {options.map((n) => (
        <SelectChip key={n} label={`${n}${suffix}`} selected={n === value} onPress={() => onChange(n)} />
      ))}
    </View>
  );
}

function Divider({ colors }: { colors: any }) {
  return <View style={[styles.divider, { backgroundColor: colors.borderDivider }]} />;
}

// 시작·끝 두 칸을 "–"로 잇는다. 칸 위 라벨은 빼고(시안 19) 스크린리더용 이름만 남긴다.
function TimeField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [text, setText] = useState(value);
  const commit = () => {
    // HH:MM 형태가 아니면 원래 값으로 되돌린다.
    if (/^([01]\d|2[0-3]):[0-5]\d$/.test(text)) onChange(text);
    else setText(value);
  };
  return (
    <TextField
      value={text}
      onChangeText={setText}
      onEndEditing={commit}
      onBlur={commit}
      placeholder="22:30"
      accessibilityLabel={label}
      maxLength={5}
      center
      style={styles.timeInput}
    />
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
  cardTitle: typography.cardTitle,
  block: {
    paddingHorizontal: 18,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 18,
  },
  toggleRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  toggleRowTall: {
    minHeight: 64,
  },
  toggleTextCol: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 15,
    ...weight(600),
  },
  rowDesc: {
    fontSize: 12,
    marginTop: 3,
  },
  // 줄 바로 밑에 붙인다. 아래 여백 14가 다음 구분선까지의 숨 쉴 자리다.
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: -4,
    paddingBottom: 14,
  },
  quietRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: -4,
    paddingBottom: 16,
  },
  quietDash: {
    fontSize: 15,
    ...weight(600),
  },
  timeInput: {
    width: 96,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
  },
  previewFace: {
    width: 44,
    height: 44,
  },
  previewText: {
    fontSize: 14,
    flex: 1,
  },
  galleryRow: {
    flexDirection: 'row',
    marginTop: 14,
  },
  galleryCell: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  galleryCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  stageComment: {
    fontSize: 13,
    ...weight(400),
    lineHeight: 13 * 1.5,
    textAlign: 'center',
    marginTop: 12,
  },
});
