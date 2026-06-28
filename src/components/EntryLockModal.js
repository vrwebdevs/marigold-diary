import { useEffect, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { colors, textStyles, spacing, radii, fontFamilies } from '../theme';
import PinPad from './PinPad';
import { useAuthStore } from '../stores';
import { verifyPin, canUseBiometrics, biometricUnlock } from '../services/pinAuth';

/** Bottom sheet asking for the app PIN (or biometrics) to open a locked entry. */
export default function EntryLockModal({ visible, onClose, onUnlocked }) {
  const biometricsEnabled = useAuthStore((s) => s.biometricsEnabled);
  const [error, setError] = useState('');
  const [bioAvailable, setBioAvailable] = useState(false);

  useEffect(() => {
    if (visible) {
      setError('');
      canUseBiometrics().then(setBioAvailable);
    }
  }, [visible]);

  const tryBiometrics = async () => {
    if (await biometricUnlock()) onUnlocked();
  };

  const onComplete = async (pin) => {
    if (await verifyPin(pin)) {
      onUnlocked();
    } else {
      setError('wrong PIN — try again');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(59,48,38,0.45)',
          justifyContent: 'flex-end',
        }}
      >
        <View
          style={{
            backgroundColor: colors.backdrop,
            borderTopLeftRadius: radii.cardLarge,
            borderTopRightRadius: radii.cardLarge,
            padding: spacing.screenX,
            paddingBottom: 40,
            alignItems: 'center',
          }}
        >
          <Text style={[textStyles.label, { color: colors.mutedLabel, marginVertical: 14 }]}>
            unlock this entry
          </Text>
          <PinPad onComplete={onComplete} error={error} />
          {bioAvailable && biometricsEnabled ? (
            <Pressable onPress={tryBiometrics} hitSlop={10} style={{ marginTop: 14 }}>
              <Text style={{ fontFamily: fontFamilies.sans, fontSize: 15, color: colors.clayText }}>
                use fingerprint →
              </Text>
            </Pressable>
          ) : null}
          <Pressable onPress={onClose} hitSlop={10} style={{ marginTop: 12 }}>
            <Text style={{ fontFamily: fontFamilies.sans, fontSize: 14, color: colors.softInk }}>
              cancel
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
