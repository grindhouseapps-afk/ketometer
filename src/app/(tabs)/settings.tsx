import { useState, type ReactNode } from 'react';
import { Alert, Linking, Platform, Pressable, ScrollView, Switch, View } from 'react-native';
import Constants from 'expo-constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Chips } from '@/components/Sheet';
import { Card, Label, Row, Stepper, T } from '@/components/ui';
import { C } from '@/theme';
import { useStore } from '@/lib/store';
import { connectWhoop, disconnectWhoop, syncWhoop } from '@/lib/whoop';
import { requestNotifications, rescheduleAll } from '@/lib/notifications';
import { restore } from '@/lib/purchases';
import { LEGAL } from '@/lib/legal';
import { ago, heightLabel } from '@/lib/format';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <Label>{title}</Label>
      <Card style={{ gap: 0, paddingVertical: 4 }}>{children}</Card>
    </View>
  );
}

function Line({ children, first }: { children: ReactNode; first?: boolean }) {
  return <View style={{ paddingVertical: 12, borderTopWidth: first ? 0 : 1, borderTopColor: C.divider, gap: 10 }}>{children}</View>;
}

function LinkRow({ title, onPress, first, color = C.text }: { title: string; onPress: () => void; first?: boolean; color?: string }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={{ minHeight: 48, justifyContent: 'center', borderTopWidth: first ? 0 : 1, borderTopColor: C.divider }}>
      <Row>
        <T size={15} color={color}>
          {title}
        </T>
        <T size={15} color={C.muted}>
          ›
        </T>
      </Row>
    </Pressable>
  );
}

