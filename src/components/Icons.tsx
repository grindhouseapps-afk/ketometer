import Svg, { Circle, Path, Rect } from 'react-native-svg';

export type IconName = 'gauge' | 'watch' | 'tanks' | 'fork' | 'bell' | 'scale' | 'star' | 'chart' | 'lock' | 'check';

/** Stroke icons drawn inline so they take the current color. */
export function Icon({ name, size = 20, color }: { name: IconName; size?: number; color: string }) {
  const p = { stroke: color, strokeWidth: 2, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {name === 'gauge' ? (
        <>
          <Path {...p} d="M4.5 17a8.5 8.5 0 1 1 15 0" />
          <Path {...p} d="M12 13l4-4" />
          <Circle {...p} cx={12} cy={13} r={1.2} />
        </>
      ) : null}
      {name === 'watch' ? (
        <>
          <Rect {...p} x={6.5} y={6} width={11} height={12} rx={3} />
          <Path {...p} d="M9 6l.6-3h4.8L15 6M9 18l.6 3h4.8l.6-3M12 9.5V12l1.5 1.5" />
        </>
      ) : null}
      {name === 'tanks' ? (
        <>
          <Rect {...p} x={4} y={4} width={6.5} height={16} rx={2} />
          <Rect {...p} x={13.5} y={4} width={6.5} height={16} rx={2} />
          <Path {...p} d="M4 13h6.5M13.5 9h6.5" />
        </>
      ) : null}
      {name === 'fork' ? <Path {...p} d="M7 3v8m-2.5-8v5a2.5 2.5 0 0 0 5 0V3M7 11v10M17 3c-2 1.5-2.5 4-2.5 7h2.5v11" /> : null}
      {name === 'bell' ? <Path {...p} d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16zM10 20.5a2 2 0 0 0 4 0" /> : null}
      {name === 'scale' ? (
        <>
          <Rect {...p} x={3.5} y={3.5} width={17} height={17} rx={4} />
          <Path {...p} d="M8.5 9a5 5 0 0 1 7 0L12 12.5z" />
        </>
      ) : null}
      {name === 'star' ? <Path {...p} d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9 6.8 19.6l1-5.8L3.5 9.7l5.9-.9z" /> : null}
      {name === 'chart' ? <Path {...p} d="M4 20V10m5.3 10V4m5.4 16v-7M20 20v-4" /> : null}
      {name === 'lock' ? (
        <>
          <Rect {...p} x={5} y={10.5} width={14} height={10} rx={2.5} />
          <Path {...p} d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
        </>
      ) : null}
      {name === 'check' ? <Path {...p} strokeWidth={3} d="M5 12.5l4.5 4.5L19 7.5" /> : null}
    </Svg>
  );
}
