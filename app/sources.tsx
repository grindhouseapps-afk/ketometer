import { useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { Button, T } from '../src/components/ui.tsx';
import { sourceName, syncAgo } from '../src/data/sync.ts';
import { LIVER_GLYCOGEN_G, MUSCLE_GLYCOGEN_G_PER_KG_LEAN } from '../src/engine/constants.ts';
import { leanMassLb, lbToKg } from '../src/engine/formulas.ts';
import { useApp } from '../src/store.ts';
import { C, S, fmt } from '../src/theme.ts';
import { useMeter } from '../src/useMeter.ts';

function Row({ dot, title, value, sub }: { dot: string; title: string; value: string; sub: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 12, paddingVertical: 14, borderTopWidth: 1, borderTopColor: C.divider }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dot, marginTop: 7 }} />
      <View style={{ flex: 1, gap: 3 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
          <T weight="semibold">{title}</T>
          <T>{value}</T>
        </View>
        <T size={12} color={C.smoke} style={{ lineHeight: 17 }}>{sub}</T>
      </View>
    </View>
  );
}

export default function Sources() {
  const m = useMeter();
  const s = useApp();
  const router = useRouter();
  if (!m) return null;
  const r = m.latestReading;
  const lean = leanMassLb(r.weightLb, r.bodyFatPct);
  const start = s.startAt ? new Date(s.startAt) : null;
  const goal = s.goalBodyFatPct ?? 0;
  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.graphite }} contentContainerStyle={{ padding: S.margin, paddingTop: 28, gap: 4 }}>
      <T size={20} weight="semibold" style={{ marginBottom: 16 }}>Where your numbers come from</T>
      <Row dot={s.source === 'manual' ? C.smoke : C.ok} title="Calories burned" value={`${fmt(m.today.burnedKcal)} kcal`}
        sub={s.source === 'manual' ? 'Resting estimate plus activities you log' : `${sourceName(s.source)} · today so far · ${syncAgo(s.lastSyncAt)}`} />
      <Row dot={C.glow} title="Resting estimate (BMR)" value={`${fmt(m.today.restFilledHours * m.bmrPerDay / 24)} kcal`}
        sub={`Mifflin-St Jeor: 10 × kg + 6.25 × cm − 5 × age ${s.sex === 'male' ? '+ 5' : '− 161'} = ${fmt(m.bmrPerDay)} kcal/day · filled in for ${m.today.restFilledHours.toFixed(1)} h without source data`} />
      <Row dot={C.bone} title="Body composition" value={`${r.weightLb.toFixed(1)} lb · ${r.bodyFatPct.toFixed(1)}%`}
        sub={`${new Date(r.at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} · resizes the tanks, never refills them`} />
      <Row dot={C.ember} title="Liver tank" value={`${fmt(m.liverKcal)} / ${fmt(m.liverCapKcal)} kcal`}
        sub={`${LIVER_GLYCOGEN_G} g × 4 kcal · full at your start${start ? ` (${start.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })})` : ''} · gates fat burn`} />
      <Row dot={C.coal} title="Muscle tank" value={`${fmt(m.muscleKcal)} / ${fmt(m.muscleCapKcal)} kcal`}
        sub={`${lbToKg(lean).toFixed(1)} kg lean × ${MUSCLE_GLYCOGEN_G_PER_KG_LEAN} g × 4 kcal · drained mostly by workouts`} />
      <Row dot={C.ember} title="Fuel mix" value={`${Math.round(m.fatShareNow * 100)}% fat`} sub="About 45% fat with a full liver tank, rising to about 90% when it's empty" />
      <Row dot={C.ember} title="Fat to goal" value={`${fmt(m.fatToGoalKcal ?? 0)} kcal`}
        sub={`(${r.weightLb.toFixed(1)} − ${lean.toFixed(1)} ÷ ${(1 - goal / 100).toFixed(3)}) lb × 3,500 at your latest reading, minus fat burned since`} />
      <Row dot={C.smoke} title="Food" value={`${fmt(m.today.eatenKcal)} kcal`} sub="Logged by you · net carbs refill the tanks, the rest adds back to fat" />
      <View style={{ height: 1, backgroundColor: C.divider }} />
      <View style={{ gap: 8, marginTop: 20 }}>
        <Button kind="outline" title="Manage sources" onPress={() => { router.back(); router.push('/your-data'); }} />
        <T size={12} color={C.smoke} style={{ textAlign: 'center', marginTop: 8 }}>Estimates from a simplified model of your metabolism. Not medical advice.</T>
      </View>
    </ScrollView>
  );
}
