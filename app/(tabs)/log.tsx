import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Card, Caps, Chip, Field, Row, T } from '../../src/components/ui.tsx';
import { saveBodyToHealth } from '../../src/data/health.ts';
import { METS, metKcal, runKcal, walkKcal } from '../../src/engine/formulas.ts';
import { useApp } from '../../src/store.ts';
import { C, S, fmt } from '../../src/theme.ts';
import { useMeter } from '../../src/useMeter.ts';

type Tab = 'food' | 'body' | 'activity';
const KINDS = [['walk', 'Walk'], ['run', 'Jog / run'], ['bike', 'Bike'], ['row', 'Row'], ['swim', 'Swim'], ['weights', 'Weights'], ['yoga', 'Yoga'], ['hiit', 'HIIT'], ['custom', 'Custom']] as const;
const num = (s: string) => { const n = parseFloat(s.replace(',', '.')); return isFinite(n) ? n : 0; };
const timeStr = (iso: string) => new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

function Toast({ text }: { text: string | null }) {
  if (!text) return null;
  return <View style={{ backgroundColor: C.graphite, borderColor: C.ember, borderWidth: 1, borderRadius: 12, padding: 12 }}><T size={14} color={C.glow}>{text}</T></View>;
}

export default function Log() {
  const params = useLocalSearchParams<{ tab?: Tab }>();
  const [tab, setTab] = useState<Tab>(params.tab ?? 'food');
  const [toast, setToast] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  useEffect(() => { if (params.tab) setTab(params.tab); }, [params.tab]);
  const flash = (t: string) => { setToast(t); setTimeout(() => setToast(null), 3000); };
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: C.charcoal }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: S.margin, paddingBottom: 40, gap: S.section }} keyboardShouldPersistTaps="handled">
        <T size={17} weight="semibold">Log</T>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {(['food', 'body', 'activity'] as Tab[]).map((t) => <Chip key={t} label={t === 'food' ? 'Food' : t === 'body' ? 'Body reading' : 'Activity'} on={tab === t} onPress={() => setTab(t)} />)}
        </View>
        <Toast text={toast} />
        {tab === 'food' && <FoodTab flash={flash} />}
        {tab === 'body' && <BodyTab flash={flash} />}
        {tab === 'activity' && <ActivityTab flash={flash} />}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function FoodTab({ flash }: { flash: (t: string) => void }) {
  const s = useApp();
  const [f, setF] = useState({ name: '', p: '', c: '', fat: '', kcal: '' });
  const [save, setSave] = useState(false);
  const autoKcal = Math.round(num(f.p) * 4 + num(f.c) * 4 + num(f.fat) * 9);
  const kcal = f.kcal ? num(f.kcal) : autoKcal;
  const add = () => {
    const food = { name: f.name || 'Food', proteinG: num(f.p), netCarbsG: num(f.c), fatG: num(f.fat), kcal };
    s.addFood({ ...food, at: new Date().toISOString() });
    if (save) s.savePreset(food);
    setF({ name: '', p: '', c: '', fat: '', kcal: '' });
    flash(food.netCarbsG > 0 ? `Logged · +${Math.round(food.netCarbsG * 4)} kcal to the tank` : 'Logged · tank unchanged');
  };
  const today = s.foods.filter((x) => new Date(x.at).toDateString() === new Date().toDateString()).reverse();
  return (
    <>
      <Card style={{ gap: 12 }}>
        <Field label="NAME" value={f.name} onChangeText={(name) => setF({ ...f, name })} placeholder="e.g. Chicken thighs" />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Field label="PROTEIN" value={f.p} onChangeText={(p) => setF({ ...f, p })} keyboardType="decimal-pad" suffix="g" />
          <Field label="NET CARBS" value={f.c} onChangeText={(c) => setF({ ...f, c })} keyboardType="decimal-pad" suffix="g" />
          <Field label="FAT" value={f.fat} onChangeText={(fat) => setF({ ...f, fat })} keyboardType="decimal-pad" suffix="g" />
        </View>
        <Field label="CALORIES" value={f.kcal} onChangeText={(k) => setF({ ...f, kcal: k })} keyboardType="number-pad" placeholder={String(autoKcal)} suffix="kcal" />
        <Pressable onPress={() => setSave(!save)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 }} accessibilityRole="checkbox" accessibilityState={{ checked: save }}>
          <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: save ? C.ember : C.ash, backgroundColor: save ? C.ember : 'transparent' }} />
          <T size={14}>Save to My foods</T>
        </Pressable>
        <Button title="Log food" onPress={add} disabled={kcal <= 0} />
      </Card>
      <View style={{ gap: 12 }}>
        <Caps>MY FOODS</Caps>
        {s.presets.map((p) => (
          <Card key={p.id} style={{ paddingVertical: 12 }}>
            <Row>
              <Pressable style={{ flex: 1 }} onPress={() => { s.addFood({ ...p, at: new Date().toISOString() }); flash(`${p.name} logged`); }}>
                <T size={14}>{p.name}</T>
                <T size={12} color={C.smoke}>{p.proteinG}P · {p.netCarbsG}C · {p.fatG}F · {p.kcal} kcal</T>
              </Pressable>
              <Pressable onPress={() => s.deletePreset(p.id)} style={{ minWidth: 44, minHeight: 44, alignItems: 'flex-end', justifyContent: 'center' }} accessibilityLabel={`Remove ${p.name}`}><T size={13} color={C.smoke}>Remove</T></Pressable>
            </Row>
          </Card>
        ))}
      </View>
      {today.length > 0 && (
        <View style={{ gap: 12 }}>
          <Caps>LOGGED TODAY</Caps>
          {today.map((x) => (
            <Row key={x.id} style={{ minHeight: 44 }}>
              <View><T size={14}>{x.name}</T><T size={12} color={C.smoke}>{timeStr(x.at)} · {x.kcal} kcal · {x.netCarbsG} g net carbs</T></View>
              <Pressable onPress={() => s.deleteFood(x.id)} style={{ minWidth: 44, minHeight: 44, alignItems: 'flex-end', justifyContent: 'center' }}><T size={13} color={C.smoke}>Delete</T></Pressable>
            </Row>
          ))}
        </View>
      )}
    </>
  );
}

