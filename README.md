# KetoMeter: Fat Burn Tracker

Grind House Apps · iOS (Expo, expo-router, TypeScript).

## Engine (Option B, two-tank model)
`src/engine/` replays every event from the start point in 15-minute steps:
- **Liver tank** 100 g (400 kcal), full at the start point. Gates fat-burning mode.
- **Muscle tank** 6 g × kg lean mass. Drained mostly by workouts.
- **Fuel mix** fat share = 90% − 45% × liver fullness.
- **Fat to goal** = (weight − lean ÷ (1 − goal%)) × 3,500, re-anchored at each body reading; burned − glycogen used − food added back.
- Net carbs refill liver, then muscle. Weigh-ins resize tanks, never refill them.
- Burn from one source; uncovered time filled with Mifflin-St Jeor BMR; manual workouts count net of BMR.

`npm run test:engine`

Estimates from a simplified model. Not medical advice.

## App
- `app/` expo-router screens: onboarding → paywall → tabs (Today, Log, History, Settings), plus `sources`, `your-data`, `goal` (Supernova).
- `src/data/` Apple Health (HealthKit), WHOOP (via Supabase edge functions), sync.
- `src/purchases.ts` RevenueCat (entitlement `pro`, offering `default`).
- `src/notifications.ts` local notifications (morning plan 7:30, weigh-in 7:00, protein checks, fat-burn ETA), quiet hours.
- `targets/widget/` WidgetKit (small, medium, lock screen circular + rectangular) via `@bacons/apple-targets`, App Group `group.com.grindhouseapps.ketometer`.
- Web preview: `npx expo export --platform web`, then open `/?demo=1` (stage 1), `/?demo=2` (fat burn), `/onboarding?demo=onb`, `/paywall?demo=paywall`.

## Backend (Supabase `aavbqimuynxnbyrtbkwj`)
- `supabase/migrations/0001_whoop_links.sql` — table for WHOOP tokens (service role only).
- `supabase/functions/whoop-authorize | whoop-callback | whoop-sync` — OAuth + token refresh + data fetch. Secrets: `WHOOP_CLIENT_ID`, `WHOOP_CLIENT_SECRET`.
