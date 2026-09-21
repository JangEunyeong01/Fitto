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
import { selection, typography } from '../../theme/tokens';
import { useAppStore } from '../../store/useAppStore';
import { personaCopy, waterStageNames } from '../../copy/persona';
import { dateKey } from '../../utils/timeOfDay';
import { FITTO_FACE } from '../../theme/assets';

const WATER_INTERVALS = [1, 2, 3, 4];
const MOVE_THRESHOLDS = [30, 45, 60, 90];

// 갤러리에서 단계를 누르면 그 단계로 보일 수 있는 값 중 가운데 값을 골라 오늘 물 섭취량에 반영한다.
// getWaterStageIndex(v, goal) = floor((v/goal)*5) 이므로 stage i의 범위는 [goal*i/5, goal*(i+1)/5).
function targetWaterForStage(stage: number, goal: number): number {
  const mid = (goal * (stage + 0.5)) / 5;
  return Math.round(mid / 50) * 50;
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const alarms = useAppStore((s) => s.alarms);
  const setAlarms = useAppStore((s) => s.setAlarms);
  const persona = useAppStore((s) => s.persona);
  const goal = useAppStore((s) => s.goals.water);
  const today = useAppStore((s) => s.dailyRecords[dateKey()]?.water ?? 0);
  const addWater = useAppStore((s) => s.addWater);

  // 갤러리에서 마지막으로 눌러본 단계. 안 눌러봤으면 오늘 실제 단계를 보여준다.
  const [previewStage, setPreviewStage] = useState<number | null>(null);
  const remain = Math.max(0, goal - today);
  // friendly/strict는 인자를 안 받고 neutral만 remain을 쓴다 — 다른 화면(KcalCard)과 같은 방식으로 캐스팅한다.
  const waterAlarmFn = personaCopy.waterAlarm[persona] as (v: { remain: number }) => string;
  const previewCopy = waterAlarmFn({ remain });

  const activeStage = previewStage ?? Math.min(4, Math.floor((today / goal) * 5));
  const stageComment = personaCopy.waterStage[persona][activeStage];

  const pickStage = (i: number) => {
    const target = targetWaterForStage(i, goal);
    addWater(dateKey(), target - today);
    setPreviewStage(i);
  };

  return (
    <ScreenBackground showTimeGradient={false}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <DetailHeader title="알림" />

        <GlassCard style={styles.card}>
          <ToggleRow label="물 마시기" value={alarms.water} onChange={(v) => setAlarms({ water: v })} colors={colors} />
          {alarms.water && (
            <ChipRow
              options={WATER_INTERVALS}
              value={alarms.waterEvery}
              onChange={(v) => setAlarms({ waterEvery: v })}
              suffix="시간마다"
            />
          )}
        </GlassCard>

        <GlassCard style={styles.card}>
          <ToggleRow label="식사 기록" desc={alarms.mealTimes.join(' · ')} value={alarms.meal} onChange={(v) => setAlarms({ meal: v })} colors={colors} />
        </GlassCard>

        <GlassCard style={styles.card}>
          <ToggleRow label="움직임" value={alarms.move} onChange={(v) => setAlarms({ move: v })} colors={colors} />
          {alarms.move && (
            <ChipRow
              options={MOVE_THRESHOLDS}
              value={alarms.moveAfter}
              onChange={(v) => setAlarms({ moveAfter: v })}
              suffix="분 이상 앉아 있으면"
            />
          )}
        </GlassCard>

        <GlassCard style={styles.card}>
          <ToggleRow label="체중 기록" desc="매주 월요일 아침" value={alarms.weigh} onChange={(v) => setAlarms({ weigh: v })} colors={colors} />
        </GlassCard>

        <GlassCard style={styles.card}>
          <ToggleRow label="주간 리포트" desc="일요일 저녁" value={alarms.report} onChange={(v) => setAlarms({ report: v })} colors={colors} />
        </GlassCard>

        <GlassCard style={styles.card}>
          <ToggleRow label="방해 금지 시간" value={alarms.quiet} onChange={(v) => setAlarms({ quiet: v })} colors={colors} />
          {alarms.quiet && (
            <View style={styles.quietRow}>
              <TimeField label="시작" value={alarms.quietFrom} onChange={(v) => setAlarms({ quietFrom: v })} colors={colors} />
              <Text style={[styles.quietDash, { color: colors.textSecondary }]}>–</Text>
              <TimeField label="종료" value={alarms.quietTo} onChange={(v) => setAlarms({ quietTo: v })} colors={colors} />
            </View>
          )}
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
          <View style={styles.galleryRow}>
            {waterStageNames.map((name, i) => {
              const on = i === activeStage;
              return (
                <Pressable key={name} onPress={() => pickStage(i)} style={styles.galleryCell}>
                  <View
                    style={[
                      styles.galleryCircle,
                      { borderColor: on ? selection.border : colors.borderDivider, backgroundColor: on ? selection.bg : colors.surfaceSubtle },
                    ]}
                  >
                    <FittoCharacter current={i} goal={4} size={34} variant="face" glow={false} />
                  </View>
                  <Text style={[styles.galleryLabel, { color: colors.textSecondary }]} numberOfLines={1}>
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
    <View style={styles.toggleRow}>
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
        <SelectChip
          key={n}
          label={`${n}${suffix}`}
          selected={n === value}
          onPress={() => onChange(n)}
          size="sm"
        />
      ))}
    </View>
  );
}

function TimeField({
  label,
  value,
  onChange,
  colors,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  colors: any;
}) {
  const [text, setText] = useState(value);
  const commit = () => {
    // HH:MM 형태가 아니면 원래 값으로 되돌린다.
    if (/^([01]\d|2[0-3]):[0-5]\d$/.test(text)) onChange(text);
    else setText(value);
  };
  return (
    <View style={styles.timeCol}>
      <Text style={[styles.timeLabel, { color: colors.textSecondary }]}>{label}</Text>
      <TextField
        size="sm"
        value={text}
        onChangeText={setText}
        onEndEditing={commit}
        onBlur={commit}
        placeholder="22:30"
        center
      />
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
  cardTitle: typography.sectionTitle,
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  toggleTextCol: {
    flex: 1,
    gap: 3,
  },
  rowLabel: typography.rowLabel,
  rowDesc: typography.caption,
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  quietRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    marginTop: 12,
  },
  quietDash: {
    ...typography.rowLabel,
    marginBottom: 12,
  },
  timeCol: {
    flex: 1,
    gap: 6,
  },
  timeLabel: typography.label,
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
    ...typography.body,
    flex: 1,
  },
  galleryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  galleryCell: {
    alignItems: 'center',
    gap: 6,
    width: 56,
  },
  galleryCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryLabel: typography.micro,
  stageComment: {
    ...typography.bodySm,
    marginTop: 12,
  },
});
