import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Purchases, { type PurchasesPackage } from 'react-native-purchases';
import { Button, Glow, T } from '@/components/ui';
import { Flame, Gauge } from '@/components/Gauge';
import { Icon } from '@/components/Icons';
import { C } from '@/theme';
import { buy, purchasesConfigured, restore, useOfferingPackages } from '@/lib/purchases';
import { useStore } from '@/lib/store';
import { LEGAL } from '@/lib/legal';
import { computeMeter } from '@/lib/useMeter';
import { hoursLabel, n0 } from '@/lib/format';

const BULLETS = [
  'Live countdown to fat burn',
  'Every calorie of fat to your goal',
  'WHOOP sync, or log activity yourself',
  'Daily plan, protein check and fat-burn alerts',
];

function perMonth(p: PurchasesPackage) {
  const v = p.product.price / 12;
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: p.product.currencyCode }).format(v);
  } catch {
    return v.toFixed(2);
  }
}

export default function Paywall() {
  const insets = useSafeAreaInsets();
  const { annual, monthly, error } = useOfferingPackages();
  const goal = useStore((s) => s.profile.goalBodyFatPct);
  const [plan, setPlan] = useState<'annual' | 'monthly'>('annual');
  const [busy, setBusy] = useState(false);
  const selected = plan === 'annual' ? annual : monthly;
  const m = useMemo(() => computeMeter(), []);

  const savePct = annual && monthly ? Math.round((1 - annual.product.price / (monthly.product.price * 12)) * 100) : null;

  const onBuy = async () => {
    if (!selected || busy) return;
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

  const liverFrac = m ? m.liverKcal / m.liverCapKcal : 0.6;
  const headline = m
    ? m.stage === 2
      ? `You're in fat burn now`
      : m.hoursToFatBurn != null
        ? `Fat burn in ~${hoursLabel(m.hoursToFatBurn)}`
        : `${n0(m.kcalToFatBurn)} kcal to fat burn`
    : null;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* Warm glow behind the hero */}
      <View pointerEvents="none" style={{ position: 'absolute', top: -120, alignSelf: 'center', width: 420, height: 420, borderRadius: 210, backgroundColor: C.accent, opacity: 0.08 }} />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 4, paddingHorizontal: 20, paddingBottom: 12 }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
          <Pressable accessibilityRole="button" onPress={onRestore} hitSlop={8} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 }}>
            <T w={500} size={14} color={C.muted}>
              Restore
            </T>
          </Pressable>
        </View>

        <View style={{ alignItems: 'center', marginTop: -8 }}>
          <Gauge fraction={liverFrac} size={200} needle={false} labels={false}>
            <View style={{ marginTop: -6, alignItems: 'center' }}>
              <Flame width={58} opacity={1} live />
            </View>
          </Gauge>
          {headline ? (
            <View style={{ marginTop: -18, backgroundColor: C.accent + '22', borderColor: C.accent + '55', borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 }}>
              <T w={600} size={13} color={C.accentSoft}>
                {headline}
                {m?.fatToGoalKcal != null ? ` · ${n0(m.fatToGoalKcal)} kcal of fat to ${goal}%` : ''}
              </T>
            </View>
          ) : null}
          <T w={700} size={30} style={{ textAlign: 'center', lineHeight: 34, marginTop: 14, letterSpacing: -0.6 }} accessibilityRole="header">
            Unlock your{'\n'}fat-burn meter
          </T>
        </View>

        <View style={{ gap: 12, marginTop: 20 }}>
          {BULLETS.map((b) => (
            <View key={b} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="check" size={13} color="#1A0A00" />
              </View>
              <T w={500} size={15} style={{ flex: 1 }}>
                {b}
              </T>
            </View>
          ))}
        </View>

        <View accessibilityRole="radiogroup" style={{ gap: 12, marginTop: 24 }}>
          <PlanCard
            selected={plan === 'annual'}
            onPress={() => setPlan('annual')}
            disabled={!annual}
            title="Yearly"
            note={annual ? `Billed yearly · just ${perMonth(annual)}/mo` : 'Loading…'}
            price={annual?.product.priceString ?? '—'}
            unit="/yr"
            badge={savePct && savePct > 0 ? `SAVE ${savePct}%` : 'BEST VALUE'}
          />
          <PlanCard
            selected={plan === 'monthly'}
            onPress={() => setPlan('monthly')}
            disabled={!monthly}
            title="Monthly"
            note="Billed monthly"
            price={monthly?.product.priceString ?? '—'}
            unit="/mo"
          />
        </View>

        {error && !annual && !monthly ? (
          <T size={13} color={C.accentSoft} style={{ textAlign: 'center', marginTop: 12 }}>
            {error}
          </T>
        ) : !annual && !monthly ? (
          <ActivityIndicator color={C.accent} style={{ marginTop: 12 }} />
        ) : null}

        {Platform.OS === 'ios' && purchasesConfigured ? (
          <Pressable accessibilityRole="button" onPress={() => Purchases.presentCodeRedemptionSheet().catch(() => {})} style={{ minHeight: 44, justifyContent: 'center', alignItems: 'center', marginTop: 6 }}>
            <T w={600} size={14} color={C.accent}>
              Have an offer code?
            </T>
          </Pressable>
        ) : null}
      </ScrollView>

      <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: insets.bottom + 10, gap: 8 }}>
        <Glow on={!!selected && !busy}>
          <Button title={busy ? 'One moment…' : 'Continue'} disabled={!selected || busy} onPress={onBuy} />
        </Glow>
        <T size={12} color={C.muted} style={{ textAlign: 'center', lineHeight: 17 }}>
          {selected
            ? `${selected.product.priceString} billed ${plan === 'annual' ? 'yearly' : 'monthly'}. Auto-renews until canceled. Cancel anytime in Settings › Apple ID at least 24 hours before renewal.`
            : 'Auto-renews until canceled. Cancel anytime in Settings.'}
        </T>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 20 }}>
          <LinkText title="Restore" onPress={onRestore} />
          <LinkText title="Terms" onPress={() => Linking.openURL(LEGAL.terms)} />
          <LinkText title="Privacy" onPress={() => Linking.openURL(LEGAL.privacy)} />
          {__DEV__ ? <LinkText title="Dev: skip" onPress={() => useStore.getState().set({ proCached: true })} /> : null}
        </View>
      </View>
    </View>
  );
}

