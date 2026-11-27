import { Tabs } from 'expo-router';
import type { ReactElement } from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { C, F } from '../../src/theme.ts';

const icons: Record<string, (c: string) => ReactElement> = {
  index: (c) => (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.8} strokeLinecap="round">
      <Path d="M4.5 17.5a9 9 0 1 1 15 0" /><Path d="M12 12l4-4" />
    </Svg>
  ),
  log: (c) => (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.8} strokeLinecap="round">
      <Circle cx={12} cy={12} r={9} /><Path d="M12 8v8M8 12h8" />
    </Svg>
  ),
  history: (c) => (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.8} strokeLinecap="round">
      <Path d="M4 19h16" /><Path d="M6 15l4-4 3 3 5-6" />
    </Svg>
  ),
  settings: (c) => (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.8} strokeLinecap="round">
      <Rect x={4} y={6} width={16} height={2.5} rx={1.25} /><Rect x={4} y={11} width={16} height={2.5} rx={1.25} /><Rect x={4} y={16} width={16} height={2.5} rx={1.25} />
    </Svg>
  ),
};

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        sceneStyle: { backgroundColor: C.charcoal },
        tabBarStyle: { backgroundColor: C.charcoal, borderTopColor: C.divider },
        tabBarActiveTintColor: C.ember,
        tabBarInactiveTintColor: C.smoke,
        tabBarLabelStyle: { fontFamily: F.medium, fontSize: 11 },
        tabBarIcon: ({ color }) => icons[route.name]?.(String(color)),
      })}
    >
      <Tabs.Screen name="index" options={{ title: 'Today' }} />
      <Tabs.Screen name="log" options={{ title: 'Log' }} />
      <Tabs.Screen name="history" options={{ title: 'History' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
