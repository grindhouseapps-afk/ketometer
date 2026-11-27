import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://aavbqimuynxnbyrtbkwj.supabase.co';
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabaseConfigured = anonKey.length > 0;

export const supabase: SupabaseClient = createClient(url, anonKey || 'missing-anon-key', {
  auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
});

/** Every install gets an anonymous Supabase user; it only owns the WHOOP connection. */
export async function ensureSession() {
  if (!supabaseConfigured) throw new Error('Supabase is not configured (EXPO_PUBLIC_SUPABASE_ANON_KEY).');
  const { data } = await supabase.auth.getSession();
  if (data.session) return data.session;
  const { data: signed, error } = await supabase.auth.signInAnonymously();
  if (error || !signed.session) throw error ?? new Error('Could not start a session');
  return signed.session;
}

export async function callFunction<T>(name: string, body?: unknown): Promise<T> {
  await ensureSession();
  const { data, error } = await supabase.functions.invoke(name, { body: body ?? {} });
  if (error) throw error;
  return data as T;
}
