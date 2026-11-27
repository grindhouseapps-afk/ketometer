// WHOOP via Supabase edge functions. Tokens never touch the phone: the app holds an anonymous
// device id + secret, and the server exchanges, refreshes and uses the WHOOP tokens.
import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import { useApp, type BurnRec } from '../store.ts';

const BASE = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1`;
const KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
const headers = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };

function ensureDevice() {
  const s = useApp.getState();
  if (s.deviceId && s.deviceSecret) return { deviceId: s.deviceId, deviceSecret: s.deviceSecret };
  const deviceId = Crypto.randomUUID();
  const deviceSecret = Crypto.randomUUID() + Crypto.randomUUID();
  s.set({ deviceId, deviceSecret });
  return { deviceId, deviceSecret };
}

export async function connectWhoop(): Promise<boolean> {
  const { deviceId, deviceSecret } = ensureDevice();
  const res = await fetch(`${BASE}/whoop-authorize`, { method: 'POST', headers, body: JSON.stringify({ deviceId, deviceSecret }) });
  if (!res.ok) return false;
  const { url } = await res.json();
  const result = await WebBrowser.openAuthSessionAsync(url, 'ketometer://whoop');
  return result.type === 'success' && result.url.includes('status=ok');
}

export interface WhoopSync {
  burns: BurnRec[];
  workouts: { start: string; end: string; sport: string; kcal: number; strain?: number }[];
  profile?: { firstName?: string };
}

export async function syncWhoop(since: Date): Promise<WhoopSync | null> {
  const s = useApp.getState();
  if (!s.deviceId || !s.deviceSecret) return null;
  const res = await fetch(`${BASE}/whoop-sync`, {
    method: 'POST', headers,
    body: JSON.stringify({ deviceId: s.deviceId, deviceSecret: s.deviceSecret, since: since.toISOString() }),
  });
  if (!res.ok) return null;
  return res.json();
}

export async function disconnectWhoop() {
  const s = useApp.getState();
  if (!s.deviceId || !s.deviceSecret) return;
  await fetch(`${BASE}/whoop-sync`, { method: 'DELETE', headers, body: JSON.stringify({ deviceId: s.deviceId, deviceSecret: s.deviceSecret }) }).catch(() => {});
}
