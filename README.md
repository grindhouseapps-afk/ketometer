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
