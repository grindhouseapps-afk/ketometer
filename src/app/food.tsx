import { useState } from 'react';
import { Switch, View } from 'react-native';
import { router } from 'expo-router';
import { Chips, Sheet } from '@/components/Sheet';
import { Button, Field, Row, T } from '@/components/ui';
import { C } from '@/theme';
import { useStore } from '@/lib/store';
import { num } from '@/lib/format';

const WHEN = [
  { label: 'Now', value: 0 },
  { label: '30 min ago', value: 0.5 },
  { label: '1 h ago', value: 1 },
  { label: '2 h ago', value: 2 },
  { label: '4 h ago', value: 4 },
];

export default function LogFood() {
  const addFood = useStore((s) => s.addFood);
  const addPreset = useStore((s) => s.addPreset);
  const [name, setName] = useState('');
  const [p, setP] = useState('');
  const [c, setC] = useState('');
  const [f, setF] = useState('');
  const [kcal, setKcal] = useState('');
  const [when, setWhen] = useState(0);
  const [save, setSave] = useState(true);

  const P = num(p) || 0;
  const Cb = num(c) || 0;
  const Fa = num(f) || 0;
  const autoKcal = Math.round(P * 4 + Cb * 4 + Fa * 9);
  const total = Number.isFinite(num(kcal)) ? num(kcal) : autoKcal;
  const valid = total > 0 && P >= 0 && Cb >= 0 && Fa >= 0;

  const submit = () => {
    if (!valid) return;
    const label = name.trim() || 'Food';
    const entry = { name: label, proteinG: P, netCarbsG: Cb, fatG: Fa, kcal: Math.round(total) };
    addFood({ ...entry, at: Date.now() - when * 3_600_000 });
    if (save && name.trim()) addPreset(entry);
    router.back();
  };

  return (
    <Sheet title="Log food" footer={<Button title="Log it" disabled={!valid} onPress={submit} />}>
      <Field label="Name" value={name} onChangeText={setName} placeholder="e.g. Chicken thighs" />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Field label="Protein" value={p} onChangeText={setP} numeric suffix="g" placeholder="0" />
        <Field label="Net carbs" value={c} onChangeText={setC} numeric suffix="g" placeholder="0" />
        <Field label="Fat" value={f} onChangeText={setF} numeric suffix="g" placeholder="0" />
      </View>
      <Field label={`Calories (${autoKcal} from macros)`} value={kcal} onChangeText={setKcal} numeric suffix="kcal" placeholder={String(autoKcal)} />
      <T size={12} color={C.muted}>
        Net carbs refill your liver tank first, then muscle. Everything else adds back to your fat count.
      </T>
      <View style={{ gap: 8 }}>
        <T size={13} color={C.muted}>
          When
        </T>
        <Chips options={WHEN} value={when} onChange={setWhen} />
      </View>
      <Row>
        <T size={15}>Save to My Foods</T>
        <Switch value={save} onValueChange={setSave} trackColor={{ true: C.accent, false: C.line }} />
      </Row>
    </Sheet>
  );
}
