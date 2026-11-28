import { type ReactNode } from 'react';
import {
  Pressable,
  Text,
  TextInput,
  View,
  type PressableProps,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { C, F, type Weight } from '@/theme';

export function T({ w = 400, size = 15, color = C.text, style, ...rest }: TextProps & { w?: Weight; size?: number; color?: string }) {
  return <Text {...rest} style={[{ fontFamily: F[w], fontSize: size, color }, style]} />;
}

/** Small caps section label, e.g. "FUEL MIX RIGHT NOW". */
export function Label({ children, color = C.muted, style }: { children: ReactNode; color?: string; style?: StyleProp<TextStyle> }) {
  return (
    <T w={600} size={12} color={color} style={[{ letterSpacing: 1.2 }, style]}>
      {children}
    </T>
  );
}

export function Card({ children, style, highlight }: { children: ReactNode; style?: StyleProp<ViewStyle>; highlight?: boolean }) {
  return (
    <View
      style={[
        { backgroundColor: C.card, borderRadius: 16, padding: 16, gap: 12 },
        highlight && { borderWidth: 1.5, borderColor: C.accent },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Bar({ fraction, color = C.accent, height = 6 }: { fraction: number; color?: string; height?: number }) {
  const f = Math.max(0, Math.min(1, fraction));
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: C.line, overflow: 'hidden' }}>
      <View style={{ width: `${f * 100}%`, height, borderRadius: height / 2, backgroundColor: color }} />
    </View>
  );
}

type BtnProps = Omit<PressableProps, 'children' | 'style'> & {
  title: string;
  kind?: 'primary' | 'outline' | 'ghost';
  style?: StyleProp<ViewStyle>;
};

/** Orange gradient fill with a soft glow, used behind primary buttons. */
export function GlowFill({ radius = 16 }: { radius?: number }) {
  return (
    <Svg style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id="km-glow" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFA048" />
          <Stop offset="0.55" stopColor="#FF6A13" />
          <Stop offset="1" stopColor="#F2510A" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100" height="100" fill="url(#km-glow)" />
    </Svg>
  );
}

export function Button({ title, kind = 'primary', disabled, style, onPress, ...rest }: BtnProps) {
  const primary = kind === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={(e) => {
        Haptics.selectionAsync().catch(() => {});
        onPress?.(e);
      }}
      style={({ pressed }) => [
        {
          height: kind === 'ghost' ? 44 : 56,
          borderRadius: 18,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: primary ? 'hidden' : 'visible',
          backgroundColor: 'transparent',
          borderWidth: kind === 'outline' ? 1 : 0,
          borderColor: C.line,
          opacity: disabled ? 0.4 : 1,
          transform: [{ scale: pressed && !disabled ? 0.98 : 1 }],
        },
        style,
      ]}
      {...rest}
    >
      {primary ? <GlowFill /> : null}
      <T w={primary ? 700 : 500} size={primary ? 17 : kind === 'ghost' ? 15 : 16} color={primary ? '#1A0A00' : kind === 'ghost' ? C.muted : C.text}>
        {title}
      </T>
    </Pressable>
  );
}

/** Wraps a primary Button with an outer glow (shadows are clipped by overflow on the button itself). */
export function Glow({ children, on = true }: { children: ReactNode; on?: boolean }) {
  return (
    <View style={on ? { shadowColor: C.accent, shadowOpacity: 0.55, shadowRadius: 18, shadowOffset: { width: 0, height: 6 }, borderRadius: 18 } : undefined}>
      {children}
    </View>
  );
}

export function Option({ label, selected, onPress, disabled, sub }: { label: string; selected: boolean; onPress: () => void; disabled?: boolean; sub?: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      style={{
        minHeight: 56,
        borderRadius: 16,
        backgroundColor: C.card,
        borderWidth: 1.5,
        borderColor: selected ? C.accent : C.line,
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <T size={16}>{label}</T>
        {sub ? <T size={12} color={C.muted}>{sub}</T> : null}
      </View>
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          borderWidth: 1.5,
          borderColor: selected ? C.accent : C.line,
          backgroundColor: selected ? C.accent : 'transparent',
        }}
      />
    </Pressable>
  );
}

export function Stepper({
  display,
  onMinus,
  onPlus,
  onMinusLong,
  onPlusLong,
  size = 48,
}: {
  display: string;
  onMinus: () => void;
  onPlus: () => void;
  /** Hold to jump by a bigger step. */
  onMinusLong?: () => void;
  onPlusLong?: () => void;
  size?: number;
}) {
  const small = size < 40;
  const btn = small ? 44 : 56;
  const B = ({ label, onPress, onLong, a11y }: { label: string; onPress: () => void; onLong?: () => void; a11y: string }) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y}
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      onLongPress={onLong}
      style={({ pressed }) => ({
        width: btn,
        height: btn,
        borderRadius: btn / 2,
        borderWidth: 1,
        borderColor: C.line,
        backgroundColor: C.card,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <T size={small ? 20 : 26}>{label}</T>
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: small ? 12 : 24 }}>
      <B label="−" onPress={onMinus} onLong={onMinusLong} a11y="Decrease" />
      <T w={300} size={size} style={{ minWidth: small ? 90 : 170, textAlign: 'center' }}>
        {display}
      </T>
      <B label="+" onPress={onPlus} onLong={onPlusLong} a11y="Increase" />
    </View>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  numeric,
  suffix,
}: {
  label: string;
  value: string;
  onChangeText: (s: string) => void;
  placeholder?: string;
  numeric?: boolean;
  suffix?: string;
}) {
  return (
    <View style={{ gap: 6, flex: 1 }}>
      <T size={13} color={C.muted}>
        {label}
      </T>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          height: 52,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: C.line,
          backgroundColor: C.card,
          paddingHorizontal: 14,
        }}
      >
        <TextInput
          accessibilityLabel={label}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#6A6A6A"
          keyboardType={numeric ? 'decimal-pad' : 'default'}
          keyboardAppearance="dark"
          selectionColor={C.accent}
          style={{ flex: 1, color: C.text, fontFamily: F[400], fontSize: 17 }}
        />
        {suffix ? (
          <T size={14} color={C.muted}>
            {suffix}
          </T>
        ) : null}
      </View>
    </View>
  );
}

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, style]}>{children}</View>;
}
