import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Line, Path } from 'react-native-svg';
import { FlameShape } from '../src/components/Flame.tsx';
import { Button, Card, Caps, T } from '../src/components/ui.tsx';
import { connectAppleHealth } from '../src/data/health.ts';
import { syncNow } from '../src/data/sync.ts';
import { connectWhoop } from '../src/data/whoop.ts';
import { LIVER_CAP_KCAL } from '../src/engine/constants.ts';
import { simulate } from '../src/engine/simulate.ts';
import { bmrMifflin, fatToGoalKcal, leanMassLb, proteinTargetG } from '../src/engine/formulas.ts';
import { askNotificationPermission } from '../src/notifications.ts';
import { useApp, type BurnSource } from '../src/store.ts';
import { C, F, S, fmt } from '../src/theme.ts';

type Step =
  | { type: 'hero'; key: string; title: string; body: string; card?: string; flame?: boolean; cta?: string; secondary?: string; nav?: boolean }
  | { type: 'choice'; key: string; title: string; sub?: string; options: string[]; multi?: boolean }
  | { type: 'value'; key: 'born' | 'height' | 'weight' | 'bf' | 'goalbf'; title: string; sub?: string; def: number; step: number; min: number; max: number; fmt: 'year' | 'height' | 'lb' | 'pct' }
  | { type: 'plan'; key: string };

const STEPS: Step[] = [
  { type: 'hero', key: 'welcome', flame: true, nav: false, cta: 'Get started', title: 'See the moment you start burning fat', body: 'KetoMeter turns your real burn data into a live countdown: first your liver glycogen, then every calorie of fat between you and your goal.' },
  { type: 'choice', key: 'goal', title: 'What brings you to KetoMeter?', options: ['Lose body fat', 'Get lean enough to see abs', 'Reach fat-burning mode faster', 'Understand my metabolism'] },
  { type: 'choice', key: 'exp', title: 'How do you eat right now?', sub: 'KetoMeter works with any eating style.', options: ['No plan', 'Cutting carbs', 'Keto or low-carb', 'Fasting'] },
  { type: 'choice', key: 'struggle', multi: true, title: 'What gets in your way?', sub: 'Pick all that apply.', options: ["I can't tell if I'm burning fat", 'Plateaus', 'Cravings', 'Staying consistent', 'Tracking feels like work'] },
  { type: 'hero', key: 'insight', title: 'Your body burns sugar before fat', body: "Your liver stores about 400 kcal of sugar (glycogen). As it runs low, your body switches to fat-burning mode, which some call ketosis. You don't need to be on a keto diet to get there. KetoMeter shows the tank emptying, then counts every calorie of fat after it.", card: 'Most people reach fat burn 12–24 hours after their last carbs.' },
  { type: 'choice', key: 'sex', title: "What's your sex?", sub: 'Used to estimate your resting burn.', options: ['Male', 'Female'] },
  { type: 'value', key: 'born', title: 'What year were you born?', sub: 'Age changes your resting burn.', def: 1990, step: 1, min: 1930, max: new Date().getFullYear() - 18, fmt: 'year' },
  { type: 'value', key: 'height', title: 'How tall are you?', def: 70, step: 1, min: 48, max: 90, fmt: 'height' },
  { type: 'value', key: 'weight', title: 'What do you weigh?', sub: 'Your latest weigh-in.', def: 180, step: 0.2, min: 80, max: 500, fmt: 'lb' },
  { type: 'value', key: 'bf', title: "What's your body fat %?", sub: 'From a smart scale, DEXA scan or calipers. Not sure? Pick your best estimate and update it later.', def: 20, step: 0.1, min: 4, max: 60, fmt: 'pct' },
  { type: 'value', key: 'goalbf', title: "What's your goal body fat %?", def: 15, step: 0.1, min: 3, max: 59, fmt: 'pct' },
  { type: 'choice', key: 'meal', title: 'When did you last eat carbs?', sub: 'Your meter starts from here.', options: ['Just now', 'About 4 hours ago', 'About 8 hours ago', '12+ hours ago'] },
  { type: 'choice', key: 'source', title: 'Where should your burn come from?', sub: 'One source at a time, so nothing counts twice.', options: ['WHOOP', 'Apple Health (Apple Watch, Oura and more)', "I'll log activity myself"] },
  { type: 'hero', key: 'notify', title: 'Nudges that keep you on track', body: 'A simple plan each morning, protein reminders through the day, and a heads-up the moment you hit fat burn. Never spam.', card: "You're 8% of the way to 9.9%. Keep carbs under 25 g today. Protein goal: 160 g.", cta: 'Turn on notifications', secondary: 'Not now' },
  { type: 'plan', key: 'plan' },
];
const MEAL_HOURS = [0, 4, 8, 12];
const BF_QUICK = [12, 16, 20, 25, 30, 35];

