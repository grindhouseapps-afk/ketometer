import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';
import { Card, Caps, Row, T } from '../../src/components/ui.tsx';
import { useApp } from '../../src/store.ts';
import { C, S } from '../../src/theme.ts';

function Chart({ points, color, unit, goal }: { points: { t: number; v: number }[]; color: string; unit: string; goal?: number }) {
  const W = 310, H = 140, P = 8;
  if (points.length === 0) return null;
  const vs = points.map((p) => p.v).concat(goal != null ? [goal] : []);
  const min = Math.min(...vs), max = Math.max(...vs);
  const span = max - min || 1;
  const t0 = points[0].t, t1 = points.at(-1)!.t, ts = t1 - t0 || 1;
  const x = (t: number) => P + ((t - t0) / ts) * (W - 2 * P);
  const y = (v: number) => H - P - ((v - min) / span) * (H - 2 * P);
  return (
    <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
      {goal != null && <><Line x1={P} x2={W - P} y1={y(goal)} y2={y(goal)} stroke={C.glow} strokeDasharray="4 4" strokeWidth={1} /><SvgText x={W - P} y={y(goal) - 4} fill={C.glow} fontSize={10} textAnchor="end">goal {goal}{unit}</SvgText></>}
      {points.length > 1 && <Polyline points={points.map((p) => `${x(p.t)},${y(p.v)}`).join(' ')} fill="none" stroke={color} strokeWidth={2} />}
      {points.map((p, i) => <Circle key={i} cx={x(p.t)} cy={y(p.v)} r={3} fill={color} />)}
    </Svg>
  );
}

export default function History() {
  const s = useApp();
  const insets = useSafeAreaInsets();
  const readings = s.readings;
  const empty = readings.length < 2;
  const first = readings[0], last = readings.at(-1);
  const byDay = new Map<string, { kcal: number; carbs: number; protein: number }>();
  for (const f of s.foods) {
    const k = new Date(f.at).toDateString();
    const d = byDay.get(k) ?? { kcal: 0, carbs: 0, protein: 0 };
    d.kcal += f.kcal; d.carbs += f.netCarbsG; d.protein += f.proteinG;
    byDay.set(k, d);
  }
  const days = [...byDay.entries()].slice(-14).reverse();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.charcoal }} contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: S.margin, paddingBottom: 40, gap: S.section }}>
      <T size={17} weight="semibold">History</T>
      {last && (
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Card style={{ flex: 1, gap: 4 }}><Caps style={{ fontSize: 11 }}>WEIGHT</Caps><T size={22}>{last.weightLb.toFixed(1)} lb</T>{first && first !== last && <T size={12} color={C.glow}>{(last.weightLb - first.weightLb).toFixed(1)} lb since start</T>}</Card>
          <Card style={{ flex: 1, gap: 4 }}><Caps style={{ fontSize: 11 }}>BODY FAT</Caps><T size={22}>{last.bodyFatPct.toFixed(1)}%</T>{first && first !== last && <T size={12} color={C.glow}>{(last.bodyFatPct - first.bodyFatPct).toFixed(1)} pts since start</T>}</Card>
        </View>
      )}
      {empty ? (
        <Card><T size={14} color={C.smoke}>Charts appear after your second body reading. Log one from the Log tab.</T></Card>
      ) : (
        <>
          <Card style={{ gap: 8 }}><Caps>BODY FAT %</Caps><Chart points={readings.map((r) => ({ t: +new Date(r.at), v: r.bodyFatPct }))} color={C.ember} unit="%" goal={s.goalBodyFatPct ?? undefined} /></Card>
          <Card style={{ gap: 8 }}><Caps>WEIGHT</Caps><Chart points={readings.map((r) => ({ t: +new Date(r.at), v: r.weightLb }))} color={C.glow} unit=" lb" /></Card>
        </>
      )}
      {days.length > 0 && (
        <Card style={{ gap: 4 }}>
          <Caps style={{ marginBottom: 8 }}>DAILY FOOD</Caps>
          {days.map(([d, v]) => (
            <Row key={d} style={{ minHeight: 40, borderTopWidth: 1, borderTopColor: C.divider }}>
              <T size={14}>{new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</T>
              <T size={13} color={C.smoke}>{Math.round(v.kcal)} kcal · {Math.round(v.protein)}P · <T size={13} color={v.carbs > s.netCarbBudgetG ? C.ember : C.smoke}>{Math.round(v.carbs)}C</T></T>
            </Row>
          ))}
        </Card>
      )}
    </ScrollView>
  );
}
