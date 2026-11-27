import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gauge } from '../../src/components/Gauge.tsx';
import { Bar, Button, Card, Caps, Row, T } from '../../src/components/ui.tsx';
import { sourceName, syncAgo } from '../../src/data/sync.ts';
import { notifyNow } from '../../src/notifications.ts';
import { useApp } from '../../src/store.ts';
import { C, F, S, fmt } from '../../src/theme.ts';
import { useMeter } from '../../src/useMeter.ts';
import { walkKcal } from '../../src/engine/formulas.ts';
import { KCAL_PER_G_CARB } from '../../src/engine/constants.ts';

function hoursText(h: number) {
  if (h < 1) return `~${Math.max(5, Math.round(h * 60 / 5) * 5)} min`;
  return `~${Math.round(h)} h`;
}

export default function Today() {
  const m = useMeter();
  const s = useApp();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [feedback, setFeedback] = useState<string | null>(null);
  const prevStage = useRef(m?.stage);

  // Fat-burn moment: haptic + notification once per refill cycle.
  useEffect(() => {
    if (m && prevStage.current === 1 && m.stage === 2) {
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      notifyNow("You're in fat burn", 'From here, most of every calorie you burn comes off fat.').catch(() => {});
    }
    prevStage.current = m?.stage;
  }, [m?.stage]);

  useEffect(() => {
    if (m?.goalReached && !s.celebratedGoal) router.push('/goal');
  }, [m?.goalReached]);

  if (!m) return <View style={{ flex: 1, backgroundColor: C.charcoal }} />;

  const goal = s.goalBodyFatPct ?? 0;
  const stage1 = m.stage === 1;
  const remaining = stage1 ? m.liverKcal / m.liverCapKcal : m.fatGoalStartKcal ? (m.fatToGoalKcal ?? 0) / m.fatGoalStartKcal : 0;
  const weight = m.latestReading.weightLb;
  const fatPct = Math.round(m.fatShareNow * 100);

  const logPreset = (p: (typeof s.presets)[number]) => {
    const liverRoom = m.liverCapKcal - m.liverKcal;
    const carbKcal = p.netCarbsG * KCAL_PER_G_CARB;
    s.addFood({ at: new Date().toISOString(), name: p.name, netCarbsG: p.netCarbsG, proteinG: p.proteinG, fatG: p.fatG, kcal: p.kcal });
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    const toTank = Math.min(carbKcal, liverRoom);
    setFeedback(toTank > 0 ? `+${Math.round(toTank)} kcal to liver tank` : stage1 ? 'Tank unchanged' : `${p.name} · ${p.kcal} kcal back on the fat count`);
    setTimeout(() => setFeedback(null), 4000);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.charcoal }} contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: S.margin, paddingBottom: 32, gap: S.section }}>
      <Row>
        <T size={17} weight="semibold">Today</T>
        <Caps color={stage1 ? C.smoke : C.ember}>{stage1 ? 'STAGE 1 · LIVER GLYCOGEN' : 'STAGE 2 · FAT BURN'}</Caps>
      </Row>

      <View style={{ alignItems: 'center', gap: 12 }}>
        <Gauge
          remaining={remaining}
          value={stage1 ? m.kcalToFatBurn : m.fatToGoalKcal ?? 0}
          label={stage1 ? 'kcal to fat burn' : `kcal of fat to ${goal.toFixed(1)}%`}
          flameProgress={1 - m.liverKcal / m.liverCapKcal}
          lit={!stage1}
        />
        <T size={14} color={C.glow}>
          {stage1
            ? m.hoursToFatBurn != null ? `Fat burn in ${hoursText(m.hoursToFatBurn)} at your pace` : 'Keep fasting to reach fat burn'
            : `You're in fat burn · ${fatPct}% of your burn is fat`}
        </T>
        <Pressable onPress={() => router.push('/sources')} accessibilityRole="button" accessibilityLabel="Where your numbers come from"
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingHorizontal: 16, borderRadius: 22, borderWidth: 1, borderColor: C.ash }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: s.source === 'manual' ? C.smoke : C.ok }} />
          <T size={13} color={C.smoke}>{s.source === 'manual' ? 'Manual · BMR estimate' : `${sourceName(s.source)} · ${syncAgo(s.lastSyncAt)}`}</T>
          <T size={13} color={C.ember}>Sources ›</T>
        </Pressable>
      </View>

      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Card active={stage1} dim={!stage1} style={{ flex: 1, gap: 6 }}>
            <Caps style={{ fontSize: 11 }}>STAGE 1 · LIVER</Caps>
            <T size={22}>{stage1 ? fmt(m.liverKcal) : 'Empty'} <Text style={{ fontSize: 14, color: C.smoke }}>/ {fmt(m.liverCapKcal)}</Text></T>
            <T size={12} color={C.smoke}>Muscle {fmt(m.muscleKcal)} / {fmt(m.muscleCapKcal)}</T>
          </Card>
          <Card active={!stage1} style={{ flex: 1, gap: 6 }}>
            <Caps style={{ fontSize: 11 }}>STAGE 2 · FAT</Caps>
            <T size={22}>{fmt(m.fatToGoalKcal ?? 0)} <Text style={{ fontSize: 14, color: C.smoke }}>to {goal.toFixed(1)}%</Text></T>
            <T size={12} color={C.glow}>{m.today.fatBurnedKcal >= 0 ? '−' : '+'}{fmt(Math.abs(m.today.fatBurnedKcal))} kcal of fat today</T>
          </Card>
        </View>
        <Card style={{ gap: 12 }}>
          <Row>
            <Caps>FUEL MIX RIGHT NOW</Caps>
            <T size={14}><Text style={{ color: C.ember, fontFamily: F.semibold }}>{fatPct}% fat</Text><Text style={{ color: C.smoke }}> · {100 - fatPct}% glycogen</Text></T>
          </Row>
          <View style={{ flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', gap: 2 }}>
            <View style={{ flex: fatPct, backgroundColor: C.ember }} />
            <View style={{ flex: 100 - fatPct, backgroundColor: C.smoke }} />
          </View>
          <T size={12} color={C.smoke}>{stage1 ? 'Climbs to ~90% fat as your liver tank empties.' : 'Carbs refill the liver tank by their calories only.'}</T>
        </Card>
      </View>

      <Card style={{ gap: 14 }}>
        <View style={{ gap: 6 }}>
          <Row>
            <Caps>TODAY'S MACROS</Caps>
            <View style={{ borderWidth: 1, borderColor: C.ash, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 }}>
              <T size={10} color={C.smoke} style={{ letterSpacing: 0.8 }}>{s.source === 'manual' ? 'ESTIMATE' : sourceName(s.source).toUpperCase()}</T>
            </View>
          </Row>
          <T size={13} color={C.smoke}>Eaten <Text style={{ color: C.bone }}>{fmt(m.today.eatenKcal)}</Text> kcal · Burned <Text style={{ color: C.bone }}>{fmt(m.today.burnedKcal)}</Text> kcal</T>
        </View>
        {[
          { name: 'Protein', v: m.today.proteinG, max: m.proteinTargetG, color: C.ember, unit: ` / ${m.proteinTargetG} g` },
          { name: 'Net carbs', v: m.today.netCarbsG, max: m.netCarbBudgetG, color: m.today.netCarbsG > m.netCarbBudgetG ? C.ember : C.glow, unit: ` / ${m.netCarbBudgetG} g` },
          { name: 'Fat', v: m.today.fatG, max: 120, color: C.smoke, unit: ' g' },
        ].map((r) => (
          <View key={r.name} style={{ gap: 6 }}>
            <Row><T>{r.name}</T><T>{Math.round(r.v)}{r.unit}</T></Row>
            <Bar value={r.v} max={r.max} color={r.color} />
          </View>
        ))}
      </Card>

      {stage1 && (
        <Card style={{ gap: 6 }}>
          <Caps>WAYS TO BURN IT</Caps>
          <T size={14}>Burn {fmt(m.kcalToFatBurn)} kcal more to reach fat burn, about {(m.kcalToFatBurn / walkKcal(weight, 1)).toFixed(1)} mi walking.</T>
          <Pressable onPress={() => router.push('/log?tab=activity')} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center' }}>
            <T size={13} color={C.ember}>See activities for 250 · 500 · 1,000 kcal ›</T>
          </Pressable>
        </Card>
      )}

      <View style={{ gap: 12 }}>
        <Row>
          <Caps>MY FOODS · TAP TO LOG</Caps>
          {feedback ? <T size={12} color={C.glow}>{feedback}</T> : null}
        </Row>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {s.presets.slice(0, 4).map((p) => (
            <Pressable key={p.id} onPress={() => logPreset(p)} accessibilityRole="button" accessibilityLabel={`Log ${p.name}`}
              style={({ pressed }) => ({ width: '47.8%', height: 56, backgroundColor: C.graphite, borderWidth: 1, borderColor: C.ash, borderRadius: 12, paddingHorizontal: 12, justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}>
              <T size={14} numberOfLines={1}>{p.name}</T>
              <T size={12} color={C.smoke} numberOfLines={1}>{p.proteinG}P · {p.netCarbsG}C · {p.fatG}F · {p.kcal} kcal</T>
            </Pressable>
          ))}
        </View>
        <Button title="+ Log food" onPress={() => router.push('/log?tab=food')} />
      </View>
      <T size={11} color={C.smoke} style={{ textAlign: 'center' }}>Estimates from a simplified model. Not medical advice.</T>
    </ScrollView>
  );
}
