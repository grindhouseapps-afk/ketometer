// POST { deviceId, deviceSecret, since } -> cycles as burn samples + workouts.
// DELETE { deviceId, deviceSecret } -> forget the WHOOP link.
import { WHOOP_API, cors, db, isUuid, json, sha256, tokenRequest } from '../_shared/whoop.ts';

const KJ_PER_KCAL = 4.184;

async function page(path: string, token: string, start: string) {
  const out: any[] = [];
  let next: string | undefined;
  for (let i = 0; i < 10; i++) {
    const u = new URL(`${WHOOP_API}${path}`);
    u.searchParams.set('start', start);
    u.searchParams.set('limit', '25');
    if (next) u.searchParams.set('nextToken', next);
    const res = await fetch(u, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`${path} ${res.status}`);
    const body = await res.json();
    out.push(...(body.records ?? []));
    next = body.next_token ?? body.nextToken;
    if (!next) break;
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const { deviceId, deviceSecret, since } = await req.json().catch(() => ({}));
  if (!isUuid(deviceId) || typeof deviceSecret !== 'string') return json({ error: 'bad request' }, 400);

  const client = db();
  const { data: link } = await client.from('whoop_links').select('*').eq('device_id', deviceId).maybeSingle();
  if (!link || link.secret_hash !== (await sha256(deviceSecret))) return json({ error: 'not connected' }, 404);

  if (req.method === 'DELETE') {
    await client.from('whoop_links').delete().eq('device_id', deviceId);
    return json({ ok: true });
  }
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  if (!link.access_token) return json({ error: 'not connected' }, 404);

  let token = link.access_token as string;
  if (!link.expires_at || new Date(link.expires_at) <= new Date()) {
    if (!link.refresh_token) return json({ error: 'reconnect' }, 401);
    try {
      const t = await tokenRequest({ grant_type: 'refresh_token', refresh_token: link.refresh_token, scope: 'offline' });
      token = t.access_token;
      await client.from('whoop_links').update({
        access_token: t.access_token,
        refresh_token: t.refresh_token ?? link.refresh_token,
        expires_at: new Date(Date.now() + (t.expires_in - 60) * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('device_id', deviceId);
    } catch {
      return json({ error: 'reconnect' }, 401);
    }
  }

  const start = typeof since === 'string' && !isNaN(Date.parse(since)) ? since : new Date(Date.now() - 14 * 864e5).toISOString();
  try {
    const [cycles, workouts] = await Promise.all([page('/v2/cycle', token, start), page('/v2/activity/workout', token, start)]);
    const now = new Date().toISOString();
    const burns = cycles
      .filter((c) => c.score?.kilojoule != null)
      .map((c) => ({ start: c.start, end: c.end ?? now, totalKcal: c.score.kilojoule / KJ_PER_KCAL }));
    const wo = workouts
      .filter((w) => w.score?.kilojoule != null)
      .map((w) => ({ start: w.start, end: w.end, sport: w.sport_name ?? 'Workout', kcal: w.score.kilojoule / KJ_PER_KCAL, strain: w.score.strain }));
    return json({ burns, workouts: wo });
  } catch (e) {
    return json({ error: String(e) }, 502);
  }
});
