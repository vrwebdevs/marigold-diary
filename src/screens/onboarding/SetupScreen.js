import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors, textStyles, spacing, radii, fontFamilies } from '../../theme';
import PinPad from '../../components/PinPad';
import ScreenLoader from '../../components/ScreenLoader';
import { showAlert } from '../../components/ThemedDialog';
import { signIn } from '../../services/googleAuth';
import { getBackupInfo } from '../../services/driveSync';
import { setPin } from '../../services/pinAuth';
import { setSessionPin, armBackupKey } from '../../services/crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSettingsStore, useSyncStore, useAuthStore } from '../../stores';
import { haptics } from '../../utils/haptics';

/** First-run setup: Google sign-in (required) → restore branch OR mandatory PIN. */
export default function SetupScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const updateSetting = useSettingsStore((s) => s.updateSetting);
  const setAccount = useSyncStore((s) => s.setAccount);

  const [phase, setPhase] = useState(route.params?.startPhase || 'account'); // 'account' | 'pin'
  const [busy, setBusy] = useState(false);
  const [pinStage, setPinStage] = useState('create'); // 'create' | 'confirm'
  const [firstPin, setFirstPin] = useState('');
  const [pinError, setPinError] = useState('');

  const finish = async () => {
    await AsyncStorage.setItem('marigold.onboarded', '1');
    useSettingsStore.setState({ onboarded: true }); // App swaps OnboardingNavigator → RootNavigator
  };

  const connectGoogle = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const a = await signIn();
      if (!a) { setBusy(false); return; } // cancelled by user
      setAccount(a);
      const first = (a.name || '').trim().split(/\s+/)[0];
      if (first) await updateSetting('diaryName', first);
      haptics.success();
      let info = null;
      try {
        info = await getBackupInfo();
      } catch (e) {
        setBusy(false);
        showAlert("Couldn't check for a backup", `${e?.message || 'Check your connection'} — please try again.`);
        return;
      }
      setBusy(false);
      if (info) navigation.replace('Restore');
      else setPhase('pin');
    } catch (err) {
      setBusy(false);
      showAlert('Sign-in needed', err?.message || 'Google sign-in is required to use Marigold. Please try again.');
    }
  };

  const onPin = async (pin) => {
    setPinError('');
    if (pinStage === 'create') {
      setFirstPin(pin);
      setPinStage('confirm');
      return;
    }
    if (pin === firstPin) {
      setBusy(true);
      await setPin(pin);
      setSessionPin(pin);
      await armBackupKey(pin); // persist the wrapped key so the first backup is recoverable
      useAuthStore.setState({ pinEnabled: true });
      haptics.success();
      finish();
    } else {
      setPinError("they didn't match — start over");
      setPinStage('create');
      setFirstPin('');
    }
  };

  if (phase === 'pin' && busy) return <ScreenLoader />;

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
      {phase === 'account' ? (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Text style={{ fontFamily: fontFamilies.handBold, fontSize: 40, color: colors.clayText }}>let’s set up</Text>
          <Text style={[textStyles.body, { color: colors.midInk, marginTop: 14 }]}>
            Marigold backs up privately to your Google Drive — a hidden folder only Marigold can see.
            Sign in to continue: it’s how your encrypted diary stays safe and follows you to a new phone.
          </Text>
          <Pressable
            onPress={connectGoogle}
            disabled={busy}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: colors.clay, borderRadius: radii.pill, paddingVertical: 14, marginTop: 30 }}
          >
            <Feather name="log-in" size={18} color={colors.cream} />
            <Text style={[textStyles.labelBold, { color: colors.cream }]}>
              {busy ? 'connecting…' : 'Continue with Google'}
            </Text>
          </Pressable>
          <Text style={[textStyles.caption, { color: colors.softInk, marginTop: 16, textAlign: 'center' }]}>
            Required to use Marigold.
          </Text>
        </View>
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: fontFamilies.handBold, fontSize: 36, color: colors.clayText, textAlign: 'center', alignSelf: 'stretch' }}>
            {pinStage === 'create' ? 'set your PIN' : 'confirm your PIN'}
          </Text>
          <Text style={[textStyles.body, { color: colors.midInk, marginTop: 10, marginBottom: 6, textAlign: 'center' }]}>
            This 4-digit PIN encrypts your diary.
          </Text>
          <Text style={[textStyles.caption, { color: colors.clayText, marginBottom: 20, textAlign: 'center', lineHeight: 18 }]}>
            It’s also the only key that can restore your backup on a new phone — we can’t reset it, so keep it safe.
          </Text>
          <PinPad onComplete={onPin} error={pinError} />
        </View>
      )}
    </View>
  );
}