function BodyTab({ flash }: { flash: (t: string) => void }) {
  const s = useApp();
  const last = s.readings.at(-1);
  const [w, setW] = useState(last ? String(last.weightLb) : '');
  const [bf, setBf] = useState(last ? String(last.bodyFatPct) : '');
  const [editing, setEditing] = useState<string | null>(null);
  const lean = num(w) * (1 - num(bf) / 100);
  const save = () => {
    if (num(w) <= 0 || num(bf) <= 0 || num(bf) >= 70) return;
    if (editing) {
      const r = s.readings.find((x) => x.id === editing)!;
      s.updateReading({ ...r, weightLb: num(w), bodyFatPct: num(bf) });
      setEditing(null);
      flash('Reading updated');
    } else {
      const at = new Date();
      s.addReading({ at: at.toISOString(), weightLb: num(w), bodyFatPct: num(bf), source: 'manual' });
      saveBodyToHealth(num(w), num(bf), at);
      const lows = s.readings.map((r) => r.weightLb);
      flash(lows.length && num(w) < Math.min(...lows) ? 'Saved · new low weigh-in!' : 'Reading saved');
    }
  };
  return (
    <>
      <Card style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Field label="WEIGHT" value={w} onChangeText={setW} keyboardType="decimal-pad" suffix="lb" />
          <Field label="BODY FAT" value={bf} onChangeText={setBf} keyboardType="decimal-pad" suffix="%" />
        </View>
        <T size={13} color={C.smoke}>Lean mass {lean > 0 ? `${lean.toFixed(1)} lb` : '—'} (calculated). Weigh-ins resize your tanks; they never refill them.</T>
        <Button title={editing ? 'Update reading' : 'Save reading'} onPress={save} />
        {editing && <Button kind="ghost" title="Cancel" onPress={() => setEditing(null)} />}
      </Card>
      <View style={{ gap: 4 }}>
        <Caps style={{ marginBottom: 8 }}>BODY READINGS</Caps>
        {[...s.readings].reverse().map((r) => (
          <Row key={r.id} style={{ minHeight: 52, borderTopWidth: 1, borderTopColor: C.divider }}>
            <View><T size={14}>{r.weightLb.toFixed(1)} lb · {r.bodyFatPct.toFixed(1)}%</T><T size={12} color={C.smoke}>{timeStr(r.at)} · {r.source === 'apple' ? 'Apple Health' : 'Entered by you'}</T></View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Pressable onPress={() => { setEditing(r.id); setW(String(r.weightLb)); setBf(String(r.bodyFatPct)); }} style={{ minHeight: 44, justifyContent: 'center' }}><T size={13} color={C.ember}>Edit</T></Pressable>
              {s.readings.length > 1 && (
                <Pressable onPress={() => Alert.alert('Delete reading?', '', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => s.deleteReading(r.id) }])} style={{ minHeight: 44, justifyContent: 'center' }}><T size={13} color={C.smoke}>Delete</T></Pressable>
              )}
            </View>
          </Row>
        ))}
      </View>
    </>
  );
}

