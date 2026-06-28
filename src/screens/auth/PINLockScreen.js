import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { colors, textStyles, fontFamilies, applyTheme, applyFontScale, applyMoods } from '../../theme';
import PinPad from '../../components/PinPad';
import ScreenLoader from '../../components/ScreenLoader';
import { useAuthStore, useSettingsStore, useSyncStore } from '../../stores';
import { resolvePin, canUseBiometrics, biometricUnlock, cancelBiometrics } from '../../services/pinAuth';
import { setSessionPin, getSessionPin, armBackupKey } from '../../services/crypto';
import { restoreIfFreshDevice } from '../../services/driveSync';
import { setActiveVault } from '../../db/client';
import { ensureEntriesEncrypted } from '../../db/queries/entries';
import { listMoods } from '../../db/queries/moods';
import { DEFAULTS } from '../../utils/constants';

export default function PINLockScreen() {
  const unlock = useAuthStore((s) => s.unlock);
  const setVault = useAuthStore((s) => s.setVault);
  const biometricsEnabled = useAuthStore((s) => s.biometricsEnabled);
  const diaryName = useSettingsStore((s) => s.diaryName);
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const [bioAvailable, setBioAvailable] = useState(false);
  const [busy, setBusy] = useState(false);

  const enterVault = async (vault) => {
    setBusy(true);
    setActiveVault(vault);
    if (vault === 'secret') {
      try { await restoreIfFreshDevice(getSessionPin()); } catch {}
    }
    await armBackupKey(getSessionPin()); // keep this vault's backup key recoverable
    await useSettingsStore.getState().hydrate();
    // if signed in and this vault's name is still the default, adopt the Google first name
    const account = useSyncStore.getState().account;
    const settings = useSettingsStore.getState();
    if (account?.name && (!settings.diaryName?.trim() || settings.diaryName === DEFAULTS.diaryName)) {
      const first = account.name.trim().split(/\s+/)[0];
      if (first) await settings.updateSetting('diaryName', first);
    }
    ensureEntriesEncrypted().catch((err) => console.warn('[enc] migration skipped:', err?.message));
    applyMoods(await listMoods());
    const { theme, fontScale } = useSettingsStore.getState();
    applyTheme(theme);
    applyFontScale(fontScale);
    queryClient.clear();
    setVault(vault);
    unlock();
  };

  const authingRef = useRef(false);
  const aliveRef = useRef(true);

  const tryBiometrics = async () => {
    if (authingRef.current || !aliveRef.current) return; // in flight, or screen already gone
    authingRef.current = true;
    try {
      const ok = await biometricUnlock();
      // ignore the result if the lock screen is gone or we already unlocked (e.g. via PIN)
      if (ok && aliveRef.current && !useAuthStore.getState().isUnlocked) {
        await enterVault('main'); // biometric → normal vault only
      }
    } finally {
      authingRef.current = false;
    }
  };

  useEffect(() => {
    let timer;
    (async () => {
      const available = await canUseBiometrics();
      setBioAvailable(available);
      if (available && biometricsEnabled && aliveRef.current) {
        // delay so a freshly-resumed activity is ready to show the system prompt
        timer = setTimeout(tryBiometrics, 400);
      }
    })();
    return () => {
      aliveRef.current = false;
      if (timer) clearTimeout(timer);
      cancelBiometrics(); // dismiss any pending prompt when leaving the lock screen
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onComplete = async (pin) => {
    const vault = await resolvePin(pin);
    if (vault) {
      setError('');
      setSessionPin(pin); // held in memory to wrap/unwrap the backup key
      await cancelBiometrics(); // kill any in-flight fingerprint prompt before switching
      await enterVault(vault);
    } else {
      setError('wrong PIN — try again');
    }
  };

  if (busy) return <ScreenLoader />;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.backdrop,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontFamily: fontFamilies.hand, fontSize: 26, color: colors.clayText }}>
        Welcome Back,
      </Text>
      <Text style={{ fontFamily: fontFamilies.handBold, fontSize: 40, color: colors.ink, marginTop: 2 }}>{diaryName}</Text>
      <Text style={[textStyles.label, { color: colors.mutedLabel, marginTop: 14, marginBottom: 18 }]}>
        enter your pin
      </Text>
      <PinPad onComplete={onComplete} error={error} />
      {bioAvailable && biometricsEnabled ? (
        <Pressable onPress={tryBiometrics} hitSlop={10} style={{ marginTop: 20 }}>
          <Text style={{ fontFamily: fontFamilies.hand, fontSize: 20, color: colors.clayText }}>
            Use Fingerprint →
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
