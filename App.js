import './global.css';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, PanResponder, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  Newsreader_400Regular,
  Newsreader_500Medium,
} from '@expo-google-fonts/newsreader';
import { Caveat_500Medium, Caveat_600SemiBold } from '@expo-google-fonts/caveat';
import {
  HankenGrotesk_600SemiBold,
  HankenGrotesk_700Bold,
} from '@expo-google-fonts/hanken-grotesk';
import RootNavigator from './src/navigation/RootNavigator';
import OnboardingNavigator from './src/navigation/OnboardingNavigator';
import ThemedDialog from './src/components/ThemedDialog';
import MarigoldSplash from './src/components/MarigoldSplash';
import MarigoldLoader from './src/components/MarigoldLoader';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDatabase, setActiveVault } from './src/db/client';
import { useSettingsStore, useAuthStore, useSyncStore } from './src/stores';
import { configureGoogle, restoreSession, googleAuthRecently } from './src/services/googleAuth';
import { autoLockSuppressed } from './src/utils/autoLockGuard';
import { syncNow } from './src/services/driveSync';
import { clearSessionPin, clearKeyCache } from './src/services/crypto';
import { colors, applyTheme, applyFontScale, applyMoods } from './src/theme';
import { getSetting } from './src/db/queries/settings';
import { getEntryDateKeys, ensureEntriesEncrypted } from './src/db/queries/entries';
import { listMoods } from './src/db/queries/moods';
import { toDateKey } from './src/utils/dateUtils';
import { computeCurrentStreak } from './src/utils/streakUtils';
import { isPinSet } from './src/services/pinAuth';
import {
  ensureNotificationPermissions,
  scheduleDailyReminder,
  scheduleOnThisDayReminder,
  syncStreakAlert,
} from './src/services/notifications';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 0, // local SQLite — a failure won't fix itself by retrying
    },
  },
});

let autoSyncing = false;
/** Sync if signed in and the auto-sync setting is on. Safe to call freely. */
async function runAutoSync() {
  if (autoSyncing) return;
  const account = useSyncStore.getState().account;
  if (!account) return;
  if (!(await getSetting('autoSync', false))) return;
  autoSyncing = true;
  try {
    const r = await syncNow();
    useSyncStore.getState().setLastSyncedAt(r.modifiedTime);
    useSyncStore.getState().setDirty(false);
    queryClient.invalidateQueries();
  } catch (err) {
    console.warn('[autosync] skipped:', err?.message);
  } finally {
    autoSyncing = false;
  }
}

let autoLocking = false;
let backgroundedAt = null;
const FOREGROUND_LOCK_MS = 5 * 60 * 1000;
let lastActivityAt = Date.now();
/** Lock + reset to the main (cover) vault when leaving the app, if enabled. */
async function runAutoLock() {
  if (autoLocking) return;
  if (!useAuthStore.getState().isUnlocked) return;
  if (googleAuthRecently() || autoLockSuppressed()) return; // returning from a native dialog (Google / permission / share), not a real "left the app"
  if (!(await isPinSet())) return;
  const { vault } = useAuthStore.getState();
  const forced = vault === 'secret'; // the private vault always auto-locks
  if (!forced && !(await getSetting('autoLock', true))) return;
  autoLocking = true;
  try {
    setActiveVault('main');
    await useSettingsStore.getState().hydrate();
    const { theme, fontScale } = useSettingsStore.getState();
    applyTheme(theme);
    applyFontScale(fontScale);
    queryClient.clear();
    clearSessionPin();
    clearKeyCache();
    useAuthStore.getState().setVault('main');
    useAuthStore.getState().lock();
  } finally {
    autoLocking = false;
  }
}

