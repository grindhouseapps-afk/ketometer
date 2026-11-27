import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Easing, View } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';
import { C } from '@/theme';
import { T } from './ui';

const N = 54;

export function useReducedMotion() {
  const [r, setR] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setR).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setR);
    return () => sub.remove();
  }, []);
  return r;
}

export function tickGeom(i: number) {
  const a = ((135 + (i * 270) / (N - 1)) * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return { x1: 150 + 122 * c, y1: 150 + 122 * s, x2: 150 + 142 * c, y2: 150 + 142 * s };
}
export const TICK_COUNT = N;

/** 270° tick gauge from the design. `fraction` = how full the tank is (1 = FULL, right end). */
export function Gauge({
  fraction,
  size = 300,
  needle = true,
  litCount,
  children,
  labels = true,
}: {
  fraction: number;
  size?: number;
  needle?: boolean;
  /** Overrides the lit tick count (Supernova animation). */
  litCount?: number;
  children?: ReactNode;
  labels?: boolean;
}) {
  const f = Math.max(0, Math.min(1, fraction));
  const lit = litCount ?? Math.round(f * N);
  const h = (size * 276) / 300;
  const na = ((135 + f * 270) * Math.PI) / 180;
  return (
    <View style={{ width: size, height: h }}>
      <Svg width={size} height={h} viewBox="0 0 300 276">
        {Array.from({ length: N }, (_, i) => {
          const g = tickGeom(i);
          return <Line key={i} {...g} stroke={i < lit ? C.accent : C.line} strokeWidth={size < 260 ? 6 : 5} strokeLinecap="round" />;
        })}
        {needle ? (
          <Line
            x1={150 + 104 * Math.cos(na)}
            y1={150 + 104 * Math.sin(na)}
            x2={150 + 144 * Math.cos(na)}
            y2={150 + 144 * Math.sin(na)}
            stroke={C.text}
            strokeWidth={4}
            strokeLinecap="round"
          />
        ) : null}
      </Svg>
      <View style={{ position: 'absolute', left: 0, right: 0, top: (size * 62) / 300, alignItems: 'center' }}>{children}</View>
      {labels ? (
        <>
          <T size={11} color={C.muted} style={{ position: 'absolute', left: (size * 44) / 300, bottom: 0, letterSpacing: 1.4 }}>
            EMPTY
          </T>
          <T size={11} color={C.muted} style={{ position: 'absolute', right: (size * 52) / 300, bottom: 0, letterSpacing: 1.4 }}>
            FULL
          </T>
        </>
      ) : null}
    </View>
  );
}

export function FlameShape({ width = 70, core = true }: { width?: number; core?: boolean }) {
  const h = (width * 240) / 200;
  return (
    <Svg width={width} height={h} viewBox="0 0 200 240">
      <Path fill={C.accent} d="M100 232 C54 232 24 202 24 162 C24 132 40 112 58 96 C60 116 68 128 80 134 C74 100 86 58 116 10 C128 56 176 92 176 160 C176 202 146 232 100 232 Z" />
      {core ? (
        <>
          <Path fill={C.accentSoft} d="M100 226 C74 226 60 208 60 188 C60 168 72 156 84 146 C86 160 92 168 100 172 C96 150 104 130 120 112 C126 138 142 156 142 186 C142 208 126 226 100 226 Z" />
          <Path fill={C.text} d="M100 222 C86 222 78 212 78 200 C78 188 86 180 94 174 C96 184 100 188 106 190 C104 178 108 168 116 158 C120 174 124 184 124 198 C124 212 114 222 100 222 Z" />
        </>
      ) : null}
    </Svg>
  );
}

/** Static flame that fades in as the liver tank empties (stage 1), or a flickering one (stage 2). */
export function Flame({ opacity = 1, live = false, width = 70 }: { opacity?: number; live?: boolean; width?: number }) {
  const t = useRef(new Animated.Value(0)).current;
  const reduced = useReducedMotion();
  useEffect(() => {
    if (!live || reduced) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(t, { toValue: 1, duration: 750, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(t, { toValue: 0, duration: 750, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [live, reduced, t]);
  const scaleY = t.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });
  const skew = t.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-2deg'] });
  const h = (width * 240) / 200;
  return (
    <Animated.View
      style={{
        opacity,
        width,
        height: h,
        shadowColor: C.accent,
        shadowOpacity: live ? 0.6 : 0.35,
        shadowRadius: live ? 16 : 10,
        shadowOffset: { width: 0, height: 0 },
        transform: live ? [{ translateY: h * 0.45 }, { scaleY }, { skewX: skew }, { translateY: -h * 0.45 }] : [],
      }}
    >
      <FlameShape width={width} />
    </Animated.View>
  );
}

/** Embers drifting up from the flame in stage 2. */
export function Sparks() {
  const reduced = useReducedMotion();
  if (reduced) return null;
  return <SparksInner />;
}

function SparksInner() {
  const vals = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;
  useEffect(() => {
    const anims = vals.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 700),
          Animated.timing(v, { toValue: 1, duration: 2200, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
      ),
    );
    anims.forEach((a) => a.start());
    return () => anims.forEach((a) => a.stop());
  }, [vals]);
  const pos = [
    { left: 136, top: 40 },
    { left: 160, top: 30 },
    { left: 150, top: 50 },
  ];
  return (
    <>
      {vals.map((v, i) => (
        <Animated.View
          key={i}
          pointerEvents="none"
          style={{
            position: 'absolute',
            ...pos[i],
            width: 4,
            height: 4,
            borderRadius: 2,
            backgroundColor: C.accentSoft,
            opacity: v.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 1, 0] }),
            transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -70] }) }],
          }}
        />
      ))}
    </>
  );
}
