import { View } from 'react-native';
import { router } from 'expo-router';
import { Sheet } from '@/components/Sheet';
import { Button, Row, T } from '@/components/ui';
import { C } from '@/theme';
import { useMeter } from '@/lib/useMeter';
import { useStore } from '@/lib/store';
import { ago, dateTimeLabel, n0, n1, pct } from '@/lib/format';
import { leanMassLb, lbToKg } from '@/engine/formulas.ts';
import { FAT_SHARE_EMPTY, FAT_SHARE_FULL, LIVER_GLYCOGEN_G, MUSCLE_GLYCOGEN_G_PER_KG_LEAN } from '@/engine/constants.ts';

function Item({ dot, title, value, sub, last }: { dot: string; title: string; value: string; sub: string; last?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', gap: 12, paddingVertical: 14, borderTopWidth: 1, borderTopColor: C.divider, borderBottomWidth: last ? 1 : 0, borderBottomColor: C.divider }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dot, marginTop: 6 }} />
      <View style={{ flex: 1, gap: 3 }}>
        <Row>
          <T w={600} size={15} style={{ flexShrink: 1 }}>
            {title}
          </T>
          <T size={15}>{value}</T>
        </Row>
        <T size={12} color={C.muted} style={{ lineHeight: 17 }}>
          {sub}
        </T>
      </View>
    </View>
  );
}

export default function Sources() {
  const { state: m, now } = useMeter();
  const s = useStore();
  if (!m) return <Sheet title="Where your numbers come from">{null}</Sheet>;

  const device = s.source === 'whoop' && s.whoopConnected;
  const r = m.latestReading;
  const lean = leanMassLb(r.weightLb, r.bodyFatPct);
  const goal = s.profile.goalBodyFatPct;
  const restKcal = (m.bmrPerDay / 24) * m.today.restFilledHours;
  const hours = m.today.restFilledHours;

  return (
    <Sheet
      title="Where your numbers come from"
      footer={
        <>
          <Button
            kind="outline"
            title="Manage sources"
            onPress={() => {
              router.back();
              router.navigate('/settings');
            }}
          />
          <T size={12} color={C.muted} style={{ textAlign: 'center' }}>
            Estimates from a simplified model of your metabolism. Not medical advice.
          </T>
        </>
      }
    >
      <View>
        <Item
          dot={device ? C.ok : C.accentSoft}
          title="Calories burned"
          value={`${n0(m.today.burnedKcal)} kcal`}
          sub={device ? `WHOOP · today so far · ${s.whoopSyncedAt ? `synced ${ago(s.whoopSyncedAt, now)}` : 'not synced yet'}` : 'Resting estimate plus activity you log · today so far'}
        />
        <Item
          dot={C.accentSoft}
          title="Resting estimate (BMR)"
          value={`${n0(restKcal)} kcal`}
          sub={`${device ? `Filled in for the last ${n1(hours)} h WHOOP hasn't covered` : `Used for ${n1(hours)} h today`} · Mifflin-St Jeor · ${n0(m.bmrPerDay)} kcal/day`}
        />
        <Item
          dot={C.text}
          title="Body composition"
          value={`${n1(r.weightLb)} lb · ${n1(r.bodyFatPct)}%`}
          sub={`Your weigh-in · ${dateTimeLabel(+r.at)} · resizes the tanks, never refills them`}
        />
        <Item
          dot={C.accent}
          title="Liver tank"
          value={`${n0(m.liverKcal)} / ${n0(m.liverCapKcal)} kcal`}
          sub={`${LIVER_GLYCOGEN_G} g × 4 kcal · full at your start (${dateTimeLabel(s.startAt)}) · gates fat burn`}
        />
        <Item
          dot={C.ember}
          title="Muscle tank"
          value={`${n0(m.muscleKcal)} / ${n0(m.muscleCapKcal)} kcal`}
          sub={`${n1(lbToKg(lean))} kg lean × ${MUSCLE_GLYCOGEN_G_PER_KG_LEAN} g × 4 kcal · drained by workouts`}
        />
        <Item
          dot={C.accent}
          title="Fuel mix"
          value={`${pct(m.fatShareNow)} fat`}
          sub={`~${pct(FAT_SHARE_FULL)} fat with a full liver tank, rising to ~${pct(FAT_SHARE_EMPTY)} when it's empty`}
        />
        <Item
          dot={C.accent}
          title="Fat to goal"
          value={m.fatToGoalKcal != null ? `${n0(m.fatToGoalKcal)} kcal` : 'Set a goal'}
          sub={`(${n1(r.weightLb)} − ${n1(lean)} ÷ ${(1 - goal / 100).toFixed(3)}) lb × 3,500 · burned − eaten − glycogen used`}
        />
        <Item dot={C.muted} title="Food" value={`${n0(m.today.eatenKcal)} kcal`} sub="Logged by you · net carbs refill the tanks, the rest adds back to fat" last />
      </View>
    </Sheet>
  );
}
