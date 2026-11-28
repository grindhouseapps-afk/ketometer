import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Sheet } from '@/components/Sheet';
import { Button, T } from '@/components/ui';
import { Wheel, nearestIndex, range } from '@/components/Wheel';
import { C } from '@/theme';
import { useStore } from '@/lib/store';

const WEIGHTS = range(80, 500, 0.2);
const BF = range(3, 60, 0.1);
const fmt1 = (v: number) => v.toFixed(1);

export default function WeighIn() {
  const readings = useStore((s) => s.readings);
  const addReading = useStore((s) => s.addReading);
  const last = readings[readings.length - 1];
  const [wi, setWi] = useState(() => nearestIndex(WEIGHTS, last?.weightLb ?? 180));
  const [bi, setBi] = useState(() => nearestIndex(BF, last?.bodyFatPct ?? 25));
  const onW = useCallback((i: number) => setWi(i), []);
  const onB = useCallback((i: number) => setBi(i), []);

  return (
    <Sheet
      title="Weigh-in"
      footer={
        <Button
          title="Save weigh-in"
          onPress={() => {
            addReading({ at: Date.now(), weightLb: WEIGHTS[wi], bodyFatPct: BF[bi] });
            router.back();
          }}
        />
      }
    >
      <T size={14} color={C.muted}>
        A weigh-in resizes your tanks and re-anchors your fat count. It never restarts the meter.
      </T>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingTop: 8 }}>
        <View style={{ flex: 1, gap: 8, alignItems: 'center' }}>
          <T size={13} color={C.muted}>
            Weight
          </T>
          <Wheel label="Weight" values={WEIGHTS} index={wi} onChange={onW} format={fmt1} unit="lb" width={160} />
        </View>
        <View style={{ flex: 1, gap: 8, alignItems: 'center' }}>
          <T size={13} color={C.muted}>
            Body fat
          </T>
          <Wheel label="Body fat" values={BF} index={bi} onChange={onB} format={fmt1} unit="%" width={160} />
        </View>
      </View>
    </Sheet>
  );
}
