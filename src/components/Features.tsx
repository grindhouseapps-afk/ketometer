import { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import { C } from '@/theme';
import { Icon, type IconName } from './Icons';
import { T } from './ui';
import { useReducedMotion } from './Gauge';

export const FEATURES: { icon: IconName; color: string; title: string; sub: string }[] = [
  { icon: 'gauge', color: C.accent, title: 'Live fat-burn meter', sub: 'Counts down to fat burn, then counts every calorie of fat to your goal.' },
  { icon: 'watch', color: '#4FC3F7', title: 'WHOOP sync', sub: 'Your real calorie burn flows in automatically. No WHOOP? Log activity in seconds.' },
  { icon: 'tanks', color: C.accentSoft, title: 'Liver and muscle tanks', sub: 'See exactly how much sugar is left before your body switches to fat.' },
  { icon: 'fork', color: '#7BD88F', title: 'One-tap food logging', sub: 'Save your go-to meals. Net carbs, protein and fat tracked for you.' },
  { icon: 'bell', color: '#C792EA', title: 'Daily plan and alerts', sub: 'A morning plan, a protein check, and a heads-up the moment you hit fat burn.' },
  { icon: 'scale', color: '#F78C6C', title: 'Smart weigh-ins', sub: 'Each weigh-in resizes your tanks and resets your fat-to-goal count.' },
  { icon: 'chart', color: '#82AAFF', title: 'Every number explained', sub: 'Tap any number to see where it came from. No black boxes.' },
  { icon: 'star', color: '#FFD54F', title: 'Goal celebration', sub: 'Hit your body fat goal and watch the meter go supernova.' },
];

/** "What you get" list shown right before the paywall. */
export function Features() {
  const reduced = useReducedMotion();
  const anims = useRef(FEATURES.map(() => new Animated.Value(0))).current;
  useEffect(() => {
    if (reduced) {
      anims.forEach((a) => a.setValue(1));
      return;
    }
    Animated.stagger(
      70,
      anims.map((a) => Animated.timing(a, { toValue: 1, duration: 320, useNativeDriver: true })),
    ).start();
  }, [anims, reduced]);

  return (
    <View style={{ gap: 18 }}>
      <View style={{ gap: 6 }}>
        <T w={600} size={26} style={{ lineHeight: 31 }}>
          Here's what you get
        </T>
        <T size={15} color={C.muted}>
          Everything you need to burn fat by the numbers.
        </T>
      </View>
      <View style={{ backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: C.line, paddingHorizontal: 14 }}>
        {FEATURES.map((f, i) => (
          <Animated.View
            key={f.title}
            style={{
              flexDirection: 'row',
              gap: 14,
              alignItems: 'center',
              paddingVertical: 13,
              borderTopWidth: i ? 1 : 0,
              borderTopColor: C.divider,
              opacity: anims[i],
              transform: [{ translateY: anims[i].interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
            }}
          >
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: f.color + '24', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={f.icon} color={f.color} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <T w={600} size={15}>
                {f.title}
              </T>
              <T size={12.5} color={C.muted} style={{ lineHeight: 17 }}>
                {f.sub}
              </T>
            </View>
          </Animated.View>
        ))}
      </View>
    </View>
  );
}
