import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Card, Caps, Field, Row, T } from '../../src/components/ui.tsx';
import { sourceName } from '../../src/data/sync.ts';
import { NOTIF_PREVIEWS, askNotificationPermission } from '../../src/notifications.ts';
import { restore } from '../../src/purchases.ts';
import { useApp, type NotifPrefs } from '../../src/store.ts';
import { C, S } from '../../src/theme.ts';

const num = (s: string) => { const n = parseFloat(s.replace(',', '.')); return isFinite(n) ? n : 0; };

function Item({ label, value, onPress }: { label: string; value?: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? 'button' : undefined}
      style={{ minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: C.divider }}>
      <T>{label}</T>
      <T color={onPress ? C.smoke : C.bone}>{value}{onPress ? '  ›' : ''}</T>
    </Pressable>
  );
}

export default function Settings() {
  const s = useApp();
  const router = useRouter();
  const params = useLocalSearchParams<{ edit?: string }>();
  const insets = useSafeAreaInsets();
  const [editProfile, setEditProfile] = useState(params.edit === 'goal');
  const last = s.readings.at(-1);
  const [goal, setGoal] = useState(String(s.goalBodyFatPct ?? ''));
  const [carbs, setCarbs] = useState(String(s.netCarbBudgetG));
  const [ft, setFt] = useState(String(Math.floor(s.heightIn / 12)));
  const [inch, setInch] = useState(String(s.heightIn % 12));
  const [birth, setBirth] = useState(s.birthDate.slice(0, 10));

  const saveProfile = () => {
    const g = Math.round(num(goal) * 10) / 10;
    if (!last || !(g > 0 && g < last.bodyFatPct)) { Alert.alert('Check your goal', `Your goal must be below your current ${last?.bodyFatPct.toFixed(1)}%.`); return; }
    const h = Math.round(num(ft)) * 12 + Math.round(num(inch));
    s.set({ goalBodyFatPct: g, netCarbBudgetG: Math.max(5, Math.round(num(carbs))), heightIn: h > 40 ? h : s.heightIn, birthDate: /^\d{4}-\d{2}-\d{2}$/.test(birth) ? birth : s.birthDate, celebratedGoal: false });
    setEditProfile(false);
  };
  const toggle = async (k: keyof NotifPrefs, v: boolean) => {
    if (v) await askNotificationPermission();
    s.set({ notif: { ...s.notif, [k]: v } });
  };
  const restart = () => Alert.alert('Restart from full?', 'Use this if you ate carbs you did not log. Your tanks reset to full from now.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Restart', onPress: () => s.set({ startAt: new Date().toISOString(), foods: s.foods.filter((f) => f.at < new Date().toISOString()) }) },
  ]);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.charcoal }} contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: S.margin, paddingBottom: 40, gap: S.section }}>
      <T size={17} weight="semibold">Settings</T>

      <Card style={{ gap: 4 }}>
        <Row style={{ marginBottom: 8 }}><Caps>PROFILE & GOAL</Caps>
          <Pressable onPress={() => setEditProfile(!editProfile)} style={{ minHeight: 44, justifyContent: 'center' }}><T size={14} color={C.ember}>{editProfile ? 'Close' : 'Edit'}</T></Pressable>
        </Row>
        {editProfile ? (
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Field label="GOAL BODY FAT" value={goal} onChangeText={setGoal} keyboardType="decimal-pad" suffix="%" />
              <Field label="NET-CARB BUDGET" value={carbs} onChangeText={setCarbs} keyboardType="number-pad" suffix="g" />
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Field label="HEIGHT" value={ft} onChangeText={setFt} keyboardType="number-pad" suffix="ft" />
              <Field label=" " value={inch} onChangeText={setInch} keyboardType="number-pad" suffix="in" />
              <Field label="BIRTH DATE" value={birth} onChangeText={setBirth} placeholder="YYYY-MM-DD" />
            </View>
            <Button title="Save" onPress={saveProfile} />
          </View>
        ) : (
          <>
            <Item label="Goal body fat" value={`${s.goalBodyFatPct?.toFixed(1)}%`} />
            <Item label="Net-carb budget" value={`${s.netCarbBudgetG} g/day`} />
            <Item label="Height" value={`${Math.floor(s.heightIn / 12)} ft ${s.heightIn % 12} in`} />
            <Item label="Sex" value={s.sex === 'male' ? 'Male' : 'Female'} />
          </>
        )}
      </Card>

      <Card style={{ gap: 4 }}>
        <Caps style={{ marginBottom: 8 }}>SOURCES</Caps>
        <Item label="Calories burned" value={sourceName(s.source)} onPress={() => router.push('/your-data')} />
        <Item label="Where your numbers come from" onPress={() => router.push('/sources')} />
        <Item label="Restart from full" onPress={restart} />
      </Card>

      <Card style={{ gap: 4 }}>
        <Caps style={{ marginBottom: 8 }}>NOTIFICATIONS</Caps>
        {([['morning', 'Morning plan · 7:30 AM'], ['protein', 'Protein reminders'], ['milestones', 'Milestones (fat burn, goal)'], ['weighIn', 'Weigh-in reminder · 7:00 AM']] as const).map(([k, l]) => (
          <View key={k} style={{ borderTopWidth: 1, borderTopColor: C.divider, paddingVertical: 10, gap: 4 }}>
            <Row><T>{l}</T><Switch value={s.notif[k]} onValueChange={(v) => toggle(k, v)} trackColor={{ true: C.ember, false: C.ash }} thumbColor={C.bone} ios_backgroundColor={C.ash} {...({ activeThumbColor: C.bone } as object)} /></Row>
            <T size={12} color={C.smoke} style={{ lineHeight: 17 }}>“{NOTIF_PREVIEWS[k]}”</T>
          </View>
        ))}
        <Item label="Quiet hours" value={`${s.notif.quietStart > 12 ? s.notif.quietStart - 12 : s.notif.quietStart} PM – ${s.notif.quietEnd} AM`} />
      </Card>

      <Card style={{ gap: 4 }}>
        <Caps style={{ marginBottom: 8 }}>SUBSCRIPTION & HELP</Caps>
        <Item label="Manage subscription" onPress={() => Linking.openURL('https://apps.apple.com/account/subscriptions')} />
        <Item label="Restore purchases" onPress={() => restore().then((ok) => Alert.alert(ok ? 'Restored' : 'Nothing to restore'))} />
        <Item label="Send a suggestion" onPress={() => Linking.openURL('mailto:suggestions@grindhouseapps.com?subject=KetoMeter%20suggestion')} />
        <Item label="Support" onPress={() => Linking.openURL('mailto:support@grindhouseapps.com?subject=KetoMeter%20support')} />
        <Item label="Privacy policy" onPress={() => Linking.openURL('https://grindhouseapps.com/apps/ketometer/privacy-policy')} />
        <Item label="Terms" onPress={() => Linking.openURL('https://grindhouseapps.com/apps/ketometer/terms')} />
      </Card>
      <T size={12} color={C.smoke} style={{ textAlign: 'center', lineHeight: 18 }}>KetoMeter shows estimates from a simplified model of human metabolism. It is not medical advice. Talk to your doctor before changing your diet or fasting.</T>
      {Platform.OS === 'web' && <Button kind="ghost" title="Reset demo data" onPress={() => { s.reset(); }} />}
    </ScrollView>
  );
}
