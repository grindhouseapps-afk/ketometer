// POST { deviceId, deviceSecret } -> { url } to open in the in-app browser.
import { REDIRECT_URI, SCOPES, WHOOP_AUTH, cors, db, isUuid, json, sha256 } from '../_shared/whoop.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  const { deviceId, deviceSecret } = await req.json().catch(() => ({}));
  if (!isUuid(deviceId) || typeof deviceSecret !== 'string' || deviceSecret.length < 32) return json({ error: 'bad request' }, 400);

  const client = db();
  const secretHash = await sha256(deviceSecret);
  const { data: existing } = await client.from('whoop_links').select('secret_hash').eq('device_id', deviceId).maybeSingle();
  if (existing && existing.secret_hash !== secretHash) return json({ error: 'forbidden' }, 403);

  const state = crypto.randomUUID().replace(/-/g, '');
  const { error } = await client.from('whoop_links').upsert({ device_id: deviceId, secret_hash: secretHash, oauth_state: state, updated_at: new Date().toISOString() });
  if (error) return json({ error: 'db' }, 500);

  const url = new URL(WHOOP_AUTH);
  url.searchParams.set('client_id', Deno.env.get('WHOOP_CLIENT_ID')!);
  url.searchParams.set('redirect_uri', REDIRECT_URI);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', SCOPES);
  url.searchParams.set('state', state);
  return json({ url: url.toString() });
});
