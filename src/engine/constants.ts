// KetoMeter model constants (Option B: two-tank model).
// Every number here is user-visible in "Where your numbers come from".
// Estimates from a simplified model of human metabolism. Not medical advice.

export const LB_PER_KG = 2.2046;
export const KCAL_PER_G_CARB = 4;
export const KCAL_PER_LB_FAT = 3500;

/** Liver glycogen tank: ~100 g, the tank that gates fat-burning mode. */
export const LIVER_GLYCOGEN_G = 100;
export const LIVER_CAP_KCAL = LIVER_GLYCOGEN_G * KCAL_PER_G_CARB; // 400

/** Muscle glycogen: grams per kg of lean mass. Drained mainly by workouts. */
export const MUSCLE_GLYCOGEN_G_PER_KG_LEAN = 6;

/** Fuel mix: fat share of burn = FAT_SHARE_EMPTY - (FAT_SHARE_EMPTY - FAT_SHARE_FULL) * liverFraction. */
export const FAT_SHARE_FULL = 0.45;
export const FAT_SHARE_EMPTY = 0.9;

/** At rest, this share of carbohydrate burn is drawn from the liver tank; the rest comes from gluconeogenesis. */
export const LIVER_SHARE_OF_RESTING_CARB = 0.7;

/** During activity, glycogen burn is split between muscle and liver. */
export const ACTIVE_CARB_FROM_MUSCLE = 0.8;

/** Fat-burning mode starts when the liver tank is effectively empty (kcal). */
export const FAT_BURN_AT_KCAL = 1;

/** Daily defaults. */
export const DEFAULT_NET_CARB_BUDGET_G = 25;
export const PROTEIN_G_PER_LB_LEAN = 1.0;

/** Simulation step. */
export const STEP_MINUTES = 15;

/** Window used for "at your pace" projections. */
export const PACE_WINDOW_HOURS = 6;
