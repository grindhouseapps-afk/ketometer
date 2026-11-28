import { useCallback, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { Bar, Button, Card, Glow, Label, Option, Row, T } from '@/components/ui';
import { FlameShape, Gauge } from '@/components/Gauge';
import { C } from '@/theme';
import { Wheel, nearestIndex, range } from '@/components/Wheel';
import { Features } from '@/components/Features';
import { useStore } from '@/lib/store';
import { computeMeter } from '@/lib/useMeter';
import { connectWhoop } from '@/lib/whoop';
import { requestNotifications } from '@/lib/notifications';
import { fatToGoalKcal, leanMassLb } from '@/engine/formulas.ts';
import { heightLabel, hoursLabel, n0, n1 } from '@/lib/format';

type Step =
  | { type: 'hero'; key: string; title: string; body: string; card?: string; flame?: boolean; cta?: string; secondary?: string; nav?: boolean }
  | { type: 'choice'; key: string; title: string; sub?: string; options: string[]; multi?: boolean; disabled?: number[]; optionSubs?: Record<number, string> }
  | { type: 'value'; key: ValueKey; title: string; sub?: string; step: number; min: number; max: number; fmt: 'year' | 'height' | 'lb' | 'pct' }
  | { type: 'plan'; key: 'plan' }
  | { type: 'features'; key: 'features' };

type ValueKey = 'born' | 'height' | 'weight' | 'bf' | 'goalbf';

const MEAL_HOURS = [0, 4, 8, 12];

const STEPS: Step[] = [
  { type: 'hero', key: 'welcome', flame: true, nav: false, cta: 'Get started', title: 'See the moment you start burning fat', body: 'KetoMeter turns your real burn data into a live countdown: first your liver glycogen, then every calorie of fat between you and your goal.' },
  { type: 'choice', key: 'goal', title: 'What brings you to KetoMeter?', options: ['Lose body fat', 'Get lean enough to see abs', 'Reach fat-burning mode faster', 'Understand my metabolism'] },
  { type: 'choice', key: 'exp', title: 'How do you eat right now?', sub: 'KetoMeter works with any eating style.', options: ['No plan', 'Cutting carbs', 'Low-carb', 'Fasting'] },
  { type: 'choice', key: 'struggle', multi: true, title: 'What gets in your way?', sub: 'Pick all that apply.', options: ["I can't tell if I'm burning fat", 'Plateaus', 'Cravings', 'Staying consistent', 'Tracking feels like work'] },
  { type: 'hero', key: 'insight', title: 'Your body burns sugar before fat', body: 'Your liver stores about 400 kcal of sugar (glycogen). As it runs low, your body switches to fat-burning mode. You don’t need a special diet to get there. KetoMeter shows the tank emptying, then counts every calorie of fat after it.', card: 'Most people reach fat burn 12–24 hours after their last carbs.' },
  { type: 'choice', key: 'sex', title: "What's your sex?", sub: 'Used to estimate your resting burn.', options: ['Male', 'Female'] },
  { type: 'value', key: 'born', title: 'What year were you born?', sub: 'Age changes your resting burn.', step: 1, min: 1940, max: new Date().getFullYear() - 18, fmt: 'year' },
  { type: 'value', key: 'height', title: 'How tall are you?', step: 1, min: 48, max: 90, fmt: 'height' },
  { type: 'value', key: 'weight', title: 'What do you weigh?', sub: 'Your latest weigh-in.', step: 0.2, min: 80, max: 500, fmt: 'lb' },
  { type: 'value', key: 'bf', title: "What's your body fat %?", sub: 'From a smart scale, DEXA scan or calipers. A best guess works too.', step: 0.1, min: 4, max: 60, fmt: 'pct' },
  { type: 'value', key: 'goalbf', title: "What's your goal body fat %?", step: 0.1, min: 3, max: 59, fmt: 'pct' },
  { type: 'choice', key: 'meal', title: 'When did you last eat carbs?', sub: 'Your meter starts from here.', options: ['Just now', 'About 4 hours ago', 'About 8 hours ago', '12+ hours ago'] },
  { type: 'choice', key: 'source', title: 'Where should your burn come from?', sub: 'One source at a time, so nothing counts twice.', options: ['WHOOP', 'Apple Health', "I'll log activity myself"], disabled: [1], optionSubs: { 1: 'Coming soon' } },
  { type: 'hero', key: 'notify', title: 'Nudges that keep you on track', body: 'A simple plan each morning, a protein check in the afternoon, and a heads-up the moment you hit fat burn. Never spam.', card: 'Keep net carbs under 25 g today. Protein goal: 1 g per lb of lean mass.', cta: 'Turn on notifications', secondary: 'Not now' },
  { type: 'plan', key: 'plan' },
  { type: 'features', key: 'features' },
];

/** A realistic first goal: about a quarter below the current body fat, on a half-point. */
const suggestGoal = (bf: number) => Math.max(3, Math.min(bf - 0.5, Math.round(bf * 0.75 * 2) / 2));

const DEFAULTS: Record<ValueKey, number> = { born: 1990, height: 70, weight: 180, bf: 25, goalbf: suggestGoal(25) };

export default function Onboarding() {
  const insets = useSafeAreaInsets();
  const store = useStore();
  const [i, setI] = useState(0);
  const [picks, setPicks] = useState<Record<string, number[]>>({});
  const [vals, setVals] = useState<Record<ValueKey, number>>(DEFAULTS);
  const [goalTouched, setGoalTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const s = STEPS[i];

  const picked = picks[s.key] ?? [];
  const goalOk = vals.goalbf < vals.bf;
  const fatKcal = fatToGoalKcal(vals.weight, vals.bf, vals.goalbf);
  const fatLb = fatKcal ? fatKcal / 3500 : 0;

  const canNext = s.type === 'choice' ? picked.length > 0 : s.type === 'value' && s.key === 'goalbf' ? goalOk : true;

  /** Writes everything the engine needs, so WHOOP sync and the plan use real numbers. */
  const commit = () => {
    const now = Date.now();
    const mealH = MEAL_HOURS[(picks.meal ?? [0])[0]];
    store.set({
      answers: { goal: picks.goal?.[0], exp: picks.exp?.[0], struggle: picks.struggle },
      profile: {
        sex: (picks.sex ?? [0])[0] === 1 ? 'female' : 'male',
        birthYear: vals.born,
        heightIn: vals.height,
        goalBodyFatPct: vals.goalbf,
        netCarbBudgetG: 25,
      },
      readings: [{ id: 'r0', at: now - mealH * 3_600_000 - 60_000, weightLb: vals.weight, bodyFatPct: vals.bf }],
      startAt: now - mealH * 3_600_000,
    });
  };

  const go = (d: number) => {
    setNote(null);
    setI((x) => Math.max(0, Math.min(STEPS.length - 1, x + d)));
  };

  const next = async () => {
    if (!canNext || busy) return;
    if (s.key === 'meal') commit();
    if (s.key === 'source') {
      commit();
      const choice = picked[0];
      if (choice === 0) {
        setBusy(true);
        try {
          const ok = await connectWhoop();
          if (!ok) {
            store.set({ source: 'whoop', whoopConnected: false });
            setNote('WHOOP not connected. You can connect it any time in Settings.');
          }
        } catch (e: any) {
          store.set({ source: 'whoop', whoopConnected: false });
          setNote(`Couldn't reach WHOOP (${e?.message ?? 'error'}). You can connect it in Settings.`);
        } finally {
          setBusy(false);
        }
        go(1);
        return;
      }
      store.set({ source: 'manual' });
    }
    if (s.key === 'notify') {
      await requestNotifications().catch(() => {});
    }
    if (s.type === 'features') {
      store.set({ onboarded: true });
      return;
    }
    go(1);
  };

  const onValue = useCallback(
    (v: number) => {
      if (s.key === 'goalbf') setGoalTouched(true);
      // Keep the goal below the current body fat; until the user picks one, suggest it.
      if (s.key === 'bf') setVals((cur) => ({ ...cur, bf: v, goalbf: !goalTouched || cur.goalbf >= v ? suggestGoal(v) : cur.goalbf }));
      else setVals((cur) => ({ ...cur, [s.key]: v }));
    },
    [s.key, goalTouched],
  );

  const plan = useMemo(() => (s.type === 'plan' ? computeMeter() : null), [s.type]);

  const nav = !(s.type === 'hero' && s.nav === false);
  const progress = i / (STEPS.length - 1);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ flex: 1, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16, paddingHorizontal: 24, gap: 24 }}>
        {nav ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => go(-1)} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' }}>
              <Svg width={10} height={16} viewBox="0 0 10 16">
                <Path d="M8 2L2 8l6 6" stroke={C.text} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </Pressable>
            <View style={{ flex: 1 }}>
              <Bar fraction={progress} height={4} />
            </View>
          </View>
        ) : null}

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, gap: 16 }} keyboardShouldPersistTaps="handled">
          {s.type === 'hero' ? (
            <View style={{ flex: 1, justifyContent: 'center', gap: 16 }}>
              {s.flame ? (
                <View style={{ marginBottom: 8, shadowColor: C.accent, shadowOpacity: 0.55, shadowRadius: 18, shadowOffset: { width: 0, height: 0 } }}>
                  <FlameShape width={96} />
                </View>
              ) : null}
              <T w={600} size={30} style={{ lineHeight: 35 }}>
                {s.title}
              </T>
              <T size={16} color={C.muted} style={{ lineHeight: 24 }}>
                {s.body}
              </T>
              {s.card ? (
                <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 16, padding: 16, flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
                  <FlameShape width={28} core={false} />
                  <T size={14} style={{ flex: 1, lineHeight: 20 }}>
                    {s.card}
                  </T>
                </View>
              ) : null}
            </View>
          ) : null}

          {s.type === 'choice' ? (
            <>
              <T w={600} size={26} style={{ lineHeight: 31 }}>
                {s.title}
              </T>
              {s.sub ? (
                <T size={15} color={C.muted} style={{ marginTop: -8 }}>
                  {s.sub}
                </T>
              ) : null}
              <View style={{ gap: 12, marginTop: 8 }}>
                {s.options.map((label, idx) => {
                  const on = picked.includes(idx);
                  return (
                    <Option
                      key={label}
                      label={label}
                      sub={s.optionSubs?.[idx]}
                      selected={on}
                      disabled={s.disabled?.includes(idx)}
                      onPress={() => {
                        const p = s.multi ? (on ? picked.filter((x) => x !== idx) : [...picked, idx]) : [idx];
                        setPicks({ ...picks, [s.key]: p });
                      }}
                    />
                  );
                })}
              </View>
            </>
          ) : null}

          {s.type === 'value' ? (
            <ValueStep
              step={s}
              value={vals[s.key]}
              max={s.key === 'goalbf' ? Math.round((vals.bf - 0.1) * 10) / 10 : undefined}
              onChange={onValue}
              hint={
                s.key === 'goalbf'
                  ? goalOk
                    ? { text: `That's ${n1(fatLb)} lb of fat · ${n0(fatKcal ?? 0)} kcal to burn`, color: C.accentSoft }
                    : { text: `Pick a goal below your current ${n1(vals.bf)}%`, color: C.accent }
                  : s.key === 'height'
                    ? { text: `${Math.round(vals.height * 2.54)} cm`, color: C.muted }
                    : s.key === 'bf'
                      ? { text: `Lean mass ${n1(leanMassLb(vals.weight, vals.bf))} lb`, color: C.muted }
                      : undefined
              }
            />
          ) : null}

          {s.type === 'plan' ? (
            <>
              <T w={600} size={26}>
                Your plan is ready
              </T>
              {plan ? (
                <>
                  <View style={{ alignSelf: 'center' }}>
                    <Gauge fraction={plan.liverKcal / plan.liverCapKcal} size={220} needle={false} labels={false}>
                      <View style={{ marginTop: 12, alignItems: 'center' }}>
                        <T w={300} size={40}>
                          {n0(plan.kcalToFatBurn)}
                        </T>
                        <T size={12} color={C.muted} style={{ marginTop: 4 }}>
                          kcal to fat burn
                        </T>
                      </View>
                    </Gauge>
                  </View>
                  <T size={15} color={C.accentSoft} style={{ alignSelf: 'center' }}>
                    {plan.stage === 2 ? "You're already in fat burn" : plan.hoursToFatBurn != null ? `Fat burn in ~${hoursLabel(plan.hoursToFatBurn)} if you keep fasting` : 'Keep carbs low to reach fat burn'}
                  </T>
                  <Card style={{ gap: 10 }}>
                    <Row>
                      <T size={14}>Liver tank</T>
                      <T size={14}>
                        {n0(plan.liverKcal)} / {n0(plan.liverCapKcal)} kcal
                      </T>
                    </Row>
                    <Bar fraction={plan.liverKcal / plan.liverCapKcal} />
                    <Row>
                      <T size={14}>Muscle tank</T>
                      <T size={14}>
                        {n0(plan.muscleKcal)} / {n0(plan.muscleCapKcal)} kcal
                      </T>
                    </Row>
                    <Bar fraction={plan.muscleKcal / plan.muscleCapKcal} color={C.ember} />
                    <T size={12} color={C.muted} style={{ lineHeight: 17 }}>
                      Fat burn starts when your liver tank is empty. Your muscle tank fuels workouts and doesn't block fat burn.
                    </T>
                  </Card>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                    <PlanTile label="FAT TO GOAL" value={n0(plan.fatToGoalKcal ?? 0)} unit="kcal" />
                    <PlanTile label="PROTEIN" value={`${plan.proteinTargetG} g`} unit="/ day" />
                    <PlanTile label="NET CARBS" value={`${plan.netCarbBudgetG} g`} unit="/ day" />
                    <PlanTile label="RESTING BURN" value={n0(plan.bmrPerDay)} unit="kcal/day" />
                  </View>
                </>
              ) : (
                <T color={C.muted}>Couldn't build your plan. Go back and check your numbers.</T>
              )}
            </>
          ) : null}
          {s.type === 'features' ? <Features /> : null}
          {note ? (
            <T size={13} color={C.accentSoft}>
              {note}
            </T>
          ) : null}
        </ScrollView>

        <View style={{ gap: 8 }}>
          <Glow on={canNext && !busy}>
            <Button title={busy ? 'Connecting…' : s.type === 'hero' && s.cta ? s.cta : s.type === 'features' ? 'Start my plan' : 'Continue'} disabled={!canNext || busy} onPress={next} />
          </Glow>
          {s.type === 'hero' && s.secondary ? <Button kind="ghost" title={s.secondary} onPress={() => go(1)} /> : null}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function PlanTile({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <Card style={{ flexBasis: '47%', flexGrow: 1, paddingVertical: 14, gap: 4 }}>
      <Label style={{ fontSize: 11, letterSpacing: 1.1 }}>{label}</Label>
      <T size={20}>
        {value}{' '}
        <T size={13} color={C.muted}>
          {unit}
        </T>
      </T>
    </Card>
  );
}

