// Supernova: ticks light in a sweep, the flame bursts into embers, the goal badge settles.
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, Share, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Line } from 'react-native-svg';
import { FlameShape, useReduceMotion } from '../src/components/Flame.tsx';
import { Button, Caps, Card, T } from '../src/components/ui.tsx';
import { useApp } from '../src/store.ts';
import { C, S, fmt } from '../src/theme.ts';
import { useMeter } from '../src/useMeter.ts';

const N = 54;
const AnimatedLine = Animated.createAnimatedComponent(Line);

export default function Goal() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const s = useApp();
  const m = useMeter();
  const reduce = useReduceMotion();
  const sweep = useRef(new Animated.Value(reduce ? 1 : 0)).current;
  const burst = useRef(new Animated.Value(reduce ? 1 : 0)).current;
  const badge = useRef(new Animated.Value(reduce ? 1 : 0)).current;

  useEffect(() => {
    if (reduce) return;
    Animated.sequence([
      Animated.timing(sweep, { toValue: 1, duration: 1200, easing: Easing.linear, useNativeDriver: false }),
      Animated.timing(burst, { toValue: 1, duration: 1100, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
    Animated.sequence([Animated.delay(1700), Animated.spring(badge, { toValue: 1, friction: 5, useNativeDriver: true })]).start();
    if (Platform.OS !== 'web') setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), 1300);
  }, [reduce]);

  const first = s.readings[0];
  const goal = s.goalBodyFatPct ?? 0;
  const days = first ? Math.max(1, Math.round((Date.now() - +new Date(first.at)) / 864e5)) : 0;
  const fatKcal = m?.fatGoalStartKcal ?? 0;

  const done = (next: string) => { s.set({ celebratedGoal: true }); router.replace(next as any); };
  const share = () => Share.share({ message: `I hit my body fat goal: ${first?.bodyFatPct.toFixed(1)}% → ${goal.toFixed(1)}% in ${days} ${days === 1 ? 'day' : 'days'} with KetoMeter.` });

  const ticks = Array.from({ length: N }, (_, i) => {
    const a = ((135 + (i * 270) / (N - 1)) * Math.PI) / 180;
    const color = sweep.interpolate({ inputRange: [0, Math.max(0.0001, i / N), Math.min(1, i / N + 0.02), 1], outputRange: [C.ash, C.ash, C.ember, C.ember] });
    return <AnimatedLine key={i} x1={150 + 122 * Math.cos(a)} y1={150 + 122 * Math.sin(a)} x2={150 + 142 * Math.cos(a)} y2={150 + 142 * Math.sin(a)} stroke={color as any} strokeWidth={5} strokeLinecap="round" />;
  });

  const embers = Array.from({ length: 14 }, (_, i) => {
    const a = (i / 14) * Math.PI * 2 + 0.3;
    const d = 90 + (i % 3) * 22;
    return (
      <Animated.View key={i} style={{
        position: 'absolute', left: 146, top: 146, width: i % 2 ? 6 : 8, height: i % 2 ? 6 : 8, borderRadius: 4,
        backgroundColor: [C.bone, C.ember, C.glow][i % 3],
        opacity: burst.interpolate({ inputRange: [0, 0.1, 1], outputRange: [0, 1, 0] }),
        transform: [{ translateX: burst.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(a) * d] }) }, { translateY: burst.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(a) * d] }) }],
      }} />
    );
  });

  return (
    <View style={{ flex: 1, backgroundColor: C.charcoal, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16, paddingHorizontal: S.margin, alignItems: 'center', gap: 24 }}>
      <Caps color={C.ember} style={{ alignSelf: 'flex-end' }}>GOAL REACHED</Caps>
      <View style={{ width: 300, height: 276 }}>
        <Svg width={300} height={276} viewBox="0 0 300 276">{ticks}</Svg>
        {!reduce && embers}
        <Animated.View style={{ position: 'absolute', left: 108, top: 92, opacity: burst.interpolate({ inputRange: [0, 0.3, 1], outputRange: [1, 0, 0] }), transform: [{ scale: burst.interpolate({ inputRange: [0, 0.3, 1], outputRange: [1, 1.45, 1.45] }) }] }}>
          <FlameShape width={84} height={100} />
        </Animated.View>
        <Animated.View style={{ position: 'absolute', left: 0, right: 0, top: 96, alignItems: 'center', opacity: badge, transform: [{ scale: badge.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] }}>
          <T size={56} weight="light">{goal.toFixed(1)}%</T>
          <T size={13} color={C.glow}>body fat · goal hit</T>
        </Animated.View>
      </View>
      <View style={{ alignItems: 'center', gap: 8 }}>
        <T size={28} weight="semibold">You've reached your goal!</T>
        <T color={C.smoke}>{first?.bodyFatPct.toFixed(1)}% → {goal.toFixed(1)}% in {days} {days === 1 ? 'day' : 'days'}</T>
      </View>
      <View style={{ flexDirection: 'row', gap: 12, alignSelf: 'stretch' }}>
        {[[`−${(fatKcal / 3500).toFixed(1)} lb`, 'fat lost'], [fmt(fatKcal), 'kcal of fat'], [String(days), days === 1 ? 'day' : 'days']].map(([v, l]) => (
          <Card key={l} style={{ flex: 1, alignItems: 'center', gap: 4, paddingHorizontal: 8 }}><T size={20}>{v}</T><T size={12} color={C.smoke}>{l}</T></Card>
        ))}
      </View>
      <View style={{ flex: 1 }} />
      <View style={{ alignSelf: 'stretch', gap: 12 }}>
        <Button title="Share my win" onPress={share} />
        <Button kind="outline" title="Set a new goal or maintain" onPress={() => done('/settings?edit=goal')} />
      </View>
    </View>
  );
}
