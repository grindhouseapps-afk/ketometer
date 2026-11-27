import { Text, View } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { C, F, fmt } from '../theme.ts';
import { Flame } from './Flame.tsx';

const N = 54;

/** 270° tick gauge. `remaining` 0..1 lights ticks from EMPTY toward FULL. */
export function Gauge({ remaining, value, label, flameProgress, lit, size = 300 }: {
  remaining: number; value: number; label: string; flameProgress: number; lit: boolean; size?: number;
}) {
  const frac = Math.max(0, Math.min(1, remaining));
  const lit_n = Math.round(frac * N);
  const ticks = Array.from({ length: N }, (_, i) => {
    const a = ((135 + (i * 270) / (N - 1)) * Math.PI) / 180;
    return { x1: 150 + 122 * Math.cos(a), y1: 150 + 122 * Math.sin(a), x2: 150 + 142 * Math.cos(a), y2: 150 + 142 * Math.sin(a), on: i < lit_n };
  });
  const na = ((135 + frac * 270) * Math.PI) / 180;
  const k = size / 300;
  return (
    <View style={{ width: size, height: 276 * k }} accessible accessibilityLabel={`${fmt(value)} ${label}`}>
      <Svg width={size} height={276 * k} viewBox="0 0 300 276">
        {ticks.map((t, i) => (
          <Line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke={t.on ? C.ember : C.ash} strokeWidth={5} strokeLinecap="round" />
        ))}
        <Line x1={150 + 104 * Math.cos(na)} y1={150 + 104 * Math.sin(na)} x2={150 + 144 * Math.cos(na)} y2={150 + 144 * Math.sin(na)} stroke={C.bone} strokeWidth={4} strokeLinecap="round" />
      </Svg>
      <View style={{ position: 'absolute', top: 62 * k, left: 0, right: 0, alignItems: 'center' }}>
        <View style={{ transform: [{ scale: k }] }}><Flame progress={flameProgress} lit={lit} /></View>
        <Text style={{ fontFamily: F.light, fontSize: 50 * k, color: C.bone, marginTop: 4 }}>{fmt(value)}</Text>
        <Text style={{ fontFamily: F.regular, fontSize: 13, color: C.smoke }}>{label}</Text>
      </View>
      <Text style={{ position: 'absolute', left: 44 * k, bottom: 0, fontFamily: F.medium, fontSize: 11, letterSpacing: 1.4, color: C.smoke }}>EMPTY</Text>
      <Text style={{ position: 'absolute', right: 52 * k, bottom: 0, fontFamily: F.medium, fontSize: 11, letterSpacing: 1.4, color: C.smoke }}>FULL</Text>
    </View>
  );
}
