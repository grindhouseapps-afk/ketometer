import { useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Bar, Button, Card, Label, Row, T } from '@/components/ui';
import { Flame, Gauge, Sparks } from '@/components/Gauge';
import { C } from '@/theme';
import { useMeter } from '@/lib/useMeter';
import { useStore, type Preset } from '@/lib/store';
import { syncWhoop } from '@/lib/whoop';
import { ago, hoursLabel, n0, pct } from '@/lib/format';
import { KCAL_PER_G_CARB } from '@/engine/constants.ts';

export default function Today() {
  const insets = useSafeAreaInsets();
  const { state: m, now } = useMeter();
  const presets = useStore((s) => s.presets);
  const addFood = useStore((s) => s.addFood);
  const source = useStore((s) => s.source);
  const whoopConnected = useStore((s) => s.whoopConnected);
  const syncedAt = useStore((s) => s.whoopSyncedAt);
  const goal = useStore((s) => s.profile.goalBodyFatPct);
  const celebrated = useStore((s) => s.celebratedGoal);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (m?.goalReached && celebrated !== goal) router.push('/supernova');
  }, [m?.goalReached, celebrated, goal]);

  if (!m) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <T color={C.muted}>Add a weigh-in to start your meter.</T>
        <Button title="Add weigh-in" style={{ marginTop: 16, alignSelf: 'stretch' }} onPress={() => router.push('/weigh-in')} />
      </View>
    );
  }

  const stage2 = m.stage === 2;
  const liverFrac = m.liverKcal / m.liverCapKcal;
  const fatFrac = m.fatGoalStartKcal ? (m.fatToGoalKcal ?? 0) / m.fatGoalStartKcal : 0;
  const flameOpacity = Math.max(0.05, Math.pow(1 - liverFrac, 1.7) * 0.85);
  const fatShare = m.fatShareNow;
  const deviceLabel = source === 'whoop' && whoopConnected ? 'WHOOP' : 'ESTIMATE';

  const chip =
    source === 'whoop'
      ? whoopConnected
        ? { dot: C.ok, text: `WHOOP · ${syncedAt ? `synced ${ago(syncedAt, now)}` : 'syncing…'}` }
        : { dot: C.accent, text: 'WHOOP · not connected' }
      : { dot: C.accentSoft, text: 'Manual activity · resting estimate' };

  const logPreset = (p: Preset) => {
    const carbKcal = Math.max(0, p.netCarbsG) * KCAL_PER_G_CARB;
    const toLiver = Math.min(carbKcal, m.liverCapKcal - m.liverKcal);
    const toMuscle = Math.min(carbKcal - toLiver, m.muscleCapKcal - m.muscleKcal);
    const backOnFat = p.kcal - toLiver - toMuscle;
    addFood({ at: Date.now(), name: p.name, netCarbsG: p.netCarbsG, proteinG: p.proteinG, fatG: p.fatG, kcal: p.kcal });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    if (stage2) {
      setFeedback(`${p.name} · ${n0(backOnFat)} kcal back on the fat count${toLiver > 0 ? ` · +${n0(toLiver)} to liver` : ''}`);
    } else {
      setFeedback(toLiver > 0 ? `${p.name} · +${n0(toLiver)} kcal to liver tank` : `${p.name} · no carbs, tank unchanged`);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await syncWhoop().catch(() => {});
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.bg }}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 24, paddingBottom: 32, gap: 24 }}
      refreshControl={source === 'whoop' && whoopConnected ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} /> : undefined}
    >
      <Row>
        <T w={600} size={17}>
          Today
        </T>
        <Label color={stage2 ? C.accent : C.muted}>{stage2 ? 'STAGE 2 · FAT BURN' : 'STAGE 1 · LIVER GLYCOGEN'}</Label>
      </Row>

      <View style={{ alignItems: 'center', gap: 12 }}>
        <Gauge fraction={stage2 ? fatFrac : liverFrac}>
          <Flame opacity={stage2 ? 1 : flameOpacity} live={stage2} />
          <T w={300} size={50} style={{ marginTop: 4, lineHeight: 56 }} accessibilityLabel={stage2 ? `${n0(m.fatToGoalKcal ?? 0)} kilocalories of fat to ${goal} percent` : `${n0(m.kcalToFatBurn)} kilocalories to fat burn`}>
            {stage2 ? n0(m.fatToGoalKcal ?? 0) : n0(m.kcalToFatBurn)}
          </T>
          <T size={13} color={C.muted}>
            {stage2 ? `kcal of fat to ${goal}%` : 'kcal to fat burn'}
          </T>
          {stage2 ? <Sparks /> : null}
        </Gauge>
        <T size={14} color={C.accentSoft}>
          {stage2
            ? `You're in fat burn · ${pct(fatShare)} of your burn is fat`
            : m.hoursToFatBurn != null
              ? `Fat burn in ~${hoursLabel(m.hoursToFatBurn)} at your pace`
              : 'Keep carbs low to reach fat burn'}
        </T>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/sources')}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingHorizontal: 16, borderWidth: 1, borderColor: C.line, borderRadius: 22 }}
        >
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: chip.dot }} />
          <T size={13} color={C.muted}>
            {chip.text}
          </T>
          <T size={13} color={C.accent}>
            Sources ›
          </T>
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Card highlight={!stage2} style={{ flex: 1, gap: 6, opacity: stage2 ? 0.55 : 1 }}>
          <Label style={{ fontSize: 11, letterSpacing: 1.1 }}>STAGE 1 · LIVER</Label>
          <T size={22}>
            {stage2 ? 'Empty' : n0(m.liverKcal)}{' '}
            <T size={14} color={C.muted}>
              / {n0(m.liverCapKcal)}
            </T>
          </T>
          <T size={12} color={C.muted}>
            Muscle {n0(m.muscleKcal)} / {n0(m.muscleCapKcal)}
          </T>
        </Card>
        <Card highlight={stage2} style={{ flex: 1, gap: 6 }}>
          <Label style={{ fontSize: 11, letterSpacing: 1.1 }}>STAGE 2 · FAT</Label>
          <T size={22}>
            {m.fatToGoalKcal != null ? n0(m.fatToGoalKcal) : '—'}{' '}
            <T size={14} color={C.muted}>
              to {goal}%
            </T>
          </T>
          <T size={12} color={C.accentSoft}>
            −{n0(m.today.fatBurnedKcal)} kcal of fat today
          </T>
        </Card>
      </View>

      <Card style={{ marginTop: -12 }}>
        <Row style={{ alignItems: 'baseline' }}>
          <Label>FUEL MIX RIGHT NOW</Label>
          <T size={14}>
            <T w={600} size={14} color={C.accent}>
              {pct(fatShare)} fat
            </T>
            <T size={14} color={C.muted}>
              {' '}
              · {pct(1 - fatShare)} glycogen
            </T>
          </T>
        </Row>
        <View style={{ flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', gap: 2 }}>
          <View style={{ flex: fatShare, backgroundColor: C.accent }} />
          <View style={{ flex: 1 - fatShare, backgroundColor: C.muted }} />
        </View>
        <T size={12} color={C.muted}>
          {stage2 ? 'Carbs refill the liver tank by their calories only.' : 'Climbs to ~90% fat as your liver tank empties.'}
        </T>
      </Card>

      <Card style={{ gap: 14 }}>
        <Row>
          <Label>TODAY'S MACROS</Label>
          <T size={13} color={C.muted}>
            Eaten <T size={13}>{n0(m.today.eatenKcal)}</T> · Burned <T size={13}>{n0(m.today.burnedKcal)}</T>
          </T>
        </Row>
        <Macro name="Protein" value={`${n0(m.today.proteinG)} / ${m.proteinTargetG} g`} frac={m.today.proteinG / m.proteinTargetG} color={C.accent} />
        <Macro name="Net carbs" value={`${n0(m.today.netCarbsG)} / ${m.netCarbBudgetG} g`} frac={m.today.netCarbsG / m.netCarbBudgetG} color={C.accentSoft} />
        <Macro name="Fat" value={`${n0(m.today.fatG)} g`} frac={m.today.fatG / 120} color={C.muted} />
        <View style={{ alignSelf: 'flex-end', borderWidth: 1, borderColor: C.line, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 }}>
          <T size={11} color={C.muted} style={{ letterSpacing: 0.8 }}>
            BURN · {deviceLabel}
          </T>
        </View>
      </Card>

      <View style={{ gap: 12 }}>
        <Row>
          <Label>MY FOODS · TAP TO LOG</Label>
        </Row>
        {feedback ? (
          <T size={12} color={C.accentSoft}>
            {feedback}
          </T>
        ) : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {presets.slice(0, 6).map((p) => (
            <Pressable
              key={p.id}
              accessibilityRole="button"
              accessibilityLabel={`Log ${p.name}`}
              onPress={() => logPreset(p)}
              style={({ pressed }) => ({ flexBasis: '47%', flexGrow: 1, height: 56, backgroundColor: C.card, borderWidth: 1, borderColor: pressed ? C.accent : C.line, borderRadius: 12, paddingHorizontal: 12, justifyContent: 'center', gap: 2 })}
            >
              <T size={14} numberOfLines={1}>
                {p.name}
              </T>
              <T size={12} color={C.muted} numberOfLines={1}>
                {p.proteinG}P · {p.netCarbsG}C · {p.fatG}F · {p.kcal} kcal
              </T>
            </Pressable>
          ))}
        </View>
        <Button title="+ Log food" onPress={() => router.push('/food')} />
      </View>
      <T size={11} color={C.muted} style={{ textAlign: 'center' }}>
        Estimates from a simplified model of your metabolism. Not medical advice.
      </T>
    </ScrollView>
  );
}

function Macro({ name, value, frac, color }: { name: string; value: string; frac: number; color: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Row>
        <T size={15}>{name}</T>
        <T size={15}>{value}</T>
      </Row>
      <Bar fraction={frac} color={color} />
    </View>
  );
}
