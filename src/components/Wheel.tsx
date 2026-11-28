import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { Animated, View, type ListRenderItemInfo } from 'react-native';
import * as Haptics from 'expo-haptics';
import { C, F } from '@/theme';
import { T } from './ui';

const ITEM = 52;
const VISIBLE = 5;

/**
 * Scrolling picker wheel (iOS-style) built on a snapping FlatList, so it needs no extra native module.
 * Values are passed in; `index` is the selected position.
 */
export const Wheel = memo(function Wheel({
  values,
  index,
  onChange,
  format,
  unit,
  label,
  width = 200,
}: {
  values: number[];
  index: number;
  onChange: (index: number) => void;
  format: (v: number) => string;
  unit?: string;
  label: string;
  width?: number;
}) {
  const scrollY = useRef(new Animated.Value(index * ITEM)).current;
  const listRef = useRef<any>(null);
  const current = useRef(index);
  const dragging = useRef(false);

  // Follow outside changes (e.g. the goal snapping below a new current value).
  useEffect(() => {
    if (index !== current.current && !dragging.current) {
      current.current = index;
      listRef.current?.scrollToOffset({ offset: index * ITEM, animated: false });
    }
  }, [index]);

  const onScroll = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
        useNativeDriver: true,
        listener: (e: any) => {
          const i = Math.max(0, Math.min(values.length - 1, Math.round(e.nativeEvent.contentOffset.y / ITEM)));
          if (i !== current.current) {
            current.current = i;
            Haptics.selectionAsync().catch(() => {});
            onChange(i);
          }
        },
      }),
    [scrollY, values.length, onChange],
  );

  const renderItem = useCallback(
    ({ item, index: i }: ListRenderItemInfo<number>) => {
      const range = [(i - 2) * ITEM, (i - 1) * ITEM, i * ITEM, (i + 1) * ITEM, (i + 2) * ITEM];
      const opacity = scrollY.interpolate({ inputRange: range, outputRange: [0.15, 0.4, 1, 0.4, 0.15], extrapolate: 'clamp' });
      const scale = scrollY.interpolate({ inputRange: range, outputRange: [0.7, 0.85, 1, 0.85, 0.7], extrapolate: 'clamp' });
      return (
        <Animated.View style={{ height: ITEM, alignItems: 'center', justifyContent: 'center', opacity, transform: [{ scale }] }}>
          <Animated.Text style={{ fontFamily: F[300], fontSize: width < 200 ? 32 : 40, color: C.text, fontVariant: ['tabular-nums'] }}>{format(item)}</Animated.Text>
        </Animated.View>
      );
    },
    [scrollY, format, width],
  );

  const step = (d: number) => {
    const i = Math.max(0, Math.min(values.length - 1, current.current + d));
    current.current = i;
    listRef.current?.scrollToOffset({ offset: i * ITEM, animated: true });
    onChange(i);
  };

  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: `${format(values[index])}${unit ? ' ' + unit : ''}` }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => step(e.nativeEvent.actionName === 'increment' ? 1 : -1)}
      style={{ height: ITEM * VISIBLE, width, alignSelf: 'center' }}
    >
      {/* Selection band */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: ITEM * 2,
          left: 0,
          right: 0,
          height: ITEM,
          borderRadius: 14,
          backgroundColor: C.card,
          borderWidth: 1.5,
          borderColor: C.accent,
        }}
      />
      <Animated.FlatList
        ref={listRef}
        data={values}
        keyExtractor={(v: number, i: number) => String(i)}
        renderItem={renderItem}
        getItemLayout={(_: unknown, i: number) => ({ length: ITEM, offset: ITEM * i, index: i })}
        initialScrollIndex={index}
        initialNumToRender={12}
        windowSize={7}
        maxToRenderPerBatch={20}
        snapToInterval={ITEM}
        decelerationRate="fast"
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: ITEM * 2 }}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onScrollBeginDrag={() => (dragging.current = true)}
        onMomentumScrollEnd={() => (dragging.current = false)}
        onScrollEndDrag={() => setTimeout(() => (dragging.current = false), 300)}
      />
      {unit ? (
        <T pointerEvents="none" size={18} color={C.muted} style={{ position: 'absolute', right: 14, top: ITEM * 2 + 15 }}>
          {unit}
        </T>
      ) : null}
    </View>
  );
});

/** Inclusive numeric range with a fixed step, rounded to avoid float drift. */
export function range(min: number, max: number, step: number) {
  const n = Math.round((max - min) / step);
  const dp = step < 1 ? 1 : 0;
  return Array.from({ length: n + 1 }, (_, i) => Number((min + i * step).toFixed(dp)));
}

export function nearestIndex(values: number[], v: number) {
  let best = 0;
  for (let i = 1; i < values.length; i++) if (Math.abs(values[i] - v) < Math.abs(values[best] - v)) best = i;
  return best;
}
