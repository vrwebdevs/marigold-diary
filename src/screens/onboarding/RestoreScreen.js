import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import {
  colors, textStyles, spacing, radii, fontFamilies, applyTheme, applyFontScale, applyMoods,
} from '../../theme';
import PinPad from '../../components/PinPad';
import ScreenLoader from '../../components/ScreenLoader';
import { showAlert } from '../../components/ThemedDialog';
import { useAuthStore, useSettingsStore, useSyncStore } from '../../stores';
import { setPin } from '../../services/pinAuth';
import { setSessionPin, armBackupKey } from '../../services/crypto';
import { restoreFromBackup, removeBackup } from '../../services/driveSync';
import { setActiveVault } from '../../db/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { listMoods } from '../../db/queries/moods';
import { haptics } from '../../utils/haptics';

/** Shown when a backup exists for the signed-in Google account: restore with PIN, or start fresh. */
export default function RestoreScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const account = useSyncStore((s) => s.account);
  const email = account?.email || 'your account';

  const [mode, setMode] = useState('choose'); // 'choose' | 'pin'
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const finalize = async () => {
    setActiveVault('main');
    await useSettingsStore.getState().hydrate();
    applyMoods(await listMoods());
    const { theme, fontScale } = useSettingsStore.getState();
    applyTheme(theme);
    applyFontScale(fontScale);
    queryClient.clear();
    await AsyncStorage.setItem('marigold.onboarded', '1');
    useSettingsStore.setState({ onboarded: true });
    useAuthStore.getState().setVault('main');
    useAuthStore.getState().unlock();
    // App swaps OnboardingNavigator → RootNavigator once onboarded is true
  };

  const onPin = async (pin) => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const r = await restoreFromBackup(pin);
      if (r === 'ok') {
        await setPin(pin);
        setSessionPin(pin);
        await armBackupKey(pin); // re-arm with the restored key so this device's backups stay recoverable
        useAuthStore.setState({ pinEnabled: true });
        haptics.success();
        await finalize();
        return;
      }
      if (r === 'mismatch') {
        setError("that PIN doesn't match this backup — nothing was changed");
        haptics.error();
      } else {
        showAlert('No backup', "Couldn't find a backup to restore.");
        navigation.replace('Setup', { startPhase: 'pin' });
      }
    } catch (e) {
      showAlert('Restore failed', e?.message || 'Please try again.');
    }
    setBusy(false);
  };

  const confirmRemove = () => {
    showAlert(
      'Remove backup & start fresh?',
      `This permanently erases the Marigold cloud backup for ${email}. Entries on another phone ` +
        `are not affected, but they can no longer be restored here.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove & start fresh',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeBackup();
              navigation.replace('Setup', { startPhase: 'pin' });
            } catch (e) {
              showAlert("Couldn't remove backup", e?.message || 'Please try again.');
            }
          },
        },
      ]
    );
  };

  if (busy) return <ScreenLoader />;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.backdrop,
        paddingTop: insets.top + 24,
        paddingBottom: insets.bottom + 24,
        paddingHorizontal: spacing.screenX,
      }}
    >
      {mode === 'choose' ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 999,
              backgroundColor: colors.clayTint,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 22,
            }}
          >
            <Feather name="shield" size={32} color={colors.clayText} />
          </View>
          <Text style={{ fontFamily: fontFamilies.serifMedium, fontSize: 26, color: colors.ink, textAlign: 'center' }}>
            Welcome back
          </Text>
          <Text style={[textStyles.body, { color: colors.midInk, marginTop: 12, textAlign: 'center' }]}>
            A Marigold backup was found for
          </Text>
          <Text style={{ fontFamily: fontFamilies.sansBold, fontSize: 15, color: colors.clayText, marginTop: 4 }}>
            {email}
          </Text>

          <Pressable
            onPress={() => setMode('pin')}
            style={{ alignSelf: 'stretch', backgroundColor: colors.clay, borderRadius: radii.pill, paddingVertical: 15, marginTop: 34, alignItems: 'center' }}
          >
            <Text style={[textStyles.labelBold, { color: colors.cream }]}>Restore my diary</Text>
          </Pressable>
          <Pressable onPress={confirmRemove} hitSlop={8} style={{ marginTop: 18 }}>
            <Text style={{ fontFamily: fontFamilies.sans, fontSize: 14, color: colors.moods.frayed }}>
              Remove backup & start fresh
            </Text>
          </Pressable>

          <Text style={[textStyles.caption, { color: colors.softInk, marginTop: 26, textAlign: 'center', lineHeight: 18 }]}>
            Your diary is end-to-end encrypted. The PIN from your previous phone is the only key —
            we can’t reset it for you.
          </Text>
        </View>
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Pressable onPress={() => { setMode('choose'); setError(''); }} hitSlop={10} style={{ position: 'absolute', top: 0, left: 0 }}>
            <Text style={{ fontFamily: fontFamilies.sans, fontSize: 15, color: colors.clayText }}>← back</Text>
          </Pressable>
          <Text style={{ fontFamily: fontFamilies.handBold, fontSize: 34, color: colors.clayText, textAlign: 'center', alignSelf: 'stretch' }}>
            enter your previous PIN
          </Text>
          <Text style={[textStyles.body, { color: colors.midInk, marginTop: 10, marginBottom: 22, textAlign: 'center' }]}>
            the 4-digit PIN from your old phone — it unlocks your backup
          </Text>
          <PinPad onComplete={onPin} error={error} />
        </View>
      )}
    </View>
  );
}
