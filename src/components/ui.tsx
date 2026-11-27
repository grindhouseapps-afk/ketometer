import type { ReactNode } from 'react';
import { Pressable, Text, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';
import { C, F, S, caps } from '../theme.ts';

export function Card({ children, style, active, dim }: { children: ReactNode; style?: StyleProp<ViewStyle>; active?: boolean; dim?: boolean }) {
  return (
    <View style={[{ backgroundColor: C.graphite, borderRadius: S.radius, padding: S.card, borderWidth: 1.5, borderColor: active ? C.ember : 'transparent', opacity: dim ? 0.55 : 1 }, style]}>
      {children}
    </View>
  );
}

export function Caps({ children, color, style }: { children: ReactNode; color?: string; style?: object }) {
  return <Text style={[caps, color ? { color } : null, style]}>{children}</Text>;
}

export function T({ children, size = 15, color = C.bone, weight = 'regular', style, numberOfLines }: {
  children: ReactNode; size?: number; color?: string; weight?: keyof typeof F; style?: object; numberOfLines?: number;
}) {
  return <Text numberOfLines={numberOfLines} style={[{ fontFamily: F[weight], fontSize: size, color }, style]}>{children}</Text>;
}

export function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  return (
    <View style={{ height: 6, borderRadius: 3, backgroundColor: C.ash, overflow: 'hidden' }}>
      <View style={{ width: `${pct * 100}%`, height: 6, borderRadius: 3, backgroundColor: color }} />
    </View>
  );
}

export function Button({ title, onPress, kind = 'primary', disabled, style }: {
  title: string; onPress: () => void; kind?: 'primary' | 'outline' | 'ghost'; disabled?: boolean; style?: StyleProp<ViewStyle>;
}) {
  const bg = kind === 'primary' ? C.ember : 'transparent';
  const fg = kind === 'primary' ? C.charcoal : kind === 'ghost' ? C.smoke : C.bone;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [{ height: kind === 'ghost' ? 44 : 52, borderRadius: S.radius, backgroundColor: bg, borderWidth: kind === 'outline' ? 1 : 0, borderColor: C.ash, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.35 : pressed ? 0.8 : 1 }, style]}
    >
      <Text style={{ fontFamily: kind === 'primary' ? F.semibold : F.medium, fontSize: kind === 'ghost' ? 15 : 17, color: fg }}>{title}</Text>
    </Pressable>
  );
}

export function Field({ label, suffix, ...props }: TextInputProps & { label: string; suffix?: string }) {
  return (
    <View style={{ gap: 6, flex: 1 }}>
      <Caps>{label}</Caps>
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.graphite, borderRadius: 12, borderWidth: 1, borderColor: C.ash, paddingHorizontal: 12, minHeight: 48 }}>
        <TextInput placeholderTextColor={C.smoke} keyboardAppearance="dark" style={{ flex: 1, color: C.bone, fontFamily: F.regular, fontSize: 16, paddingVertical: 10 }} {...props} />
        {suffix ? <Text style={{ color: C.smoke, fontFamily: F.regular, fontSize: 14 }}>{suffix}</Text> : null}
      </View>
    </View>
  );
}

export function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: on }}
      style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: 22, borderWidth: 1.5, borderColor: on ? C.ember : C.ash, backgroundColor: C.graphite, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: C.bone, fontFamily: F.medium, fontSize: 14 }}>{label}</Text>
    </Pressable>
  );
}

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, style]}>{children}</View>;
}

export function Divider() {
  return <View style={{ height: 1, backgroundColor: C.divider }} />;
}
