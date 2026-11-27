// Local notifications, rescheduled every time the app opens, syncs or logs.
// Copy is tied to real progress; quiet hours and per-type toggles are respected.
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { EngineState } from './engine/simulate.ts';
import type { AppState } from './store.ts';
import { fmt } from './theme.ts';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

export async function askNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

const inQuiet = (h: number, q: AppState['notif']) => (q.quietStart > q.quietEnd ? h >= q.quietStart || h < q.quietEnd : h >= q.quietStart && h < q.quietEnd);

function at(dayOffset: number, hour: number, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d;
}

export function journeyPct(m: EngineState): number {
  if (!m.fatGoalStartKcal || m.fatToGoalKcal == null) return 0;
  return Math.max(0, Math.min(100, Math.round((1 - m.fatToGoalKcal / m.fatGoalStartKcal) * 100)));
}

export function morningText(m: EngineState, goal: number) {
  return `You're ${journeyPct(m)}% of the way to ${goal.toFixed(1)}%. Keep carbs under ${m.netCarbBudgetG} g today and log anything you eat. Protein goal: ${m.proteinTargetG} g.`;
}

export const NOTIF_PREVIEWS = {
  morning: "You're 8% of the way to 9.9%. Keep carbs under 25 g today and log anything you eat. Protein goal: 160 g.",
  protein: 'Protein check: aim for about 100 g by 3 PM. Open KetoMeter to see where you are.',
  milestones: "You're in fat burn. From here, most of every calorie you burn comes off fat.",
  weighIn: 'Morning weigh-in keeps your numbers accurate. It takes 10 seconds.',
};

export async function reschedule(s: AppState, m: EngineState | null) {
  if (Platform.OS === 'web') return;
  const perm = await Notifications.getPermissionsAsync();
  if (perm.status !== 'granted') return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  const q = s.notif;
  const plan: { when: Date; title: string; body: string }[] = [];

  for (const day of [0, 1, 2]) {
    if (q.weighIn) plan.push({ when: at(day, 7, 0), title: 'Weigh-in', body: NOTIF_PREVIEWS.weighIn });
    if (q.morning && m && s.goalBodyFatPct) plan.push({ when: at(day, 7, 30), title: "Today's plan", body: morningText(m, s.goalBodyFatPct) });
    if (q.protein && m) {
      plan.push({ when: at(day, 12, 0), title: 'Protein check', body: `Aim for about ${Math.round(m.proteinTargetG * 0.4)} g of protein by noon. Open KetoMeter to see where you are.` });
      plan.push({ when: at(day, 15, 0), title: 'Protein check', body: `Aim for about ${Math.round(m.proteinTargetG * 0.65)} g by 3 PM. You've got this.` });
    }
  }
  if (q.milestones && m && m.stage === 1 && m.hoursToFatBurn != null) {
    let when = new Date(Date.now() + m.hoursToFatBurn * 3_600_000);
    if (inQuiet(when.getHours(), q)) { when = new Date(when); if (when.getHours() >= q.quietStart) when.setDate(when.getDate() + 1); when.setHours(q.quietEnd, 0, 0, 0); }
    plan.push({ when, title: "You're in fat burn", body: `Your liver tank should be empty. From here, most of every calorie comes off fat. ${fmt(m.fatToGoalKcal ?? 0)} kcal to your goal.` });
  }

  const now = Date.now();
  for (const p of plan) {
    if (+p.when <= now || inQuiet(p.when.getHours(), q)) continue;
    await Notifications.scheduleNotificationAsync({
      content: { title: p.title, body: p.body },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: p.when },
    });
  }
}

export async function notifyNow(title: string, body: string) {
  if (Platform.OS === 'web') return;
  await Notifications.scheduleNotificationAsync({ content: { title, body }, trigger: null });
}
