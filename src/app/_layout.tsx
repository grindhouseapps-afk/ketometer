import { useEffect } from 'react';
import { AppState, View } from 'react-native';
import { Stack, DarkTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { InterTight_300Light } from '@expo-google-fonts/inter-tight/300Light';
import { InterTight_400Regular } from '@expo-google-fonts/inter-tight/400Regular';
import { InterTight_500Medium } from '@expo-google-fonts/inter-tight/500Medium';
import { InterTight_600SemiBold } from '@expo-google-fonts/inter-tight/600SemiBold';
import { InterTight_700Bold } from '@expo-google-fonts/inter-tight/700Bold';
import { useHydrated, useStore } from '@/lib/store';
import { initPurchases } from '@/lib/purchases';
import { syncWhoop } from '@/lib/whoop';
import { rescheduleAll } from '@/lib/notifications';
import { C } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

const theme = { ...DarkTheme, colors: { ...DarkTheme.colors, background: C.bg, card: C.bg, primary: C.accent, text: C.text, border: C.divider } };

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ InterTight_300Light, InterTight_400Regular, InterTight_500Medium, InterTight_600SemiBold, InterTight_700Bold });
  const hydrated = useHydrated();
  const onboarded = useStore((s) => s.onboarded);
  const pro = useStore((s) => s.proCached);
  const ready = fontsLoaded && hydrated;

  useEffect(() => {
    initPurchases().catch(() => {});
  }, []);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  // Sync WHOOP and refresh reminders whenever the app comes to the foreground.
  useEffect(() => {
    if (!ready || !onboarded) return;
    const refresh = () => {
      syncWhoop()
        .catch(() => {})
        .finally(() => rescheduleAll().catch(() => {}));
    };
    refresh();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refresh());
    return () => sub.remove();
  }, [ready, onboarded]);

  if (!ready) return <View style={{ flex: 1, backgroundColor: C.bg }} />;

  return (
    <ThemeProvider value={theme}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
        <Stack.Protected guard={!onboarded}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
        <Stack.Protected guard={onboarded && !pro}>
          <Stack.Screen name="paywall" options={{ gestureEnabled: false }} />
        </Stack.Protected>
        <Stack.Protected guard={onboarded && pro}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="sources" options={{ presentation: 'modal' }} />
          <Stack.Screen name="food" options={{ presentation: 'modal' }} />
          <Stack.Screen name="activity" options={{ presentation: 'modal' }} />
          <Stack.Screen name="weigh-in" options={{ presentation: 'modal' }} />
          <Stack.Screen name="supernova" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}
