import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { FlameShape } from '../src/components/Flame.tsx';
import { Button, T } from '../src/components/ui.tsx';
import { buy, loadPlans, restore, type Plan } from '../src/purchases.ts';
import { C, S } from '../src/theme.ts';

const PERKS = ['Live countdown to fat burn', 'WHOOP and Apple Health sync', 'Morning plans and milestone alerts', 'Home and Lock Screen widgets'];
const TERMS = 'https://grindhouseapps.com/apps/ketometer/terms';
const PRIVACY = 'https://grindhouseapps.com/apps/ketometer/privacy-policy';

export default function Paywall() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [sel, setSel] = useState<'annual' | 'monthly'>('annual');
  const [busy, setBusy] = useState(false);

  useEffect(() => { loadPlans().then(setPlans).catch(() => setPlans([])); }, []);
  const plan = plans.find((p) => p.id === sel);
  const annual = plans.find((p) => p.id === 'annual');
  const monthly = plans.find((p) => p.id === 'monthly');

  const purchase = async () => {
    if (!plan) return;
    setBusy(true);
    try { if (await buy(plan)) router.replace('/'); }
    catch { Alert.alert('Purchase failed', 'Please try again.'); }
    setBusy(false);
  };
  const doRestore = async () => {
    setBusy(true);
    try { if (await restore()) router.replace('/'); else Alert.alert('Nothing to restore', 'No active KetoMeter subscription was found.'); }
    catch { Alert.alert('Restore failed', 'Please try again.'); }
    setBusy(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.charcoal, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16, paddingHorizontal: S.margin, gap: 20 }}>
      <View style={{ alignItems: 'flex-end' }}>
        <Pressable onPress={doRestore} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center' }}><T size={14} color={C.smoke}>Restore</T></Pressable>
      </View>
      <View style={{}}><FlameShape width={56} height={67} /></View>
      <T size={28} weight="semibold" style={{ lineHeight: 34 }}>Start burning fat by the numbers</T>
      <View style={{ gap: 12 }}>
        {PERKS.map((p) => (
          <View key={p} style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <Svg width={20} height={20} viewBox="0 0 20 20"><Circle cx={10} cy={10} r={10} fill={C.ember} /><Path d="M6 10.5l2.5 2.5L14 7.5" stroke={C.charcoal} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
            <T>{p}</T>
          </View>
        ))}
      </View>
      <View style={{ flex: 1 }} />
      <View style={{ gap: 12 }}>
        {annual && (
          <Pressable onPress={() => setSel('annual')} accessibilityRole="radio" accessibilityState={{ selected: sel === 'annual' }}
            style={{ minHeight: 64, borderRadius: 16, backgroundColor: C.graphite, borderWidth: 1.5, borderColor: sel === 'annual' ? C.ember : C.ash, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ gap: 2 }}>
              <T size={16} weight="semibold">Yearly</T>
              <T size={13} color={C.smoke}>{annual.price}/yr{annual.perMonth ? ` · ${annual.perMonth}/mo` : ''}</T>
            </View>
            <View style={{ backgroundColor: C.glow, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 }}><T size={11} weight="semibold" color={C.charcoal} style={{ letterSpacing: 0.8 }}>SAVE 27%</T></View>
          </Pressable>
        )}
        {monthly && (
          <Pressable onPress={() => setSel('monthly')} accessibilityRole="radio" accessibilityState={{ selected: sel === 'monthly' }}
            style={{ minHeight: 64, borderRadius: 16, backgroundColor: C.graphite, borderWidth: 1.5, borderColor: sel === 'monthly' ? C.ember : C.ash, paddingHorizontal: 16, justifyContent: 'center', gap: 2 }}>
            <T size={16} weight="semibold">Monthly</T>
            <T size={13} color={C.smoke}>{monthly.price}/mo</T>
          </Pressable>
        )}
      </View>
      <View style={{ gap: 8 }}>
        <Button title={busy ? 'One moment…' : `Subscribe for ${plan?.price ?? ''}${sel === 'annual' ? '/yr' : '/mo'}`} onPress={purchase} disabled={!plan || busy} />
        <T size={12} color={C.smoke} style={{ textAlign: 'center' }}>Renews automatically. Cancel anytime in Settings.</T>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16 }}>
          <Pressable onPress={() => WebBrowser.openBrowserAsync(TERMS)} style={{ minHeight: 44, justifyContent: 'center' }}><T size={12} color={C.smoke}>Terms</T></Pressable>
          <Pressable onPress={() => WebBrowser.openBrowserAsync(PRIVACY)} style={{ minHeight: 44, justifyContent: 'center' }}><T size={12} color={C.smoke}>Privacy</T></Pressable>
        </View>
      </View>
    </View>
  );
}
