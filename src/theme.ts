export const C = {
  charcoal: '#141414',
  graphite: '#1F1F1F',
  ash: '#2E2E2E',
  divider: '#2A2A2A',
  smoke: '#9A9A9A',
  bone: '#F2F0EC',
  coal: '#B4440E',
  ember: '#FF6A13',
  glow: '#FFA048',
  ok: '#34C759',
} as const;

export const S = { margin: 24, section: 24, inner: 12, card: 16, radius: 16, touch: 44 } as const;

export const F = {
  light: 'InterTight_300Light',
  regular: 'InterTight_400Regular',
  medium: 'InterTight_500Medium',
  semibold: 'InterTight_600SemiBold',
} as const;

export const caps = { fontFamily: F.semibold, fontSize: 12, letterSpacing: 1.2, color: C.smoke } as const;

export const fmt = (n: number) => Math.round(n).toLocaleString('en-US');