function ActivityTab({ flash }: { flash: (t: string) => void }) {
  const s = useApp();
  const m = useMeter();
  const weight = m?.latestReading.weightLb ?? 180;
  const [kind, setKind] = useState<string>('walk');
  const [minutes, setMinutes] = useState('30');
  const [miles, setMiles] = useState('');
  const [customKcal, setCustomKcal] = useState('');
  const [countIt, setCountIt] = useState(false);
  const hasDevice = s.source !== 'manual';
  const est = kind === 'custom' ? num(customKcal)
    : (kind === 'walk' || kind === 'run') && num(miles) > 0 ? (kind === 'walk' ? walkKcal(weight, num(miles)) : runKcal(weight, num(miles)))
    : metKcal(METS[kind] ?? 4, weight, num(minutes));
  const save = () => {
    s.addActivity({ at: new Date(Date.now() - num(minutes) * 60_000).toISOString(), kind, minutes: num(minutes), miles: num(miles) || undefined, grossKcal: Math.round(est), countIt });
    flash(hasDevice && !countIt ? 'Saved as a note (your device already counts it)' : `Logged · ~${fmt(est)} kcal`);
  };
  const ways = [250, 500, 1000].map((k) => {
    const walkMi = k / walkKcal(weight, 1);
    const runMi = k / runKcal(weight, 1);
    const bikeMin = (k / metKcal(METS.bike, weight, 60)) * 60;
    const hm = (min: number) => (min >= 60 ? `${Math.floor(min / 60)} h ${Math.round(min % 60)} m` : `${Math.round(min)} m`);
    return { k, lines: [`Walk ~${walkMi.toFixed(1)} mi · ~${hm(walkMi * 20)}`, `Jog ~${runMi.toFixed(1)} mi · ~${hm(runMi * 10)}`, `Bike ~${hm(bikeMin)}`] };
  });
  return (
    <>
      <Card style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {KINDS.map(([k, l]) => <Chip key={k} label={l} on={kind === k} onPress={() => setKind(k)} />)}
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Field label="MINUTES" value={minutes} onChangeText={setMinutes} keyboardType="number-pad" suffix="min" />
          {(kind === 'walk' || kind === 'run') && <Field label="DISTANCE (OPTIONAL)" value={miles} onChangeText={setMiles} keyboardType="decimal-pad" suffix="mi" />}
          {kind === 'custom' && <Field label="CALORIES" value={customKcal} onChangeText={setCustomKcal} keyboardType="number-pad" suffix="kcal" />}
        </View>
        <T size={15} color={C.glow}>≈ {fmt(est)} kcal</T>
        {hasDevice && (
          <Pressable onPress={() => setCountIt(!countIt)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 }} accessibilityRole="checkbox" accessibilityState={{ checked: countIt }}>
            <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: countIt ? C.ember : C.ash, backgroundColor: countIt ? C.ember : 'transparent' }} />
            <T size={14} style={{ flex: 1 }}>Count it anyway (only if your device missed it)</T>
          </Pressable>
        )}
        <Button title="Save activity" onPress={save} disabled={est <= 0} />
      </Card>
      <Card style={{ gap: 12 }}>
        <Caps>WAYS TO BURN IT</Caps>
        {ways.map((w) => (
          <View key={w.k} style={{ gap: 2 }}>
            <T weight="semibold">{fmt(w.k)} kcal</T>
            {w.lines.map((l) => <T key={l} size={13} color={C.smoke}>{l}</T>)}
          </View>
        ))}
        <T size={12} color={C.smoke}>Walking or jogging burns about 100 kcal per mile for most people.</T>
      </Card>
    </>
  );
}
