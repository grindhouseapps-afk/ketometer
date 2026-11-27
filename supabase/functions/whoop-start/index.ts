import { admin, json, redirectUri, requireUser, env, SCOPES, WHOOP_AUTH_URL } from '../_shared/whoop.ts';

Deno.serve(async (req) => {
  try {
    const user = await requireUser(req);
    const state = crypto.randomUUID().replace(/-/g, '');
    const db = admin();
    await db.from('whoop_oauth_states').delete().lt('created_at', new Date(Date.now() - 3600_000).toISOString());
    const { error } = await db.from('whoop_oauth_states').insert({ state, user_id: user.id });
    if (error) throw error;
    const q = new URLSearchParams({ response_type: 'code', client_id: env('WHOOP_CLIENT_ID'), redirect_uri: redirectUri(), scope: SCOPES, state });
    return json({ url: `${WHOOP_AUTH_URL}?${q}` });
  } catch (e) {
    if (e instanceof Response) return e;
    return json({ error: String((e as Error).message ?? e) }, 500);
  }
});
