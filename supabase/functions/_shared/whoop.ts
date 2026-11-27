import { createClient } from 'jsr:@supabase/supabase-js@2';

export const WHOOP_AUTH = 'https://api.prod.whoop.com/oauth/oauth2/auth';
export const WHOOP_TOKEN = 'https://api.prod.whoop.com/oauth/oauth2/token';
export const WHOOP_API = 'https://api.prod.whoop.com/developer';
export const SCOPES = 'offline read:cycles read:workout read:profile read:body_measurement';
export const REDIRECT_URI = `${Deno.env.get('SUPABASE_URL')}/functions/v1/whoop-callback`;
export const APP_RETURN = 'ketometer://whoop';

export const db = () => createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

export const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
};

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

export async function sha256(s: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function isUuid(s: unknown): s is string {
  return typeof s === 'string' && /^[0-9a-f-]{36}$/i.test(s);
}

export async function tokenRequest(params: Record<string, string>) {
  const body = new URLSearchParams({
    client_id: Deno.env.get('WHOOP_CLIENT_ID')!,
    client_secret: Deno.env.get('WHOOP_CLIENT_SECRET')!,
    ...params,
  });
  const res = await fetch(WHOOP_TOKEN, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  if (!res.ok) throw new Error(`token ${res.status}`);
  return res.json() as Promise<{ access_token: string; refresh_token?: string; expires_in: number }>;
}
