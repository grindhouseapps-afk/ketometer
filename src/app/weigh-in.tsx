import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Sheet } from '@/components/Sheet';
import { Button, Stepper, T } from '@/components/ui';
import { C } from '@/theme';
import { useStore } from '@/lib/store';

export default function WeighIn() {
  const readings = useStore((s) => s.readings);
  const addReading = useStore((s) => s.addReading);
  const last = readings[readings.length - 1];
  const [w, setW] = useState(last?.weightLb ?? 180);
  const [bf, setBf] = useState(last?.bodyFatPct ?? 25);
  const r1 = (v: number) => Math.round(v * 10) / 10;

  return (
    <Sheet
      title="Weigh-in"
      footer={
        <Button
          title="Save weigh-in"
          onPress={() => {
            addReading({ at: Date.now(), weightLb: w, bodyFatPct: bf });
            router.back();
          }}
        />
      }
    >
      <T size={14} color={C.muted}>
        A weigh-in resizes your tanks and re-anchors your fat count. It never restarts the meter. Hold − or + to jump.
      </T>
      <View style={{ alignItems: 'center', gap: 12, paddingVertical: 12 }}>
        <T size={13} color={C.muted}>
          Weight
        </T>
        <Stepper display={`${w.toFixed(1)} lb`} size={36} onMinus={() => setW((v) => r1(Math.max(80, v - 0.2)))} onPlus={() => setW((v) => r1(Math.min(500, v + 0.2)))} onMinusLong={() => setW((v) => r1(Math.max(80, v - 2)))} onPlusLong={() => setW((v) => r1(Math.min(500, v + 2)))} />
      </View>
      <View style={{ alignItems: 'center', gap: 12, paddingVertical: 12 }}>
        <T size={13} color={C.muted}>
          Body fat
        </T>
        <Stepper display={`${bf.toFixed(1)}%`} size={36} onMinus={() => setBf((v) => r1(Math.max(3, v - 0.1)))} onPlus={() => setBf((v) => r1(Math.min(60, v + 0.1)))} onMinusLong={() => setBf((v) => r1(Math.max(3, v - 1)))} onPlusLong={() => setBf((v) => r1(Math.min(60, v + 1)))} />
      </View>
    </Sheet>
  );
}
