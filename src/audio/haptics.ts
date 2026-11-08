import * as Haptics from 'expo-haptics';

import { storage } from '../storage/storage';

let enabled = storage.getSettings().haptics;
let lastAt = 0;

export const haptics = {
  setEnabled(v: boolean) {
    enabled = v;
  },
  /** Merge feedback scaled by fruit level; throttled so chains don't buzz constantly. */
  merge(level: number) {
    const now = Date.now();
    if (!enabled || now - lastAt < 60) return;
    lastAt = now;
    const style = level >= 8 ? Haptics.ImpactFeedbackStyle.Heavy : level >= 4 ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light;
    Haptics.impactAsync(style).catch(() => {});
  },
  tap() {
    if (enabled) Haptics.selectionAsync().catch(() => {});
  },
  gameOver() {
    if (enabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
  },
  success() {
    if (enabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  },
};
