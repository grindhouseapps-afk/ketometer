import { useMemo } from 'react';
import { Alert, Pressable, SectionList, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Label, Row, T } from '@/components/ui';
import { C } from '@/theme';
import { useStore } from '@/lib/store';
import { dayLabel, n0, timeLabel } from '@/lib/format';

type Entry = { id: string; kind: 'food' | 'activity' | 'reading'; at: number; title: string; sub: string; right: string; locked?: boolean };

export default function History() {
  const insets = useSafeAreaInsets();
  const foods = useStore((s) => s.foods);
  const activities = useStore((s) => s.activities);
  const readings = useStore((s) => s.readings);
  const removeEntry = useStore((s) => s.removeEntry);

  const sections = useMemo(() => {
    const all: Entry[] = [
      ...foods.map((f) => ({ id: f.id, kind: 'food' as const, at: f.at, title: f.name, sub: `${f.proteinG}P · ${f.netCarbsG}C · ${f.fatG}F`, right: `${n0(f.kcal)} kcal` })),
      ...activities.map((a) => ({ id: a.id, kind: 'activity' as const, at: a.at, title: `${a.kind[0].toUpperCase()}${a.kind.slice(1)} · ${a.minutes} min`, sub: a.countIt ? 'Activity' : 'Activity · not counted', right: `−${n0(a.grossKcal)} kcal` })),
      ...readings.map((r, i) => ({ id: r.id, kind: 'reading' as const, at: r.at, title: 'Weigh-in', sub: `${r.weightLb.toFixed(1)} lb · ${r.bodyFatPct.toFixed(1)}% body fat`, right: '', locked: i === 0 })),
    ].sort((a, b) => b.at - a.at);
    const map = new Map<string, Entry[]>();
    for (const e of all) {
      const k = new Date(e.at).toDateString();
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(e);
    }
    return [...map.values()].map((data) => ({ title: dayLabel(data[0].at), data }));
  }, [foods, activities, readings]);

  const confirmDelete = (e: Entry) => {
    if (e.locked) {
      Alert.alert('Starting weigh-in', 'Your first weigh-in anchors the meter, so it can’t be deleted. Add a new weigh-in instead.');
      return;
    }
    Alert.alert('Delete entry?', e.title, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removeEntry(e.kind, e.id) },
    ]);
  };

  return (
    <SectionList
      style={{ flex: 1, backgroundColor: C.bg }}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 24, paddingBottom: 32 }}
      sections={sections}
      keyExtractor={(e) => `${e.kind}-${e.id}`}
      ListHeaderComponent={
        <T w={600} size={17} style={{ marginBottom: 8 }}>
          History
        </T>
      }
      ListEmptyComponent={
        <T size={14} color={C.muted}>
          Your food, activity and weigh-ins show up here.
        </T>
      }
      renderSectionHeader={({ section }) => (
        <View style={{ backgroundColor: C.bg, paddingTop: 20, paddingBottom: 8 }}>
          <Label>{section.title.toUpperCase()}</Label>
        </View>
      )}
      renderItem={({ item }) => (
        <Pressable accessibilityRole="button" accessibilityHint="Long press to delete" onLongPress={() => confirmDelete(item)} style={{ borderTopWidth: 1, borderTopColor: C.divider }}>
          <Row style={{ paddingVertical: 12 }}>
            <View style={{ flex: 1, gap: 2 }}>
              <T size={15}>{item.title}</T>
              <T size={12} color={C.muted}>
                {timeLabel(item.at)} · {item.sub}
              </T>
            </View>
            <T size={14}>{item.right}</T>
          </Row>
        </Pressable>
      )}
      ListFooterComponent={
        sections.length ? (
          <T size={12} color={C.muted} style={{ marginTop: 16, textAlign: 'center' }}>
            Long-press an entry to delete it.
          </T>
        ) : undefined
      }
    />
  );
}
