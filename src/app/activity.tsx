import { useState } from 'react';
import { Switch, View } from 'react-native';
import { router } from 'expo-router';
import { Chips, Sheet } from '@/components/Sheet';
import { Button, Card, Row, Stepper, T } from '@/components/ui';
import { C } from '@/theme';
import { useStore } from '@/lib/store';
import { METS, metKcal } from '@/engine/formulas.ts';
import { n0 } from '@/lib/format';

const KINDS: { label: string; value: keyof typeof METS }[] = [
  { label: 'Walk', value: 'walk' },
  { label: 'Run', value: 'run' },
  { label: 'Bike', value: 'bike' },
  { label: 'Weights', value: 'weights' },
  { label: 'HIIT', value: 'hiit' },
  { label: 'Row', value: 'row' },
  { label: 'Swim', value: 'swim' },
  { label: 'Yoga', value: 'yoga' },
];

export default function LogActivity() {
  const addActivity = useStore((s) => s.addActivity);
  const readings = useStore((s) => s.readings);
  const hasDevice = useStore((s) => s.source === 'whoop' && s.whoopConnected);
  const [kind, setKind] = useState<keyof typeof METS>('walk');
  const [minutes, setMinutes] = useState(30);
  const [countIt, setCountIt] = useState(false);
  const weight = readings[readings.length - 1]?.weightLb ?? 180;
  const gross = metKcal(METS[kind], weight, minutes);

  const submit = () => {
    // Logged as ending now.
    addActivity({ at: Date.now() - minutes * 60_000, kind, minutes, grossKcal: Math.round(gross), countIt: hasDevice ? countIt : true });
    router.back();
  };

  return (
    <Sheet title="Log activity" footer={<Button title="Log it" onPress={submit} />}>
      <Chips options={KINDS} value={kind} onChange={setKind} />
      <View style={{ alignItems: 'center', gap: 8, paddingVertical: 16 }}>
        <Stepper display={`${minutes} min`} size={36} onMinus={() => setMinutes((m) => Math.max(5, m - 5))} onPlus={() => setMinutes((m) => Math.min(480, m + 5))} />
        <T size={14} color={C.accentSoft}>
          ~{n0(gross)} kcal burned
        </T>
      </View>
      <Card style={{ backgroundColor: C.bg }}>
        <T size={13} color={C.muted}>
          Estimate: {METS[kind]} MET × {n0(weight / 2.2046)} kg × {minutes} min. Counted net of your resting burn, so nothing counts twice.
        </T>
      </Card>
      {hasDevice ? (
        <Row>
          <View style={{ flex: 1, gap: 2 }}>
            <T size={15}>Count it on top of WHOOP</T>
            <T size={12} color={C.muted}>
              Only if WHOOP didn't track this one.
            </T>
          </View>
          <Switch value={countIt} onValueChange={setCountIt} trackColor={{ true: C.accent, false: C.line }} />
        </Row>
      ) : null}
    </Sheet>
  );
}
