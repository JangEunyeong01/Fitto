import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, TextInput, Image, ScrollView, StyleSheet, AppState } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tabBarSpace } from '../../navigation/TabBar';
import GlassCard from '../../components/GlassCard';
import ScreenBackground from '../../components/ScreenBackground';
import DetailHeader from '../detail/DetailHeader';
import ToggleSwitch from '../../components/ToggleSwitch';
import FittoCharacter from '../../components/FittoCharacter';
import SelectChip from '../../components/SelectChip';
import TextField from '../../components/TextField';
import { useTheme } from '../../theme/useTheme';
import { brand, typography, weight } from '../../theme/tokens';
import { useAppStore, type Alarms } from '../../store/useAppStore';
import TextLink from '../../components/TextLink';
import { useToastStore } from '../../store/useToastStore';
import {
  NOTIFICATIONS_SUPPORTED,
  UNSUPPORTED_REASON,
  getPermission,
  requestPermission,
  scheduleTestNotification,
  openSystemSettings,
  canScheduleExact,
  openExactAlarmSettings,
  type PermissionState,
} from '../../notifications/schedule';
import { personaCopy, waterStageNames } from '../../copy/persona';
import { dateKey } from '../../utils/timeOfDay';
import { FITTO_FACE } from '../../theme/assets';

const WATER_INTERVALS = [1, 2, 3, 4];

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const alarms = useAppStore((s) => s.alarms);
  const setAlarms = useAppStore((s) => s.setAlarms);
  const persona = useAppStore((s) => s.persona);
  const periodOn = useAppStore((s) => s.periodOn);
  const showToast = useToastStore((s) => s.show);

  const [permission, setPermission] = useState<PermissionState>('undetermined');
  const [exact, setExact] = useState(canScheduleExact);
  useEffect(() => {
    getPermission().then(setPermission);
    // 설정 앱에서 정확한 알람을 켜고 돌아오면 안내를 바로 거둔다. 예약은 useNotificationRunner가 다시 건다.
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') setExact(canScheduleExact());
    });
    return () => sub.remove();
  }, []);
  const anyOn = alarms.water || alarms.meal || alarms.weigh || alarms.report || alarms.period;

  /**
   * 알림을 켤 때 권한을 묻는다. 앱을 켜자마자 묻지 않고, 켜고 싶은 순간에 묻는다 — 이유를 알고 고를 수 있게.
   * 거절해도 켠 설정은 남긴다. 나중에 권한을 주면 그대로 울린다(위 안내 줄에서 설정으로 갈 수 있다).
   */
  const turn = async (patch: Partial<Alarms>) => {
    setAlarms(patch);
    const turningOn = Object.values(patch).some((v) => v === true);
    if (!turningOn || !NOTIFICATIONS_SUPPORTED || permission === 'granted') return;
    const next = permission === 'undetermined' ? await requestPermission() : permission;
    setPermission(next);
  };
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
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 14, paddingBottom: tabBarSpace(insets.bottom) }]}
        showsVerticalScrollIndicator={false}
      >
        <DetailHeader title="알림" />

        {/* 웹엔 기기 알림이 없다. 권한을 거절했으면 OS가 다시 묻지 않으니 설정 앱으로 보낸다. */}
        {!NOTIFICATIONS_SUPPORTED ? (
          <Text style={[styles.notice, { color: colors.textSecondary }]}>{UNSUPPORTED_REASON}</Text>
        ) : permission === 'denied' && anyOn ? (
          <View style={styles.noticeRow}>
            <Text style={[styles.notice, styles.noticeText, { color: colors.textDanger }]}>
              알림 권한이 꺼져 있어서 울리지 않아요.
            </Text>
            <TextLink label="설정 열기" onPress={openSystemSettings} />
          </View>
        ) : permission === 'granted' && anyOn && !exact ? (
          // 안드로이드 14부터 기본으로 꺼져 있다. 울리긴 하니 빨간 경고가 아니라 회색 안내로.
          <View style={styles.noticeRow}>
            <Text style={[styles.notice, styles.noticeText, { color: colors.textSecondary }]}>
              알림이 조금 늦거나 한꺼번에 올 수 있어요.
            </Text>
            <TextLink label="정확한 시간에 받기" onPress={openExactAlarmSettings} />
          </View>
        ) : null}

        {/* 개발 빌드에서만. 정각까지 기다리지 않고 알림 표시와 누르면 이동을 확인한다. */}
        {__DEV__ && NOTIFICATIONS_SUPPORTED && (
          <View style={styles.noticeRow}>
            <Text style={[styles.notice, styles.noticeText, { color: colors.textSecondary }]}>개발 확인용</Text>
            <TextLink
              label="10초 뒤 테스트 알림"
              onPress={async () => {
                const ok = await scheduleTestNotification();
                showToast(ok ? '10초 뒤에 알림이 와요. 앱을 닫고 기다려 보세요' : '알림 권한을 먼저 허용해 주세요');
              }}
            />
          </View>
        )}

        {/* 알림 여섯 개를 카드 한 장에 줄로 모은다(시안 19). 카드 여섯 장이면 스위치만 줄지어 떠 있는 화면이 된다. */}
        <GlassCard style={styles.card} noPadding>
          <View style={styles.block}>
            <ToggleRow label="물 마시기" value={alarms.water} onChange={(v) => turn({ water: v })} colors={colors} />
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
            <ToggleRow label="식사 기록" desc={alarms.mealTimes.join(' · ')} value={alarms.meal} onChange={(v) => turn({ meal: v })} colors={colors} />
          </View>
          {/* 움직임 알림은 숨겼다. "1시간 앉아 있으면"을 알려면 움직임 센서가 필요한데 걸음 센서가 아직 연결 전이다.
              동작하지 않는 스위치는 고장처럼 보인다(글씨 크기 줄을 숨긴 것과 같은 이유). 값은 store에 그대로 둔다. */}
          <Divider colors={colors} />
          <View style={styles.block}>
            <ToggleRow label="체중 기록" desc="매주 월요일 아침" value={alarms.weigh} onChange={(v) => turn({ weigh: v })} colors={colors} />
          </View>
          <Divider colors={colors} />
          <View style={styles.block}>
            <ToggleRow label="주간 리포트" desc="일요일 저녁" value={alarms.report} onChange={(v) => turn({ report: v })} colors={colors} />
          </View>
          {periodOn && (
            <>
              <Divider colors={colors} />
              <View style={styles.block}>
                <ToggleRow label="생리 예정일" desc="하루 전 아침" value={alarms.period} onChange={(v) => turn({ period: v })} colors={colors} />
                {alarms.period && (
                  <View style={styles.subRow}>
                    <View style={styles.toggleTextCol}>
                      <Text style={[styles.subLabel, { color: colors.textPrimary }]}>잠금화면에 내용 보이기</Text>
                      <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>
                        {alarms.periodPreview ? '"내일 생리 예정일이에요"로 보여요' : '"피또가 알려줄 게 있어요"로만 보여요'}
                      </Text>
                    </View>
                    <ToggleSwitch value={alarms.periodPreview} onChange={(v) => setAlarms({ periodPreview: v })} />
                  </View>
                )}
              </View>
            </>
          )}
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
  notice: {
    ...typography.caption,
    lineHeight: 18,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  noticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  noticeText: {
    flex: 1,
    marginBottom: 0,
  },
  // 생리 알림 아래 한 단계 들어간 줄. 위 줄과 같은 카드 안이라 구분선 없이 붙인다.
  subRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 10,
  },
  subLabel: {
    fontSize: 14,
    ...weight(600),
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
