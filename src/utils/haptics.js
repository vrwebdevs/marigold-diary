import * as Haptics from 'expo-haptics';

/** Run a haptic, swallowing errors — no-op if the native module isn't in the build yet. */
const safe = (fn) => () => {
  try {
    const r = fn();
    if (r && typeof r.catch === 'function') r.catch(() => {});
  } catch {}
};

export const haptics = {
  light: safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  medium: safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  selection: safe(() => Haptics.selectionAsync()),
  success: safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  error: safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};
