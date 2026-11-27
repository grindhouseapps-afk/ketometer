export const n0 = (v: number) => Math.round(v).toLocaleString('en-US');
export const n1 = (v: number) => v.toFixed(1);
export const pct = (v: number) => `${Math.round(v * 100)}%`;

export function heightLabel(inches: number) {
  return `${Math.floor(inches / 12)}′ ${inches % 12}″`;
}

export function ago(ms: number, now = Date.now()) {
  const m = Math.max(0, Math.round((now - ms) / 60_000));
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return `${Math.round(h / 24)} d ago`;
}

export function hoursLabel(h: number) {
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} min`;
  return `${Math.round(h)} h`;
}

export function timeLabel(ms: number) {
  return new Date(ms).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function dayLabel(ms: number) {
  const d = new Date(ms);
  const today = new Date();
  const y = new Date();
  y.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === y.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function dateTimeLabel(ms: number) {
  return new Date(ms).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

/** Parses a user-typed number; returns NaN for empty. */
export const num = (s: string) => (s.trim() === '' ? NaN : Number(s.replace(',', '.')));