export default function Settings() {
  const insets = useSafeAreaInsets();
  const s = useStore();
  const p = s.profile;
  const [busy, setBusy] = useState(false);
  const r1 = (v: number) => Math.round(v * 10) / 10;
  const latestBf = s.readings[s.readings.length - 1]?.bodyFatPct ?? 30;

  const setGoal = (v: number) => {
    s.setProfile({ goalBodyFatPct: r1(Math.max(3, Math.min(latestBf - 0.1, v))) });
    rescheduleAll().catch(() => {});
  };

  const onConnect = async () => {
    setBusy(true);
    try {
      const ok = await connectWhoop();
      if (!ok) Alert.alert('WHOOP not connected', 'The sign-in was cancelled.');
    } catch (e: any) {
      Alert.alert("Couldn't reach WHOOP", e?.message ?? 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 24, paddingBottom: 40, gap: 24 }}>
      <T w={600} size={17}>
        Settings
      </T>

      <Section title="GOAL">
        <Line first>
          <Row>
            <T size={15}>Goal body fat</T>
            <Stepper size={22} display={`${p.goalBodyFatPct.toFixed(1)}%`} onMinus={() => setGoal(p.goalBodyFatPct - 0.1)} onPlus={() => setGoal(p.goalBodyFatPct + 0.1)} onMinusLong={() => setGoal(p.goalBodyFatPct - 1)} onPlusLong={() => setGoal(p.goalBodyFatPct + 1)} />
          </Row>
          <T size={12} color={C.muted}>
            Must be below your latest reading ({latestBf.toFixed(1)}%).
          </T>
        </Line>
        <Line>
          <Row>
            <T size={15}>Daily net carbs</T>
            <Stepper size={22} display={`${p.netCarbBudgetG} g`} onMinus={() => s.setProfile({ netCarbBudgetG: Math.max(5, p.netCarbBudgetG - 5) })} onPlus={() => s.setProfile({ netCarbBudgetG: Math.min(200, p.netCarbBudgetG + 5) })} />
          </Row>
        </Line>
      </Section>

      <Section title="BURN SOURCE">
        <Line first>
          <Chips
            options={[
              { label: 'WHOOP', value: 'whoop' as const },
              { label: 'Log it myself', value: 'manual' as const },
            ]}
            value={s.source}
            onChange={(v) => s.set({ source: v })}
          />
          <T size={12} color={C.muted}>
            One source at a time, so nothing counts twice. Apple Health is coming soon.
          </T>
        </Line>
        {s.source === 'whoop' ? (
          s.whoopConnected ? (
            <>
              <Line>
                <Row>
                  <T size={15}>WHOOP connected</T>
                  <T size={13} color={C.muted}>
                    {s.whoopSyncedAt ? `synced ${ago(s.whoopSyncedAt)}` : 'not synced yet'}
                  </T>
                </Row>
              </Line>
              <LinkRow title="Sync now" onPress={() => syncWhoop().catch((e) => Alert.alert('Sync failed', e?.message ?? 'Please try again.'))} />
              <LinkRow
                title="Disconnect WHOOP"
                color={C.accent}
                onPress={() =>
                  Alert.alert('Disconnect WHOOP?', 'Your meter switches to resting estimates plus activity you log.', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Disconnect', style: 'destructive', onPress: () => disconnectWhoop() },
                  ])
                }
              />
            </>
          ) : (
            <LinkRow title={busy ? 'Connecting…' : 'Connect WHOOP'} color={C.accent} onPress={onConnect} />
          )
        ) : null}
      </Section>

      <Section title="PROFILE">
        <Line first>
          <Chips
            options={[
              { label: 'Male', value: 'male' as const },
              { label: 'Female', value: 'female' as const },
            ]}
            value={p.sex}
            onChange={(v) => s.setProfile({ sex: v })}
          />
        </Line>
        <Line>
          <Row>
            <T size={15}>Birth year</T>
            <Stepper size={22} display={String(p.birthYear)} onMinus={() => s.setProfile({ birthYear: Math.max(1930, p.birthYear - 1) })} onPlus={() => s.setProfile({ birthYear: Math.min(new Date().getFullYear() - 18, p.birthYear + 1) })} />
          </Row>
        </Line>
        <Line>
          <Row>
            <T size={15}>Height</T>
            <Stepper size={22} display={heightLabel(p.heightIn)} onMinus={() => s.setProfile({ heightIn: Math.max(48, p.heightIn - 1) })} onPlus={() => s.setProfile({ heightIn: Math.min(90, p.heightIn + 1) })} />
          </Row>
        </Line>
      </Section>

      <Section title="NOTIFICATIONS">
        <Line first>
          <Row>
            <View style={{ flex: 1, gap: 2 }}>
              <T size={15}>Plans and fat-burn alerts</T>
              <T size={12} color={C.muted}>
                Morning plan, afternoon protein check, fat-burn heads-up.
              </T>
            </View>
            <Switch
              value={s.notificationsOn}
              trackColor={{ true: C.accent, false: C.line }}
              onValueChange={async (on) => {
                if (on) {
                  const ok = await requestNotifications();
                  if (!ok) Alert.alert('Notifications are off', 'Turn them on for KetoMeter in iOS Settings.', [{ text: 'Not now' }, { text: 'Open Settings', onPress: () => Linking.openSettings() }]);
                } else {
                  s.set({ notificationsOn: false });
                  rescheduleAll().catch(() => {});
                }
              }}
            />
          </Row>
        </Line>
      </Section>

      <Section title="SUBSCRIPTION">
        <LinkRow first title="Manage subscription" onPress={() => Linking.openURL(Platform.OS === 'ios' ? 'https://apps.apple.com/account/subscriptions' : 'https://play.google.com/store/account/subscriptions')} />
        <LinkRow
          title="Restore purchases"
          onPress={() =>
            restore()
              .then((ok) => Alert.alert(ok ? 'Restored' : 'Nothing to restore', ok ? 'Your subscription is active.' : 'No active subscription was found.'))
              .catch((e) => Alert.alert('Restore failed', e?.message ?? 'Please try again.'))
          }
        />
      </Section>

      <Section title="HELP">
        <LinkRow first title="Contact support" onPress={() => Linking.openURL(LEGAL.support)} />
        <LinkRow title="Suggest a feature" onPress={() => Linking.openURL(LEGAL.suggestions)} />
        <LinkRow title="Privacy policy" onPress={() => Linking.openURL(LEGAL.privacy)} />
        <LinkRow title="Terms of use" onPress={() => Linking.openURL(LEGAL.terms)} />
      </Section>

      <T size={12} color={C.muted} style={{ textAlign: 'center' }}>
        Estimates from a simplified model of your metabolism. Not medical advice.{'\n'}KetoMeter {Constants.expoConfig?.version ?? ''} · Grind House Apps
      </T>
    </ScrollView>
  );
}