function LinkText({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} hitSlop={6} style={{ paddingVertical: 6 }}>
      <T w={600} size={13} color={C.muted}>
        {title}
      </T>
    </Pressable>
  );
}

function PlanCard({
  selected,
  onPress,
  disabled,
  title,
  note,
  price,
  unit,
  badge,
}: {
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
  title: string;
  note: string;
  price: string;
  unit: string;
  badge?: string;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled }}
      accessibilityLabel={`${title} ${price}${unit}`}
      disabled={disabled}
      onPress={onPress}
      style={{
        marginTop: badge ? 10 : 0,
        borderRadius: 22,
        borderWidth: 2,
        borderColor: selected ? C.accent : C.line,
        backgroundColor: selected ? '#24170F' : C.card,
        paddingHorizontal: 16,
        paddingVertical: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        opacity: disabled ? 0.5 : 1,
        shadowColor: C.accent,
        shadowOpacity: selected ? 0.25 : 0,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 0 },
      }}
    >
      {badge ? (
        <View style={{ position: 'absolute', top: -11, left: 16, height: 22, paddingHorizontal: 10, borderRadius: 11, backgroundColor: C.accent, justifyContent: 'center' }}>
          <T w={700} size={11} color="#1A0A00" style={{ letterSpacing: 0.8 }}>
            {badge}
          </T>
        </View>
      ) : null}
      <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: selected ? C.accent : C.muted, alignItems: 'center', justifyContent: 'center' }}>
        {selected ? <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: C.accent }} /> : null}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <T w={700} size={17}>
          {title}
        </T>
        <T size={13} color={C.muted}>
          {note}
        </T>
      </View>
      <T w={300} size={26}>
        {price}
        <T size={13} color={C.muted}>
          {unit}
        </T>
      </T>
    </Pressable>
  );
}