function display(st: Extract<Step, { type: 'value' }>, v: number) {
  if (st.fmt === 'year') return String(v);
  if (st.fmt === 'height') return `${Math.floor(v / 12)}′ ${v % 12}″`;
  if (st.fmt === 'lb') return `${v.toFixed(1)} lb`;
  return `${v.toFixed(1)}%`;
}

export default function Onboarding() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const app = useApp();
  const [i, setI] = useState(0);
  const [picks, setPicks] = useState<Record<string, number[]>>({});
  const [vals, setVals] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const st = STEPS[i];
  const val = (k: string) => vals[k] ?? (STEPS.find((x) => x.key === k) as any).def;

  const w = val('weight'), bf = val('bf'), g = val('goalbf');
  const goalOk = g < bf;
  const fatKcal = fatToGoalKcal(w, bf, g) ?? 0;
  const picked = picks[st.key] ?? [];
  const canNext = st.type === 'choice' ? picked.length > 0 : st.type === 'value' && st.key === 'goalbf' ? goalOk : true;
  const go = (d: number) => setI((x) => Math.max(0, Math.min(STEPS.length - 1, x + d)));

  const next = async () => {
    if (!canNext || busy) return;
    if (st.key === 'source') {
      const src: BurnSource = (['whoop', 'apple', 'manual'] as const)[picked[0]];
      setBusy(true);
      try {
        if (src === 'whoop' && Platform.OS !== 'web') await connectWhoop();
        if (src === 'apple') await connectAppleHealth();
      } catch {}
      setBusy(false);
    }
    if (st.key === 'notify') await askNotificationPermission().catch(() => false);
    if (st.type === 'plan') return finish();
    go(1);
  };

  const finish = async () => {
    const mealIdx = (picks.meal ?? [0])[0];
    const startAt = new Date(Date.now() - MEAL_HOURS[mealIdx] * 3_600_000).toISOString();
    const born = val('born');
    app.set({
      sex: (picks.sex ?? [0])[0] === 1 ? 'female' : 'male',
      birthDate: `${born}-07-01`,
      heightIn: val('height'),
      goalBodyFatPct: Math.round(g * 10) / 10,
      startAt,
      source: (['whoop', 'apple', 'manual'] as const)[(picks.source ?? [2])[0]],
      onboardingAnswers: picks,
      readings: [{ id: 'first', at: new Date().toISOString(), weightLb: Math.round(w * 10) / 10, bodyFatPct: Math.round(bf * 10) / 10, source: 'manual' }],
    });
    app.set({ onboarded: true });
    syncNow().catch(() => {});
    router.replace('/paywall');
  };

  // Plan preview numbers come from the same engine the Today screen uses.
  const mealIdx = (picks.meal ?? [0])[0];
  const female = (picks.sex ?? [0])[0] === 1;
  const bmr = Math.round(bmrMifflin(female ? 'female' : 'male', w, val('height'), new Date().getFullYear() - val('born')));
  let liverLeft = LIVER_CAP_KCAL, hoursToBurn: number | null = null;
  if (st.type === 'plan') {
    const now = new Date();
    try {
      const sim = simulate({
        profile: { sex: female ? 'female' : 'male', birthDate: new Date(`${val('born')}-07-01`), heightIn: val('height'), goalBodyFatPct: goalOk ? g : bf - 1 },
        readings: [{ at: now, weightLb: w, bodyFatPct: bf }],
        startAt: new Date(+now - MEAL_HOURS[mealIdx] * 3_600_000), now, burns: [], foods: [], activities: [], hasDevice: false,
      });
      liverLeft = sim.kcalToFatBurn; hoursToBurn = sim.hoursToFatBurn;
    } catch {}
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.charcoal, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16, paddingHorizontal: S.margin, gap: 24 }}>
      {(st.type !== 'hero' || st.nav !== false) && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable onPress={() => go(-1)} accessibilityRole="button" accessibilityLabel="Back" style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.graphite, alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={10} height={16} viewBox="0 0 10 16"><Path d="M8 2L2 8l6 6" stroke={C.bone} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
          </Pressable>
          <View style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: C.ash }}>
            <View style={{ width: `${(i / (STEPS.length - 1)) * 100}%`, height: 4, borderRadius: 2, backgroundColor: C.ember }} />
          </View>
        </View>
      )}

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, gap: 16 }} keyboardShouldPersistTaps="handled">
        {st.type === 'hero' && (
          <View style={{ flex: 1, justifyContent: 'center', gap: 16 }}>
            {st.flame && <View style={{ marginBottom: 8 }}><FlameShape width={96} height={115} /></View>}
            <T size={30} weight="semibold" style={{ lineHeight: 35 }}>{st.title}</T>
            <T size={16} color={C.smoke} style={{ lineHeight: 24 }}>{st.body}</T>
            {st.card && (
              <Card style={{ flexDirection: 'row', gap: 12, borderColor: C.ash, borderWidth: 1 }}>
                <FlameShape width={28} height={34} />
                <T size={14} style={{ flex: 1, lineHeight: 20 }}>{st.card}</T>
              </Card>
            )}
          </View>
        )}

        {st.type === 'choice' && (
          <>
            <T size={26} weight="semibold" style={{ lineHeight: 31 }}>{st.title}</T>
            {st.sub && <T size={15} color={C.smoke} style={{ marginTop: -8 }}>{st.sub}</T>}
            <View style={{ gap: 12, marginTop: 8 }}>
              {st.options.map((label, idx) => {
                const on = picked.includes(idx);
                return (
                  <Pressable key={label} accessibilityRole="button" accessibilityState={{ selected: on }}
                    onPress={() => setPicks({ ...picks, [st.key]: st.multi ? (on ? picked.filter((x) => x !== idx) : [...picked, idx]) : [idx] })}
                    style={{ minHeight: 56, borderRadius: 16, backgroundColor: C.graphite, borderWidth: 1.5, borderColor: on ? C.ember : C.ash, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <T size={16} style={{ flex: 1 }}>{label}</T>
                    <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: on ? C.ember : C.ash, backgroundColor: on ? C.ember : 'transparent' }} />
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {st.type === 'value' && (
          <>
            <T size={26} weight="semibold" style={{ lineHeight: 31 }}>{st.title}</T>
            {st.sub && <T size={15} color={C.smoke} style={{ marginTop: -8, lineHeight: 21 }}>{st.sub}</T>}
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
                <Stepper dir={-1} onStep={(mult) => setVals({ ...vals, [st.key]: Math.max(st.min, Math.min(st.max, Math.round((val(st.key) - st.step * mult) * 10) / 10)) })} />
                <Text style={{ minWidth: 170, textAlign: 'center', fontSize: 48, fontFamily: F.light, color: C.bone }}>{display(st, val(st.key))}</Text>
                <Stepper dir={1} onStep={(mult) => setVals({ ...vals, [st.key]: Math.max(st.min, Math.min(st.max, Math.round((val(st.key) + st.step * mult) * 10) / 10)) })} />
              </View>
              <T size={13} color={C.smoke}>Hold − or + to move faster</T>
              {st.key === 'bf' && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                  {BF_QUICK.map((q) => (
                    <Pressable key={q} onPress={() => setVals({ ...vals, bf: q })} style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: 22, borderWidth: 1, borderColor: C.ash, justifyContent: 'center' }}>
                      <T size={14}>~{q}%</T>
                    </Pressable>
                  ))}
                </View>
              )}
              {st.key === 'goalbf' && (
                <T size={14} color={goalOk ? C.glow : C.ember} style={{ textAlign: 'center' }}>
                  {goalOk ? `That's ${(fatKcal / 3500).toFixed(1)} lb of fat · ${fmt(fatKcal)} kcal to burn` : `Pick a goal below your current ${bf.toFixed(1)}%`}
                </T>
              )}
              {st.key === 'height' && <T size={14} color={C.smoke}>{Math.round(val('height') * 2.54)} cm</T>}
            </View>
          </>
        )}

        {st.type === 'plan' && (
          <>
            <T size={26} weight="semibold">Your plan is ready</T>
            <PlanGauge frac={liverLeft / LIVER_CAP_KCAL} value={liverLeft} />
            <T size={15} color={C.glow} style={{ textAlign: 'center' }}>{hoursToBurn ? `Fat burn in ~${Math.round(hoursToBurn)} h if you keep fasting` : "You're already in fat burn"}</T>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              {[
                ['FAT TO GOAL', `${fmt(fatKcal)}`, 'kcal'],
                ['PROTEIN', `${proteinTargetG(w, bf)} g`, '/ day'],
                ['NET CARBS', '25 g', '/ day'],
                ['RESTING BURN', fmt(bmr), 'kcal/day'],
              ].map(([k, v, u]) => (
                <Card key={k} style={{ width: '47.8%', gap: 4, paddingVertical: 14 }}>
                  <Caps style={{ fontSize: 11 }}>{k}</Caps>
                  <T size={20}>{v} <Text style={{ fontSize: 13, color: C.smoke }}>{u}</Text></T>
                </Card>
              ))}
            </View>
            <T size={12} color={C.smoke} style={{ textAlign: 'center' }}>Lean mass {leanMassLb(w, bf).toFixed(1)} lb · estimates, not medical advice</T>
          </>
        )}
      </ScrollView>

      <View style={{ gap: 8 }}>
        <Button title={busy ? 'Connecting…' : st.type === 'hero' ? st.cta ?? 'Continue' : 'Continue'} onPress={next} disabled={!canNext || busy} />
        {st.type === 'hero' && st.secondary && <Button kind="ghost" title={st.secondary} onPress={() => go(1)} />}
      </View>
    </View>
  );
}

function Stepper({ dir, onStep }: { dir: number; onStep: (mult: number) => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={dir < 0 ? 'Decrease' : 'Increase'} delayLongPress={250}
      onPress={() => onStep(1)} onLongPress={() => onStep(10)}
      style={{ width: 56, height: 56, borderRadius: 28, borderWidth: 1, borderColor: C.ash, backgroundColor: C.graphite, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: C.bone, fontSize: 26, fontFamily: F.regular }}>{dir < 0 ? '−' : '+'}</Text>
    </Pressable>
  );
}

function PlanGauge({ frac, value }: { frac: number; value: number }) {
  const N = 54, lit = Math.round(frac * N);
  return (
    <View style={{ alignSelf: 'center', width: 220, height: 202 }}>
      <Svg width={220} height={202} viewBox="0 0 300 276">
        {Array.from({ length: N }, (_, k) => {
          const a = ((135 + (k * 270) / (N - 1)) * Math.PI) / 180;
          return <Line key={k} x1={150 + 122 * Math.cos(a)} y1={150 + 122 * Math.sin(a)} x2={150 + 142 * Math.cos(a)} y2={150 + 142 * Math.sin(a)} stroke={k < lit ? C.ember : C.ash} strokeWidth={6} strokeLinecap="round" />;
        })}
      </Svg>
      <View style={{ position: 'absolute', top: 74, left: 0, right: 0, alignItems: 'center' }}>
        <Text style={{ fontFamily: F.light, fontSize: 40, color: C.bone }}>{fmt(value)}</Text>
        <T size={12} color={C.smoke}>kcal to fat burn</T>
      </View>
    </View>
  );
}
