// WHOOP redirects here with ?code&state. Exchange the code server-side, then bounce back to the app.
import { APP_RETURN, REDIRECT_URI, db, tokenRequest } from '../_shared/whoop.ts';

const back = (status: string) => new Response(null, { status: 302, headers: { Location: `${APP_RETURN}?status=${status}` } });

Deno.serve(async (req) => {
  const u = new URL(req.url);
  const code = u.searchParams.get('code');
  const state = u.searchParams.get('state');
  if (!code || !state || !/^[0-9a-f]{32}$/.test(state)) return back('error');

  const client = db();
  const { data: link } = await client.from('whoop_links').select('device_id').eq('oauth_state', state).maybeSingle();
  if (!link) return back('error');

  try {
    const t = await tokenRequest({ grant_type: 'authorization_code', code, redirect_uri: REDIRECT_URI });
    await client.from('whoop_links').update({
      access_token: t.access_token,
      refresh_token: t.refresh_token ?? null,
      expires_at: new Date(Date.now() + (t.expires_in - 60) * 1000).toISOString(),
      oauth_state: null,
      updated_at: new Date().toISOString(),
    }).eq('device_id', link.device_id);
    return back('ok');
  } catch {
    return back('error');
  }
});
