# KetoMeter: Fat Burn Tracker

Grind House Apps · iOS (Expo SDK 58, expo-router, TypeScript). Bundle ID `com.grindhouseapps.ketometer`.

## App
- `src/app/` routes: `onboarding` → `paywall` (hard paywall, no trial) → tabs (`Today`, `Log`, `History`, `Settings`), plus modals `sources`, `food`, `activity`, `weigh-in`, `supernova`.
- `src/lib/store.ts` all user data on device (zustand + AsyncStorage).
- `src/lib/useMeter.ts` runs the engine every minute.
- `src/lib/purchases.ts` RevenueCat (entitlement `pro` by default, current offering's `annual` and `monthly` packages).
- `src/lib/whoop.ts` WHOOP connect + sync through Supabase edge functions (the WHOOP client secret never ships in the app).
- `src/lib/notifications.ts` local notifications: 8:00 plan, 14:30 protein check, fat-burn heads-up.

### EAS environment variables
| Name | Value |
| --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | `https://aavbqimuynxnbyrtbkwj.supabase.co` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `EXPO_PUBLIC_REVENUECAT_IOS_KEY` | RevenueCat iOS public SDK key (`appl_…`) |
| `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` | optional |
| `EXPO_PUBLIC_RC_ENTITLEMENT` | optional, defaults to `pro` |

### Supabase (WHOOP)
1. Auth → enable **Anonymous sign-ins**.
2. Run `supabase/migrations/20261126000000_whoop.sql`.
3. Secrets: `WHOOP_CLIENT_ID`, `WHOOP_CLIENT_SECRET` (optional `WHOOP_REDIRECT_URI`).
4. Deploy: `supabase functions deploy whoop-authorize whoop-callback whoop-sync whoop-disconnect --project-ref aavbqimuynxnbyrtbkwj` (`whoop-callback` has `verify_jwt = false` in `supabase/config.toml`).
5. WHOOP developer dashboard redirect URL: `https://aavbqimuynxnbyrtbkwj.supabase.co/functions/v1/whoop-callback`. Scopes: `offline read:cycles read:workout read:body_measurement`.

WHOOP cycles become burn samples: each workout is its own sample, the rest of the cycle's calories spread over the time outside workouts. A cycle in progress ends at its last update, and the engine fills the time since with resting burn.

### Build
```
npm install
npx eas-cli@latest init        # links the Expo project id, once
npx eas-cli@latest build --profile development --platform ios
```

## Engine (Option B, two-tank model)
`src/engine/` replays every event from the start point in 15-minute steps:
- **Liver tank** 100 g (400 kcal), full at the start point. Gates fat-burning mode.
- **Muscle tank** 6 g × kg lean mass. Drained mostly by workouts.
- **Fuel mix** fat share = 90% − 45% × liver fullness.
- **Fat to goal** = (weight − lean ÷ (1 − goal%)) × 3,500, re-anchored at each body reading; burned − glycogen used − food added back.
- Net carbs refill liver, then muscle. Weigh-ins resize tanks, never refill them.
- Burn from one source; uncovered time filled with Mifflin-St Jeor BMR; manual workouts count net of BMR.

`npm test` (engine + WHOOP sample tests) · `npm run typecheck`

Estimates from a simplified model. Not medical advice.
