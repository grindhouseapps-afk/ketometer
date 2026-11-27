import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { C } from '../theme.ts';

const OUTER = 'M100 232 C54 232 24 202 24 162 C24 132 40 112 58 96 C60 116 68 128 80 134 C74 100 86 58 116 10 C128 56 176 92 176 160 C176 202 146 232 100 232 Z';
const CORE = 'M100 226 C74 226 60 208 60 188 C60 168 72 156 84 146 C86 160 92 168 100 172 C96 150 104 130 120 112 C126 138 142 156 142 186 C142 208 126 226 100 226 Z';
const INNER = 'M100 222 C86 222 78 212 78 200 C78 188 86 180 94 174 C96 184 100 188 106 190 C104 178 108 168 116 158 C120 174 124 184 124 198 C124 212 114 222 100 222 Z';

export function FlameShape({ width = 70, height = 84, coreOpacity = 1 }: { width?: number; height?: number; coreOpacity?: number }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 200 240">
      <Path d={OUTER} fill={C.ember} />
      <Path d={CORE} fill={C.glow} opacity={coreOpacity} />
      <Path d={INNER} fill={C.bone} />
    </Svg>
  );
}

export function useReduceMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduce).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => sub.remove();
  }, []);
  return reduce;
}

/** Stage 1: faint flame that strengthens with progress. Stage 2: lit, flickering, with sparks. */
export function Flame({ progress, lit }: { progress: number; lit: boolean }) {
  const reduce = useReduceMotion();
  const flicker = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(lit ? 1 : 0)).current;
  const sparks = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];
  const wasLit = useRef(lit);

  useEffect(() => {
    if (!lit || reduce) return;
    const loop = Animated.loop(Animated.timing(flicker, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }));
    loop.start();
    const sparkLoops = sparks.map((v, i) =>
      Animated.loop(Animated.sequence([Animated.delay(i * 700), Animated.timing(v, { toValue: 1, duration: 2200, easing: Easing.out(Easing.quad), useNativeDriver: true }), Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: true })])),
    );
    sparkLoops.forEach((l) => l.start());
    return () => { loop.stop(); sparkLoops.forEach((l) => l.stop()); };
  }, [lit, reduce]);

  useEffect(() => {
    if (lit && !wasLit.current && !reduce) {
      pop.setValue(0.6);
      Animated.sequence([
        Animated.timing(pop, { toValue: 1.3, duration: 260, useNativeDriver: true }),
        Animated.timing(pop, { toValue: 0.92, duration: 200, useNativeDriver: true }),
        Animated.timing(pop, { toValue: 1, duration: 160, useNativeDriver: true }),
      ]).start();
    } else pop.setValue(1);
    wasLit.current = lit;
  }, [lit, reduce]);

  const opacity = lit ? 1 : Math.max(0.05, Math.pow(Math.max(0, Math.min(1, progress)), 1.7) * 0.85);
  const scaleY = flicker.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [1, 1.06, 0.96, 1.04, 1] });
  const skew = flicker.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: ['0deg', '-2deg', '1.5deg', '-1deg', '0deg'] });

  return (
    <View style={{ width: 70, height: 84, alignItems: 'center', justifyContent: 'flex-end' }}>
      {lit && !reduce && sparks.map((v, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute', top: 10 + i * 8, left: 26 + i * 9, width: 4, height: 4, borderRadius: 2, backgroundColor: C.glow,
            opacity: v.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 1, 0] }),
            transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -60] }) }],
          }}
        />
      ))}
      <Animated.View
        style={{
          opacity,
          ...(Platform.OS === 'web'
            ? { filter: `drop-shadow(0 0 14px rgba(255,106,19,${lit ? 0.7 : progress * 0.4}))` }
            : { shadowColor: C.ember, shadowOpacity: lit ? 0.7 : progress * 0.4, shadowRadius: 16, shadowOffset: { width: 0, height: 0 } }),
          transform: [{ scale: pop }, { scaleY: lit && !reduce ? scaleY : 1 }, { skewX: lit && !reduce ? skew : '0deg' }],
        }}
      >
        <FlameShape />
      </Animated.View>
    </View>
  );
}
