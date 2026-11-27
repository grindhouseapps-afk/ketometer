import { admin, APP_RETURN, redirectUri, saveTokens, tokenRequest, WHOOP_API } from '../_shared/whoop.ts';

const back = (status: string) => new Response(null, { status: 302, headers: { Location: `${APP_RETURN}?status=${status}` } });

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (url.searchParams.get('error') || !code || !state) return back('cancelled');
  try {
    const db = admin();
    const { data: row } = await db.from('whoop_oauth_states').select('user_id, created_at').eq('state', state).maybeSingle();
    if (!row || Date.now() - new Date(row.created_at).getTime() > 3600_000) return back('expired');
    await db.from('whoop_oauth_states').delete().eq('state', state);
    const t = await tokenRequest({ grant_type: 'authorization_code', code, redirect_uri: redirectUri() });
    let whoopUserId: number | undefined;
    try {
      const p = await fetch(`${WHOOP_API}/v2/user/profile/basic`, { headers: { Authorization: `Bearer ${t.access_token}` } });
      if (p.ok) whoopUserId = (await p.json()).user_id;
    } catch { /* optional */ }
    await saveTokens(db, row.user_id, t, whoopUserId);
    return back('connected');
  } catch (e) {
    console.error(e);
    return back('error');
  }
});
