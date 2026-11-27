import { useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import type { PurchasesPackage } from 'react-native-purchases';
import { Button, T } from '@/components/ui';
import { C } from '@/theme';
import { buy, restore, useOfferingPackages } from '@/lib/purchases';
import { useStore } from '@/lib/store';
import { LEGAL } from '@/lib/legal';

const PERKS = ['Live countdown to fat burn', 'WHOOP sync, or log activity yourself', 'Morning plans and fat-burn alerts', 'Every calorie of fat to your goal'];

function monthlyEquivalent(p: PurchasesPackage) {
  const price = p.product.price / 12;
  return `${p.product.currencyCode === 'USD' ? '$' : ''}${price.toFixed(2)}${p.product.currencyCode === 'USD' ? '' : ' ' + p.product.currencyCode}/mo`;
}

export default function Paywall() {
  const insets = useSafeAreaInsets();
  const { annual, monthly, error } = useOfferingPackages();
  const [plan, setPlan] = useState<'annual' | 'monthly'>('annual');
  const [busy, setBusy] = useState(false);
  const selected = plan === 'annual' ? annual : monthly;

  const savePct = annual && monthly ? Math.round((1 - annual.product.price / (monthly.product.price * 12)) * 100) : null;

  const onBuy = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await buy(selected);
    } catch (e: any) {
      Alert.alert('Purchase failed', e?.message ?? 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const onRestore = async () => {
    setBusy(true);
    try {
      const ok = await restore();
      if (!ok) Alert.alert('Nothing to restore', 'No active KetoMeter subscription was found for this Apple ID.');
    } catch (e: any) {
      Alert.alert('Restore failed', e?.message ?? 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const PlanCard = ({ id, pkg, title, sub, badge }: { id: 'annual' | 'monthly'; pkg?: PurchasesPackage; title: string; sub: string; badge?: string }) => (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: plan === id, disabled: !pkg }}
      disabled={!pkg}
      onPress={() => setPlan(id)}
      style={{ minHeight: 64, borderRadius: 16, backgroundColor: C.card, borderWidth: 1.5, borderColor: plan === id ? C.accent : C.line, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', opacity: pkg ? 1 : 0.5 }}
    >
      <View style={{ gap: 2 }}>
        <T w={600} size={16}>
          {title}
        </T>
        <T size={13} color={C.muted}>
          {sub}
        </T>
      </View>
      {badge ? (
        <View style={{ backgroundColor: C.accentSoft, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 }}>
          <T w={700} size={11} color={C.bg} style={{ letterSpacing: 0.8 }}>
            {badge}
          </T>
        </View>
      ) : null}
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16, paddingHorizontal: 24 }}>
      <View style={{ alignItems: 'flex-end' }}>
        <Pressable accessibilityRole="button" onPress={onRestore} style={{ paddingVertical: 12, paddingLeft: 12 }}>
          <T size={14} color={C.muted}>
            Restore
          </T>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ gap: 24, flexGrow: 1 }}>
        <T w={600} size={28} style={{ lineHeight: 34 }}>
          Start burning fat by the numbers
        </T>
        <View style={{ gap: 12 }}>
          {PERKS.map((p) => (
            <View key={p} style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <Svg width={20} height={20} viewBox="0 0 20 20">
                <Circle cx={10} cy={10} r={10} fill={C.accent} />
                <Path d="M6 10.5l2.5 2.5L14 7.5" stroke={C.bg} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
              <T size={15}>{p}</T>
            </View>
          ))}
        </View>
        <View style={{ flex: 1 }} />
        {error && !annual && !monthly ? (
          <T size={13} color={C.accentSoft}>
            {error}
          </T>
        ) : !annual && !monthly ? (
          <ActivityIndicator color={C.accent} />
        ) : null}
        <View style={{ gap: 12 }}>
          <PlanCard id="annual" pkg={annual} title="Yearly" sub={annual ? `${annual.product.priceString}/yr · ${monthlyEquivalent(annual)}` : '—'} badge={savePct && savePct > 0 ? `SAVE ${savePct}%` : undefined} />
          <PlanCard id="monthly" pkg={monthly} title="Monthly" sub={monthly ? `${monthly.product.priceString}/mo` : '—'} />
        </View>
      </ScrollView>
      <View style={{ gap: 8, marginTop: 16 }}>
        <Button
          title={busy ? 'One moment…' : selected ? `Subscribe for ${selected.product.priceString}${plan === 'annual' ? '/yr' : '/mo'}` : 'Subscribe'}
          disabled={!selected || busy}
          onPress={onBuy}
        />
        <T size={12} color={C.muted} style={{ textAlign: 'center' }}>
          Renews automatically. Cancel anytime in Settings.
        </T>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16 }}>
          <Pressable accessibilityRole="link" onPress={() => Linking.openURL(LEGAL.terms)} style={{ paddingVertical: 8 }}>
            <T size={12} color={C.muted} style={{ textDecorationLine: 'underline' }}>
              Terms
            </T>
          </Pressable>
          <Pressable accessibilityRole="link" onPress={() => Linking.openURL(LEGAL.privacy)} style={{ paddingVertical: 8 }}>
            <T size={12} color={C.muted} style={{ textDecorationLine: 'underline' }}>
              Privacy
            </T>
          </Pressable>
          {__DEV__ ? (
            <Pressable accessibilityRole="button" onPress={() => useStore.getState().set({ proCached: true })} style={{ paddingVertical: 8 }}>
              <T size={12} color={C.muted} style={{ textDecorationLine: 'underline' }}>
                Dev: skip
              </T>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}
