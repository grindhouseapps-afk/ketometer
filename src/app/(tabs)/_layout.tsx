import { Tabs } from 'expo-router/js-tabs';
import Svg, { Path, Circle } from 'react-native-svg';
import { C, F } from '@/theme';

function Icon({ name, color }: { name: 'today' | 'log' | 'history' | 'settings'; color: unknown }) {
  const p = { stroke: typeof color === 'string' ? color : C.muted, strokeWidth: 1.8, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      {name === 'today' ? <Path {...p} d="M12 21c-4 0-7-2.7-7-6.4 0-2.6 1.6-4.4 3.1-5.8.2 1.7.9 2.8 2 3.3-.5-3 .5-6.6 3.1-10.8 1 4 5.3 7.1 5.3 13.1 0 3.7-2.6 6.6-6.5 6.6Z" /> : null}
      {name === 'log' ? (
        <>
          <Circle {...p} cx={12} cy={12} r={9} />
          <Path {...p} d="M12 8v8M8 12h8" />
        </>
      ) : null}
      {name === 'history' ? <Path {...p} d="M4 6h16M4 12h16M4 18h10" /> : null}
      {name === 'settings' ? (
        <>
          <Circle {...p} cx={12} cy={12} r={3} />
          <Path {...p} d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" />
        </>
      ) : null}
    </Svg>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.accent,
        tabBarInactiveTintColor: C.muted,
        tabBarStyle: { backgroundColor: C.bg, borderTopColor: C.divider },
        tabBarLabelStyle: { fontFamily: F[500], fontSize: 12 },
        sceneStyle: { backgroundColor: C.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Today', tabBarIcon: ({ color }) => <Icon name="today" color={color} /> }} />
      <Tabs.Screen name="log" options={{ title: 'Log', tabBarIcon: ({ color }) => <Icon name="log" color={color} /> }} />
      <Tabs.Screen name="history" options={{ title: 'History', tabBarIcon: ({ color }) => <Icon name="history" color={color} /> }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: ({ color }) => <Icon name="settings" color={color} /> }} />
    </Tabs>
  );
}
