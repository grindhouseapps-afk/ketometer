export const C = {
  bg: '#141414',
  bgDeep: '#0A0A0A',
  card: '#1F1F1F',
  line: '#2E2E2E',
  divider: '#2A2A2A',
  text: '#F2F0EC',
  muted: '#9A9A9A',
  accent: '#FF6A13',
  accentSoft: '#FFA048',
  ember: '#B4440E',
  ok: '#34C759',
};

export const F = {
  300: 'InterTight_300Light',
  400: 'InterTight_400Regular',
  500: 'InterTight_500Medium',
  600: 'InterTight_600SemiBold',
  700: 'InterTight_700Bold',
} as const;

export type Weight = keyof typeof F;
