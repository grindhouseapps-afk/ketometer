import * as WebBrowser from 'expo-web-browser';
import { callFunction } from './supabase';
import { useStore } from './store';
import { toBurnSamples, type SyncResponse } from './whoopSamples.ts';

const RETURN_URL = 'ketometer://whoop';

/** Opens WHOOP sign-in. Resolves true when the account is linked. */
export async function connectWhoop(): Promise<boolean> {
  const { url } = await callFunction<{ url: string }>('whoop-start');
  const res = await WebBrowser.openAuthSessionAsync(url, RETURN_URL);
  if (res.type !== 'success') return false;
  const ok = res.url.includes('status=connected');
  if (ok) {
    useStore.getState().set({ whoopConnected: true, source: 'whoop' });
    await syncWhoop().catch(() => {});
  }
  return ok;
}

export async function disconnectWhoop() {
  await callFunction('whoop-disconnect').catch(() => {});
  useStore.getState().set({ whoopConnected: false, whoopSyncedAt: null, burns: [], source: 'manual' });
}

let syncing: Promise<void> | null = null;

/** Pulls WHOOP cycles and workouts into the store as burn samples. */
export function syncWhoop(): Promise<void> {
  if (syncing) return syncing;
  syncing = (async () => {
    const s = useStore.getState();
    if (!s.whoopConnected) return;
    // First sync: back to the meter's start (max 120 days). Later: re-fetch the last 36 h so cycles in progress get their latest score.
    const now = Date.now();
    const first = Math.max(s.startAt, now - 120 * 86_400_000);
    const from = s.whoopSyncedAt ? Math.max(first, s.whoopSyncedAt - 36 * 3_600_000) : first;
    const data = await callFunction<SyncResponse & { error?: string }>('whoop-sync', { since: new Date(from).toISOString() });
    if (data.error === 'not_connected') {
      useStore.getState().set({ whoopConnected: false });
      return;
    }
    const samples = toBurnSamples(data);
    // Samples that started before `from` but belong to a refetched cycle get replaced too.
    const earliest = samples.length ? Math.min(from, samples[0].start) : from;
    useStore.getState().mergeBurns(samples, earliest);
    useStore.getState().set({ whoopSyncedAt: Date.now() });
  })().finally(() => {
    syncing = null;
  });
  return syncing;
}
