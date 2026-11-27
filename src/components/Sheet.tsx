import { type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { C } from '@/theme';
import { T } from './ui';

/** Modal sheet chrome matching the "Where your numbers come from" design. */
export function Sheet({ title, children, footer }: { title: string; children: ReactNode; footer?: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: C.card }}>
      <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: C.line, marginTop: 12 }} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 8, paddingHorizontal: 24 }}>
        <T w={600} size={20} style={{ flex: 1 }}>
          {title}
        </T>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => router.back()} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.line, alignItems: 'center', justifyContent: 'center' }}>
          <Svg width={14} height={14} viewBox="0 0 14 14">
            <Path d="M2 2l10 10M12 2L2 12" stroke={C.text} strokeWidth={1.8} strokeLinecap="round" />
          </Svg>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24, gap: 16 }} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
      {footer ? <View style={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 16, paddingTop: 8, gap: 8 }}>{footer}</View> : null}
    </KeyboardAvoidingView>
  );
}

export function Chips<V extends string | number>({ options, value, onChange }: { options: { label: string; value: V }[]; value: V; onChange: (v: V) => void }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.value)}
            style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: 22, borderWidth: 1.5, borderColor: on ? C.accent : C.line, justifyContent: 'center', backgroundColor: C.bg }}
          >
            <T size={14} color={on ? C.text : C.muted}>
              {o.label}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}
