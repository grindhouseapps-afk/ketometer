import { Alert, Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card, Label, Row, T } from '@/components/ui';
import { C } from '@/theme';
import { useStore } from '@/lib/store';
import { timeLabel, n0 } from '@/lib/format';

function Action({ title, sub, onPress }: { title: string; sub: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => ({ backgroundColor: C.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: pressed ? C.accent : C.card, gap: 4 })}>
      <Row>
        <T w={600} size={16}>
          {title}
        </T>
        <T size={18} color={C.accent}>
          +
        </T>
      </Row>
      <T size={13} color={C.muted}>
        {sub}
      </T>
    </Pressable>
  );
}

export default function Log() {
  const insets = useSafeAreaInsets();
  const presets = useStore((s) => s.presets);
  const removePreset = useStore((s) => s.removePreset);
  const foods = useStore((s) => s.foods);
  const activities = useStore((s) => s.activities);
  const hasDevice = useStore((s) => s.source === 'whoop' && s.whoopConnected);
  const dayStart = new Date().setHours(0, 0, 0, 0);
  const todayFoods = foods.filter((f) => f.at >= dayStart);
  const todayActs = activities.filter((a) => a.at >= dayStart);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 24, paddingBottom: 32, gap: 16 }}>
      <T w={600} size={17}>
        Log
      </T>
      <Action title="Food" sub="Protein, net carbs, fat. Saved foods log in one tap." onPress={() => router.push('/food')} />
      <Action
        title="Activity"
        sub={hasDevice ? 'WHOOP tracks your workouts. Add one here only if it missed it.' : 'Walks, runs, lifts and more, estimated from your weight.'}
        onPress={() => router.push('/activity')}
      />
      <Action title="Weigh-in" sub="Weight and body fat %. Resizes your tanks, never restarts the meter." onPress={() => router.push('/weigh-in')} />

      <Label style={{ marginTop: 8 }}>LOGGED TODAY</Label>
      <Card style={{ gap: 0, paddingVertical: 4 }}>
        {todayFoods.length + todayActs.length === 0 ? (
          <T size={14} color={C.muted} style={{ paddingVertical: 12 }}>
            Nothing yet today.
          </T>
        ) : null}
        {[...todayFoods.map((f) => ({ id: f.id, at: f.at, title: f.name, sub: `${f.proteinG}P · ${f.netCarbsG}C · ${f.fatG}F`, kcal: `${n0(f.kcal)} kcal` })), ...todayActs.map((a) => ({ id: a.id, at: a.at, title: `${a.kind[0].toUpperCase()}${a.kind.slice(1)} · ${a.minutes} min`, sub: a.countIt ? 'Counted' : 'Not counted (WHOOP tracks it)', kcal: `−${n0(a.grossKcal)} kcal` }))]
          .sort((a, b) => b.at - a.at)
          .map((e, i) => (
            <Row key={e.id} style={{ paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderTopColor: C.divider }}>
              <View style={{ flex: 1, gap: 2 }}>
                <T size={15}>{e.title}</T>
                <T size={12} color={C.muted}>
                  {timeLabel(e.at)} · {e.sub}
                </T>
              </View>
              <T size={14}>{e.kcal}</T>
            </Row>
          ))}
      </Card>

      <Label style={{ marginTop: 8 }}>MY FOODS</Label>
      <Card style={{ gap: 0, paddingVertical: 4 }}>
        {presets.length === 0 ? (
          <T size={14} color={C.muted} style={{ paddingVertical: 12 }}>
            Foods you save show up here and on Today.
          </T>
        ) : null}
        {presets.map((p, i) => (
          <Row key={p.id} style={{ paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderTopColor: C.divider }}>
            <View style={{ flex: 1, gap: 2 }}>
              <T size={15}>{p.name}</T>
              <T size={12} color={C.muted}>
                {p.proteinG}P · {p.netCarbsG}C · {p.fatG}F · {p.kcal} kcal
              </T>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Remove ${p.name}`}
              onPress={() => Alert.alert('Remove from My Foods?', p.name, [{ text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: () => removePreset(p.id) }])}
              style={{ minHeight: 44, justifyContent: 'center', paddingLeft: 12 }}
            >
              <T size={13} color={C.muted}>
                Remove
              </T>
            </Pressable>
          </Row>
        ))}
      </Card>
    </ScrollView>
  );
}