function fmtValue(fmt: string, v: number) {
  if (fmt === 'year') return String(v);
  if (fmt === 'height') return heightLabel(v);
  return v.toFixed(1);
}

function ValueStep({
  step,
  value,
  onChange,
  hint,
  max,
}: {
  step: Extract<Step, { type: 'value' }>;
  value: number;
  onChange: (v: number) => void;
  hint?: { text: string; color: string };
  max?: number;
}) {
  const values = useMemo(() => range(step.min, Math.max(step.min, max ?? step.max), step.step), [step.min, step.max, step.step, max]);
  const idx = nearestIndex(values, value);
  const format = useCallback((v: number) => fmtValue(step.fmt, v), [step.fmt]);
  const onIdx = useCallback((i: number) => onChange(values[i]), [onChange, values]);
  const unit = step.fmt === 'lb' ? 'lb' : step.fmt === 'pct' ? '%' : undefined;
  return (
    <>
      <T w={600} size={26} style={{ lineHeight: 31 }}>
        {step.title}
      </T>
      {step.sub ? (
        <T size={15} color={C.muted} style={{ marginTop: -8 }}>
          {step.sub}
        </T>
      ) : null}
      <View style={{ flex: 1, justifyContent: 'center', gap: 20, minHeight: 320 }}>
        <Wheel key={`${step.key}-${values.length}`} label={step.title} values={values} index={idx} onChange={onIdx} format={format} unit={unit} width={240} />
        <T size={14} color={hint?.color ?? C.muted} style={{ textAlign: 'center', minHeight: 20 }}>
          {hint?.text ?? ''}
        </T>
      </View>
    </>
  );
}
