// "Your data": which source feeds the math, sync now, today / 7-day totals, 14-day list, workouts.
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { Button, Card, Caps, Row, T } from '../src/components/ui.tsx';
import { connectAppleHealth } from '../src/data/health.ts';
import { lastWhoopWorkouts, sourceName, syncAgo, syncNow } from '../src/data/sync.ts';
import { connectWhoop, disconnectWhoop } from '../src/data/whoop.ts';
import { useApp, type BurnSource } from '../src/store.ts';
import { C, S, fmt } from '../src/theme.ts';

const USES: Record<BurnSource, string> = {
  whoop: 'Calories burned per WHOOP cycle (kilojoules → kcal). Workouts are shown for reference; they are already inside cycle calories.',
  apple: 'Active energy + resting (basal) energy, hour by hour. Weight and body fat % from any app or smart scale that writes to Apple Health.',
  manual: 'Your resting burn (BMR) around the clock, plus activities you log.',
};

export default function YourData() {
  const s = useApp();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);

  const daily = new Map<string, number>();
  for (const b of s.burns) {
    const k = new Date(b.start).toDateString();
    daily.set(k, (daily.get(k) ?? 0) + b.totalKcal);
  }
  const days = [...daily.entries()].sort((a, b) => +new Date(b[0]) - +new Date(a[0])).slice(0, 14);
  const today = daily.get(new Date().toDateString()) ?? 0;
  const week = days.slice(0, 7).reduce((t, [, v]) => t + v, 0);

  const pick = async (src: BurnSource) => {
    if (src === s.source) return;
    setBusy(true);
    try {
      if (src === 'whoop') {
        const ok = Platform.OS === 'web' ? true : await connectWhoop();
        if (!ok) { Alert.alert('WHOOP not connected', 'Please try again.'); setBusy(false); return; }
      }
      if (src === 'apple') await connectAppleHealth();
      if (s.source === 'whoop') await disconnectWhoop();
      s.set({ source: src, burns: [], lastSyncAt: null });
      await syncNow();
    } catch {}
    setBusy(false);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.charcoal }} contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: S.margin, paddingBottom: 40, gap: S.section }}>
      <Row>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.graphite, alignItems: 'center', justifyContent: 'center' }}>
          <Svg width={10} height={16} viewBox="0 0 10 16"><Path d="M8 2L2 8l6 6" stroke={C.bone} strokeWidth={2} fill="none" strokeLinecap="round" /></Svg>
        </Pressable>
        <T size={17} weight="semibold">Your data</T>
        <View style={{ width: 44 }} />
      </Row>

      <Card style={{ gap: 12 }}>
        <Caps>BURN SOURCE · ONE AT A TIME</Caps>
        {(['whoop', 'apple', 'manual'] as BurnSource[]).map((src) => (
          <Pressable key={src} onPress={() => pick(src)} disabled={busy} accessibilityRole="radio" accessibilityState={{ selected: s.source === src }}
            style={{ minHeight: 52, borderRadius: 12, borderWidth: 1.5, borderColor: s.source === src ? C.ember : C.ash, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <T>{sourceName(src)}{src === 'apple' ? ' (Apple Watch, Oura…)' : ''}</T>
            {s.source === src && <T size={12} color={C.ember}>CONNECTED</T>}
          </Pressable>
        ))}
        <T size={13} color={C.smoke} style={{ lineHeight: 19 }}>What KetoMeter uses: {USES[s.source]}</T>
        {s.source !== 'manual' && (
          <Row>
            <T size={13} color={C.smoke}>{syncAgo(s.lastSyncAt)}</T>
            <Button kind="outline" title={busy ? 'Syncing…' : 'Sync now'} onPress={async () => { setBusy(true); const ok = await syncNow(); setBusy(false); if (!ok) Alert.alert('Sync failed', s.source === 'whoop' ? 'Try reconnecting WHOOP.' : 'Check Apple Health permissions.'); }} style={{ paddingHorizontal: 20, height: 44 }} />
          </Row>
        )}
      </Card>

      {s.source !== 'manual' && (
        <>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Card style={{ flex: 1, gap: 4 }}><Caps style={{ fontSize: 11 }}>TODAY</Caps><T size={22}>{fmt(today)}</T><T size={12} color={C.smoke}>kcal burned</T></Card>
            <Card style={{ flex: 1, gap: 4 }}><Caps style={{ fontSize: 11 }}>LAST 7 DAYS</Caps><T size={22}>{fmt(week)}</T><T size={12} color={C.smoke}>kcal burned</T></Card>
          </View>
          <Card style={{ gap: 4 }}>
            <Caps style={{ marginBottom: 8 }}>14 DAYS</Caps>
            {days.length === 0 ? <T size={14} color={C.smoke}>No data yet. Tap Sync now.</T> : days.map(([d, v]) => (
              <Row key={d} style={{ minHeight: 40, borderTopWidth: 1, borderTopColor: C.divider }}>
                <T size={14}>{new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</T>
                <T size={14}>{fmt(v)} kcal</T>
              </Row>
            ))}
          </Card>
          {s.source === 'whoop' && lastWhoopWorkouts.length > 0 && (
            <Card style={{ gap: 4 }}>
              <Caps style={{ marginBottom: 8 }}>WORKOUTS</Caps>
              {lastWhoopWorkouts.slice(-10).reverse().map((w) => (
                <Row key={w.start} style={{ minHeight: 40, borderTopWidth: 1, borderTopColor: C.divider }}>
                  <T size={14}>{w.sport} · {new Date(w.start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</T>
                  <T size={14}>{fmt(w.kcal)} kcal{w.strain ? ` · ${w.strain.toFixed(1)} strain` : ''}</T>
                </Row>
              ))}
            </Card>
          )}
        </>
      )}
    </ScrollView>
  );
}
