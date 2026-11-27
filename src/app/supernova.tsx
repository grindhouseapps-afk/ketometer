import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Share, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Button, Card, Label, T } from '@/components/ui';
import { FlameShape, Gauge, TICK_COUNT, useReducedMotion } from '@/components/Gauge';
import { C } from '@/theme';
import { useStore } from '@/lib/store';
import { fatToGoalKcal } from '@/engine/formulas.ts';
import { n0, n1 } from '@/lib/format';

const PARTS = Array.from({ length: 14 }, (_, i) => {
  const a = (i / 14) * Math.PI * 2 + 0.3;
  const d = 90 + (i % 3) * 22;
  return { dx: Math.cos(a) * d, dy: Math.sin(a) * d, size: i % 2 ? 6 : 8, color: i % 3 === 0 ? C.text : i % 3 === 1 ? C.accent : C.accentSoft };
});

export default function Supernova() {
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const readings = useStore((s) => s.readings);
  const goal = useStore((s) => s.profile.goalBodyFatPct);
  const set = useStore((s) => s.set);

  const first = readings[0];
  const days = first ? Math.max(1, Math.round((Date.now() - first.at) / 86_400_000)) : 0;
  const totalFat = first ? fatToGoalKcal(first.weightLb, first.bodyFatPct, goal) ?? 0 : 0;

  const [lit, setLit] = useState(reduced ? TICK_COUNT : 0);
  const fill = useRef(new Animated.Value(0)).current;
  const boom = useRef(new Animated.Value(0)).current;
  const badge = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  const rise = useRef(new Animated.Value(reduced ? 1 : 0)).current;

  useEffect(() => {
    set({ celebratedGoal: goal });
    if (reduced) return;
    const id = fill.addListener(({ value }) => setLit(Math.round(value * TICK_COUNT)));
    Animated.sequence([
      Animated.timing(fill, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
      Animated.parallel([
        Animated.timing(boom, { toValue: 1, duration: 800, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.spring(badge, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true, delay: 250 }),
        Animated.timing(rise, { toValue: 1, duration: 500, delay: 500, useNativeDriver: true }),
      ]),
    ]).start();
    const t = setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}), 1300);
    return () => {
      fill.removeListener(id);
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const riseStyle = { opacity: rise, transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] };
  const startPct = first?.bodyFatPct;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24, paddingHorizontal: 24, alignItems: 'center', gap: 24, overflow: 'hidden' }}>
      <Label color={C.accent} style={{ alignSelf: 'flex-end' }}>
        GOAL REACHED
      </Label>
      <View style={{ width: 300, height: 276 }}>
        <Gauge fraction={1} needle={false} labels={false} litCount={lit} />
        {!reduced ? (
          <>
            <Animated.View
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: 110,
                top: 110,
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: C.accentSoft,
                opacity: boom.interpolate({ inputRange: [0, 0.1, 1], outputRange: [0, 0.85, 0] }),
                transform: [{ scale: boom.interpolate({ inputRange: [0, 1], outputRange: [0, 3.2] }) }],
              }}
            />
            {PARTS.map((p, i) => (
              <Animated.View
                key={i}
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: 146,
                  top: 146,
                  width: p.size,
                  height: p.size,
                  borderRadius: 4,
                  backgroundColor: p.color,
                  opacity: boom.interpolate({ inputRange: [0, 0.05, 1], outputRange: [0, 1, 0] }),
                  transform: [
                    { translateX: boom.interpolate({ inputRange: [0, 1], outputRange: [0, p.dx] }) },
                    { translateY: boom.interpolate({ inputRange: [0, 1], outputRange: [0, p.dy] }) },
                    { scale: boom.interpolate({ inputRange: [0, 1], outputRange: [1, 0.4] }) },
                  ],
                }}
              />
            ))}
            <Animated.View
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: 108,
                top: 92,
                opacity: boom.interpolate({ inputRange: [0, 0.3, 1], outputRange: [1, 0, 0] }),
                transform: [{ scale: boom.interpolate({ inputRange: [0, 0.3, 1], outputRange: [1, 1.45, 1.45] }) }],
              }}
            >
              <FlameShape width={84} />
            </Animated.View>
          </>
        ) : null}
        <Animated.View style={{ position: 'absolute', left: 70, top: 96, width: 160, alignItems: 'center', gap: 4, opacity: badge, transform: [{ scale: badge.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] }}>
          <T w={300} size={56}>
            {n1(goal)}%
          </T>
          <T size={13} color={C.accentSoft}>
            body fat · goal hit
          </T>
        </Animated.View>
      </View>

      <Animated.View style={[{ alignItems: 'center', gap: 8 }, riseStyle]}>
        <T w={600} size={28} style={{ textAlign: 'center' }}>
          You've reached your goal!
        </T>
        {startPct != null ? (
          <T size={15} color={C.muted}>
            {n1(startPct)}% → {n1(goal)}% in {days} {days === 1 ? 'day' : 'days'}
          </T>
        ) : null}
      </Animated.View>

      <Animated.View style={[{ width: '100%', flexDirection: 'row', gap: 12 }, riseStyle]}>
        <Stat value={`−${n1(totalFat / 3500)} lb`} label="fat lost" />
        <Stat value={n0(totalFat)} label="kcal of fat" />
        <Stat value={String(days)} label={days === 1 ? 'day' : 'days'} />
      </Animated.View>

      <Animated.View style={[{ width: '100%', gap: 12, marginTop: 'auto' }, riseStyle]}>
        <Button
          title="Share my win"
          onPress={() =>
            Share.share({
              message: `I just hit ${n1(goal)}% body fat${startPct != null ? `, down from ${n1(startPct)}%` : ''}. ${n0(totalFat)} kcal of fat burned, tracked with KetoMeter.`,
            }).catch(() => {})
          }
        />
        <Button
          kind="outline"
          title="Set a new goal or maintain"
          onPress={() => {
            router.back();
            router.navigate('/settings');
          }}
        />
      </Animated.View>
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <Card style={{ flex: 1, alignItems: 'center', gap: 4, paddingHorizontal: 8 }}>
      <T size={20}>{value}</T>
      <T size={12} color={C.muted}>
        {label}
      </T>
    </Card>
  );
}
