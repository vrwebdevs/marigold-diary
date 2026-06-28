import { useEffect, useState } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { showAlert } from '../../components/ThemedDialog';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, textStyles, spacing, radii, fontFamilies } from '../../theme';
import PinPad from '../../components/PinPad';
import { useAuthStore, useSyncStore } from '../../stores';
import { setSetting } from '../../db/queries/settings';
import { setPin, clearPin, verifyPin, canUseBiometrics } from '../../services/pinAuth';
import { syncNow } from '../../services/driveSync';
import { setSessionPin, clearSessionPin, armBackupKey } from '../../services/crypto';

const TITLES = {
  verify: 'enter your current pin',
  create: 'choose a 4-digit pin',
  confirm: 'enter it once more',
};

export default function PINSetupScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const pinEnabled = useAuthStore((s) => s.pinEnabled);
  const biometricsEnabled = useAuthStore((s) => s.biometricsEnabled);

  const [mode, setMode] = useState(null); // null = menu | 'create' | 'change' | 'remove'
  const [stage, setStage] = useState('create'); // 'verify' | 'create' | 'confirm'
  const [firstPin, setFirstPin] = useState('');
  const [error, setError] = useState('');
  const [bioAvailable, setBioAvailable] = useState(false);

  useEffect(() => {
    canUseBiometrics().then(setBioAvailable);
  }, []);

  useEffect(() => {
    if (!pinEnabled && mode === null) {
      setMode('create');
      setStage('create');
    }
  }, [pinEnabled, mode]);

  const start = (nextMode) => {
    setError('');
    setFirstPin('');
    setMode(nextMode);
    setStage(nextMode === 'create' ? 'create' : 'verify');
  };

  const toggleBiometrics = async (value) => {
    useAuthStore.setState({ biometricsEnabled: value });
    await setSetting('biometricsEnabled', value);
  };

  const onComplete = async (pin) => {
    setError('');
    if (stage === 'verify') {
      if (!(await verifyPin(pin))) {
        setError("that's not it — try again");
        return;
      }
      if (mode === 'remove') {
        await clearPin();
        clearSessionPin();
        await setSetting('biometricsEnabled', false);
        useAuthStore.setState({ pinEnabled: false, biometricsEnabled: false });
        showAlert('PIN removed', 'Your diary opens without a lock now.');
        setMode(null);
      } else {
        setStage('create');
      }
      return;
    }
    if (stage === 'create') {
      setFirstPin(pin);
      setStage('confirm');
      return;
    }
    // confirm
    if (pin === firstPin) {
      await setPin(pin);
      setSessionPin(pin);
      await armBackupKey(pin); // persist the wrapped key so the backup is recoverable with the new PIN
      useAuthStore.setState({ pinEnabled: true });
      if (useSyncStore.getState().account) syncNow().catch(() => {});
      showAlert('PIN set', 'Your diary will ask for it on launch.');
      setMode(null);
      setFirstPin('');
    } else {
      setError("they didn't match — start over");
      setStage('create');
      setFirstPin('');
    }
  };

  const showMenu = pinEnabled && mode === null;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.backdrop,
        paddingTop: insets.top + 12,
        paddingHorizontal: spacing.screenX,
      }}
    >
      <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
        <Text style={{ fontFamily: fontFamilies.sans, fontSize: 15, color: colors.clayText }}>
          ← back
        </Text>
      </Pressable>
      <Text style={[textStyles.heading, { color: colors.ink, marginTop: 14 }]}>Privacy</Text>

      {showMenu ? (
        <View style={{ marginTop: spacing.sectionGap, gap: spacing.gap }}>
          <Pressable
            onPress={() => start('change')}
            style={{
              backgroundColor: colors.paper,
              borderRadius: radii.card,
              padding: spacing.cardPadding,
              borderWidth: 1,
              borderColor: colors.hairline,
            }}
          >
            <Text style={{ fontFamily: fontFamilies.sans, fontSize: 15, color: colors.clayText }}>
              change PIN →
            </Text>
          </Pressable>
          <Pressable
            onPress={() => start('remove')}
            style={{
              backgroundColor: colors.paper,
              borderRadius: radii.card,
              padding: spacing.cardPadding,
              borderWidth: 1,
              borderColor: colors.hairline,
            }}
          >
            <Text style={{ fontFamily: fontFamilies.sans, fontSize: 15, color: colors.moods.frayed }}>
              remove PIN →
            </Text>
          </Pressable>
          {bioAvailable ? (
            <View
              style={{
                backgroundColor: colors.paper,
                borderRadius: radii.card,
                padding: spacing.cardPadding,
                borderWidth: 1,
                borderColor: colors.hairline,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontFamily: fontFamilies.sans, fontSize: 15, color: colors.ink, flex: 1 }}>
                unlock with fingerprint
              </Text>
              <Switch
                value={biometricsEnabled}
                onValueChange={toggleBiometrics}
                trackColor={{ false: colors.hairline, true: colors.clay }}
                thumbColor={colors.cream}
              />
            </View>
          ) : null}
          <View
            style={{
              backgroundColor: colors.clayTint,
              borderRadius: radii.card,
              padding: spacing.cardPadding,
              borderWidth: 1,
              borderColor: colors.hairline,
              marginTop: spacing.gap,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Feather name="alert-triangle" size={16} color={colors.clayText} style={{ marginRight: 8 }} />
              <Text style={{ fontFamily: fontFamilies.sansBold, fontSize: 14, color: colors.clayText }}>
                Remember your PIN
              </Text>
            </View>
            <Text style={{ fontFamily: fontFamilies.sans, fontSize: 13, lineHeight: 20, color: colors.midInk }}>
              Your diary is end-to-end encrypted, and your PIN is the only key. It’s the same key that restores
              your backup on a new phone.{'\n\n'}
              If you forget it, your entries cannot be recovered — not by Marigold, not by VR Web Devs, not by anyone.
              We never see your PIN or your data, so we have no way to reset it. Please keep it somewhere safe.
            </Text>
          </View>
        </View>
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 80 }}>
          <Text style={[textStyles.label, { color: colors.mutedLabel, marginBottom: 18 }]}>
            {TITLES[stage]}
          </Text>
          <PinPad onComplete={onComplete} error={error} />
          {pinEnabled ? (
            <Pressable onPress={() => setMode(null)} hitSlop={10} style={{ marginTop: 18 }}>
              <Text style={{ fontFamily: fontFamilies.sans, fontSize: 14, color: colors.softInk }}>
                cancel
              </Text>
            </Pressable>
          ) : null}
        </View>
      )}
    </View>
  );
}
