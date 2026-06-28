import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { suppressAutoLock } from '../utils/autoLockGuard';

/** Show reminders even while the app is foregrounded. */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const IDS = {
  daily: 'daily-reminder',
  onThisDay: 'on-this-day-reminder',
  streak: 'streak-alert',
};

export async function ensureNotificationPermissions() {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('reminders', {
        name: 'Reminders',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    suppressAutoLock(); // the notification permission dialog backgrounds the app — don't auto-lock on return
    const requested = await Notifications.requestPermissionsAsync();
    return requested.granted;
  } catch {
    return false;
  }
}

/** Daily writing nudge at the user's chosen time ('HH:mm'). Replaces any previous one. */
export async function scheduleDailyReminder(timeHHmm) {
  const [hour, minute] = timeHHmm.split(':').map(Number);
  await Notifications.cancelScheduledNotificationAsync(IDS.daily).catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier: IDS.daily,
    content: { title: 'Marigold', body: 'a few quiet minutes for your diary?' },
    trigger: { channelId: 'reminders', hour, minute, repeats: true },
  });
}

export async function cancelDailyReminder() {
  await Notifications.cancelScheduledNotificationAsync(IDS.daily).catch(() => {});
}

/** Morning look-back at 9:00. */
export async function scheduleOnThisDayReminder() {
  await Notifications.cancelScheduledNotificationAsync(IDS.onThisDay).catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier: IDS.onThisDay,
    content: { title: 'Marigold', body: 'memories might be waiting in On This Day' },
    trigger: { channelId: 'reminders', hour: 9, minute: 0, repeats: true },
  });
}

export async function cancelOnThisDayReminder() {
  await Notifications.cancelScheduledNotificationAsync(IDS.onThisDay).catch(() => {});
}

/**
 * One-shot 20:30 nudge when a live streak would die today.
 * Re-synced on every app start: cancelled if today is already written.
 */
export async function syncStreakAlert(streak, hasWrittenToday) {
  await Notifications.cancelScheduledNotificationAsync(IDS.streak).catch(() => {});
  if (!streak || hasWrittenToday) return;
  const target = new Date();
  target.setHours(20, 30, 0, 0);
  if (target <= new Date()) return;
  await Notifications.scheduleNotificationAsync({
    identifier: IDS.streak,
    content: {
      title: 'Marigold',
      body: `your ${streak}-day streak is waiting for today's entry`,
    },
    trigger: { channelId: 'reminders', date: target },
  });
}
