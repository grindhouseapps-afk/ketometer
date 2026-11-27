import * as Notifications from 'expo-notifications';
import { computeMeter } from './useMeter';
import { useStore } from './store';
import { n0 } from './format';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function requestNotifications(): Promise<boolean> {
  const cur = await Notifications.getPermissionsAsync();
  const granted = cur.granted || (await Notifications.requestPermissionsAsync()).granted;
  useStore.getState().set({ notificationsOn: granted });
  if (granted) await rescheduleAll();
  return granted;
}

const ID = { morning: 'km-morning', protein: 'km-protein', fatBurn: 'km-fatburn' };

/** Morning plan, afternoon protein check and the fat-burn heads-up. Safe to call often. */
export async function rescheduleAll() {
  const s = useStore.getState();
  await Promise.all(Object.values(ID).map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => {})));
  if (!s.notificationsOn) return;
  const m = computeMeter();
  if (!m) return;

  const goal = s.profile.goalBodyFatPct;
  const fatLeft = m.fatToGoalKcal != null ? `${n0(m.fatToGoalKcal)} kcal of fat to ${goal}%. ` : '';
  await Notifications.scheduleNotificationAsync({
    identifier: ID.morning,
    content: {
      title: 'Your plan for today',
      body: `${fatLeft}Keep net carbs under ${m.netCarbBudgetG} g. Protein goal: ${m.proteinTargetG} g.`,
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: 8, minute: 0 },
  });
  await Notifications.scheduleNotificationAsync({
    identifier: ID.protein,
    content: { title: 'Protein check', body: `Aim for ${m.proteinTargetG} g today. Log what you've had so far.` },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: 14, minute: 30 },
  });
  if (m.stage === 1 && m.hoursToFatBurn != null && m.hoursToFatBurn > 0.25) {
    await Notifications.scheduleNotificationAsync({
      identifier: ID.fatBurn,
      content: { title: "You're in fat burn", body: 'Your liver tank is empty. From here, KetoMeter counts every calorie of fat.' },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(Date.now() + m.hoursToFatBurn * 3_600_000) },
    });
  }
}
