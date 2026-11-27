import { accessTokenFor, admin, json, requireUser, WHOOP_API } from '../_shared/whoop.ts';

Deno.serve(async (req) => {
  try {
    const user = await requireUser(req);
    const db = admin();
    const token = await accessTokenFor(db, user.id).catch(() => null);
    if (token) await fetch(`${WHOOP_API}/v2/user/access`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    await db.from('whoop_tokens').delete().eq('user_id', user.id);
    return json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    return json({ error: String((e as Error).message ?? e) }, 500);
  }
});
