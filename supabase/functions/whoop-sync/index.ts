import { accessTokenFor, admin, fetchAll, json, requireUser } from '../_shared/whoop.ts';

Deno.serve(async (req) => {
  try {
    const user = await requireUser(req);
    const { since } = await req.json().catch(() => ({}));
    const start = since && !Number.isNaN(Date.parse(since)) ? new Date(since).toISOString() : new Date(Date.now() - 2 * 86_400_000).toISOString();
    const db = admin();
    const token = await accessTokenFor(db, user.id);
    if (!token) return json({ error: 'not_connected', cycles: [], workouts: [] });
    const [cycles, workouts] = await Promise.all([fetchAll(token, '/v2/cycle', start), fetchAll(token, '/v2/activity/workout', start)]);
    // Only the fields the app needs.
    const pick = (r: any) => ({ start: r.start, end: r.end ?? null, updated_at: r.updated_at, score_state: r.score_state, score: r.score ? { kilojoule: r.score.kilojoule } : null });
    return json({ cycles: cycles.map(pick), workouts: workouts.map(pick) });
  } catch (e) {
    if (e instanceof Response) return e;
    return json({ error: String((e as Error).message ?? e) }, 500);
  }
});
