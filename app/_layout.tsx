import { InterTight_300Light, InterTight_400Regular, InterTight_500Medium, InterTight_600SemiBold, useFonts } from '@expo-google-fonts/inter-tight';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { AppState as RNAppState, Platform } from 'react-native';
import { syncNow } from '../src/data/sync.ts';
import { maybeSeedDemo } from '../src/demo.ts';
import { reschedule } from '../src/notifications.ts';
import { configurePurchases, usePro } from '../src/purchases.ts';
import { useApp } from '../src/store.ts';
import { C } from '../src/theme.ts';
import { computeMeter } from '../src/useMeter.ts';
import { pushWidgetSnapshot } from '../src/widgets.ts';

SplashScreen.preventAutoHideAsync().catch(() => {});

function useHydrated() {
  const [h, setH] = useState(useApp.persist.hasHydrated());
  useEffect(() => useApp.persist.onFinishHydration(() => setH(true)), []);
  return h;
}

/** Sync, notifications and widgets whenever the app comes to the foreground or data changes. */
function useBackgroundWork(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const refresh = async () => {
      await syncNow();
      const s = useApp.getState();
      const m = computeMeter(s);
      pushWidgetSnapshot(m, s.goalBodyFatPct);
      reschedule(s, m).catch(() => {});
    };
    refresh();
    const sub = RNAppState.addEventListener('change', (st) => st === 'active' && refresh());
    const unsub = useApp.subscribe((s, prev) => {
      if (s.foods !== prev.foods || s.readings !== prev.readings || s.activities !== prev.activities || s.notif !== prev.notif) {
        const m = computeMeter(s);
        pushWidgetSnapshot(m, s.goalBodyFatPct);
        reschedule(s, m).catch(() => {});
      }
    });
    return () => { sub.remove(); unsub(); };
  }, [enabled]);
}

export default function Root() {
  const [fonts] = useFonts({ InterTight_300Light, InterTight_400Regular, InterTight_500Medium, InterTight_600SemiBold });
  const hydrated = useHydrated();
  const onboarded = useApp((s) => s.onboarded);
  const pro = usePro();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => { configurePurchases(); }, []);
  useEffect(() => { if (hydrated) maybeSeedDemo(); }, [hydrated]);
  const ready = fonts && hydrated && pro !== null;
  useBackgroundWork(ready && onboarded);

  useEffect(() => {
    if (!ready) return;
    SplashScreen.hideAsync().catch(() => {});
    const top = segments[0];
    if (!onboarded && top !== 'onboarding') router.replace('/onboarding');
    else if (onboarded && pro === false && top !== 'paywall') router.replace('/paywall');
    else if (onboarded && pro && (top === 'onboarding' || top === 'paywall')) router.replace('/');
  }, [ready, onboarded, pro, segments[0]]);

  if (!ready) return null;
  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.charcoal }, animation: Platform.OS === 'web' ? 'none' : 'default' }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
        <Stack.Screen name="paywall" options={{ gestureEnabled: false }} />
        <Stack.Screen name="sources" options={{ presentation: 'formSheet', sheetGrabberVisible: true, sheetAllowedDetents: [0.85], contentStyle: { backgroundColor: C.graphite } }} />
        <Stack.Screen name="goal" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
        <Stack.Screen name="your-data" options={{ presentation: 'card' }} />
      </Stack>
    </>
  );
}
