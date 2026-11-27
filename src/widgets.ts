// Shares a snapshot with the WidgetKit extension through the App Group, then reloads widgets.
import { Platform } from 'react-native';
import type { EngineState } from './engine/simulate.ts';

const GROUP = 'group.com.grindhouseapps.ketometer';

export function pushWidgetSnapshot(m: EngineState | null, goalPct: number | null) {
  if (Platform.OS !== 'ios' || !m) return;
  try {
    const { ExtensionStorage } = require('@bacons/apple-targets');
    const store = new ExtensionStorage(GROUP);
    const snap = {
      stage: m.stage,
      value: Math.round(m.stage === 1 ? m.kcalToFatBurn : m.fatToGoalKcal ?? 0),
      remaining: m.stage === 1 ? m.liverKcal / m.liverCapKcal : m.fatGoalStartKcal ? (m.fatToGoalKcal ?? 0) / m.fatGoalStartKcal : 0,
      hoursToFatBurn: m.hoursToFatBurn,
      goalPct,
      proteinG: Math.round(m.today.proteinG),
      proteinTargetG: m.proteinTargetG,
      netCarbsG: Math.round(m.today.netCarbsG),
      netCarbBudgetG: m.netCarbBudgetG,
      updatedAt: Date.now() / 1000,
    };
    store.set('snapshot', JSON.stringify(snap));
    ExtensionStorage.reloadWidget();
  } catch {}
}