export default function App() {
  const hydrated = useSettingsStore((s) => s.hydrated);
  const themeName = useSettingsStore((s) => s.theme);
  const onboarded = useSettingsStore((s) => s.onboarded);
  const [fontsLoaded] = useFonts({
    Newsreader_400Regular,
    Newsreader_500Medium,
    Caveat_500Medium,
    Caveat_600SemiBold,
    HankenGrotesk_600SemiBold,
    HankenGrotesk_700Bold,
  });
  const [showSplash, setShowSplash] = useState(true);
  const [splashFirst, setSplashFirst] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const seen = await AsyncStorage.getItem('marigoldSplashSeen');
        setSplashFirst(!seen);
        if (!seen) AsyncStorage.setItem('marigoldSplashSeen', '1');
      } catch {
        setSplashFirst(false);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await getDatabase();
        const onboarded = (await AsyncStorage.getItem('marigold.onboarded')) === '1';
        useSettingsStore.setState({ onboarded });
        const pinSet = await isPinSet();
        const biometricsEnabled = await getSetting('biometricsEnabled', false);
        useAuthStore.setState({
          pinEnabled: pinSet,
          biometricsEnabled,
          isUnlocked: !pinSet,
        });
        await useSettingsStore.getState().hydrate();
        const { theme, fontScale } = useSettingsStore.getState();
        applyTheme(theme);
        applyFontScale(fontScale);
        applyMoods(await listMoods());
        ensureEntriesEncrypted().catch((err) => console.warn('[enc] migration skipped:', err?.message));
        try {
          configureGoogle();
          const account = await restoreSession();
          if (account) useSyncStore.getState().setAccount(account);
        } catch (err) {
          console.warn('[startup] google restore skipped:', err?.message);
        }
        runAutoSync(); // auto-sync on cold open
        try {
          const { reminderEnabled, reminderTime } = useSettingsStore.getState();
          const onThisDayEnabled = await getSetting('onThisDayReminder', false);
          if (reminderEnabled || onThisDayEnabled) {
            const ok = await ensureNotificationPermissions();
            if (ok) {
              if (reminderEnabled) await scheduleDailyReminder(reminderTime);
              if (onThisDayEnabled) await scheduleOnThisDayReminder();
              if (reminderEnabled) {
                const rows = await getEntryDateKeys();
                const keys = rows.map((r) => r.dateKey);
                await syncStreakAlert(computeCurrentStreak(keys), keys.includes(toDateKey()));
              }
            }
          }
        } catch (err) {
          console.warn('[startup] notification sync skipped:', err?.message);
        }
      } catch (err) {
        console.error('[startup] DB init failed:', err);
      }
    })();
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') {
        backgroundedAt = Date.now();
        runAutoSync();
        runAutoLock(); // lock the moment the app is backgrounded / phone screen locks
      } else if (state === 'active') {
        lastActivityAt = Date.now();
        backgroundedAt = null;
        runAutoSync();
      }
    });
    return () => sub.remove();
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponderCapture: () => { lastActivityAt = Date.now(); return false; },
      onMoveShouldSetPanResponderCapture: () => false,
    })
  ).current;

  useEffect(() => {
    const interval = setInterval(async () => {
      if (!useAuthStore.getState().isUnlocked) return;
      if (autoLockSuppressed() || googleAuthRecently()) return;
      if (Date.now() - lastActivityAt < FOREGROUND_LOCK_MS) return;
      await runAutoLock();
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  const ready = fontsLoaded && hydrated;

  const onLayoutRootView = useCallback(() => {
    if (ready) {
      SplashScreen.hideAsync();
    }
  }, [ready]);

  if (!ready) {
    return (
      <View
        style={{ flex: 1, backgroundColor: colors.backdrop, alignItems: 'center', justifyContent: 'center' }}
        onLayout={() => SplashScreen.hideAsync()}
      >
        <MarigoldLoader size={64} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <View
            {...panResponder.panHandlers}
            style={{ flex: 1, backgroundColor: colors.backdrop }}
            onLayout={onLayoutRootView}
          >
            {onboarded ? <RootNavigator /> : <OnboardingNavigator />}
            <StatusBar style={themeName === 'dark' ? 'light' : 'dark'} />
            <ThemedDialog />
            {showSplash && splashFirst !== null ? (
              <MarigoldSplash firstLaunch={splashFirst} onDone={() => setShowSplash(false)} />
            ) : null}
          </View>
        </SafeAreaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
