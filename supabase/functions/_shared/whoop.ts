import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

export const WHOOP_AUTH_URL = 'https://api.prod.whoop.com/oauth/oauth2/auth';
export const WHOOP_TOKEN_URL = 'https://api.prod.whoop.com/oauth/oauth2/token';
export const WHOOP_API = 'https://api.prod.whoop.com/developer';
export const SCOPES = 'offline read:cycles read:workout read:body_measurement';
export const APP_RETURN = 'ketometer://whoop';

export const env = (k: string) => {
  const v = Deno.env.get(k);
  if (!v) throw new Error(`Missing secret ${k}`);
  return v;
};

export const redirectUri = () => Deno.env.get('WHOOP_REDIRECT_URI') ?? `${env('SUPABASE_URL')}/functions/v1/whoop-callback`;

export const admin = (): SupabaseClient => createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' } });

/** Resolves the signed-in (anonymous) Supabase user from the request's JWT. */
export async function requireUser(req: Request) {
  const auth = req.headers.get('Authorization') ?? '';
  const { data, error } = await admin().auth.getUser(auth.replace(/^Bearer\s+/i, ''));
  if (error || !data.user) throw new Response('Unauthorized', { status: 401 });
  return data.user;
}

interface TokenResponse { access_token: string; refresh_token?: string; expires_in: number; scope?: string }

export async function tokenRequest(params: Record<string, string>): Promise<TokenResponse> {
  const body = new URLSearchParams({ client_id: env('WHOOP_CLIENT_ID'), client_secret: env('WHOOP_CLIENT_SECRET'), ...params });
  const res = await fetch(WHOOP_TOKEN_URL, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body });
  if (!res.ok) throw new Error(`WHOOP token ${res.status}: ${await res.text()}`);
  return await res.json();
}

export async function saveTokens(db: SupabaseClient, userId: string, t: TokenResponse, whoopUserId?: number) {
  const row: Record<string, unknown> = {
    user_id: userId,
    access_token: t.access_token,
    expires_at: new Date(Date.now() + (t.expires_in - 60) * 1000).toISOString(),
    scope: t.scope ?? null,
    updated_at: new Date().toISOString(),
  };
  if (t.refresh_token) row.refresh_token = t.refresh_token;
  if (whoopUserId != null) row.whoop_user_id = whoopUserId;
  const { error } = await db.from('whoop_tokens').upsert(row);
  if (error) throw error;
}

/** Returns a valid access token for the user, refreshing it when expired. Null when not connected. */
export async function accessTokenFor(db: SupabaseClient, userId: string): Promise<string | null> {
  const { data } = await db.from('whoop_tokens').select('*').eq('user_id', userId).maybeSingle();
  if (!data) return null;
  if (new Date(data.expires_at).getTime() > Date.now()) return data.access_token;
  if (!data.refresh_token) return null;
  const t = await tokenRequest({ grant_type: 'refresh_token', refresh_token: data.refresh_token, scope: 'offline' });
  await saveTokens(db, userId, t);
  return t.access_token;
}

/** Follows WHOOP's next_token pagination. */
export async function fetchAll<T>(token: string, path: string, start: string): Promise<T[]> {
  const out: T[] = [];
  let next: string | undefined;
  for (let page = 0; page < 40; page++) {
    const q = new URLSearchParams({ start, limit: '25' });
    if (next) q.set('nextToken', next);
    const res = await fetch(`${WHOOP_API}${path}?${q}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`WHOOP ${path} ${res.status}: ${await res.text()}`);
    const body = await res.json();
    out.push(...(body.records ?? []));
    next = body.next_token ?? undefined;
    if (!next) break;
  }
  return out;
}
