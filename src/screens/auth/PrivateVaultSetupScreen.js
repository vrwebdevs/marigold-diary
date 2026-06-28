import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, textStyles, spacing, fontFamilies } from '../../theme';
import PinPad from '../../components/PinPad';
import { showAlert } from '../../components/ThemedDialog';
import { setSecretPin } from '../../services/pinAuth';

/** Hidden: choose a private-vault PIN (entered twice). Creating it makes the vault. */
export default function PrivateVaultSetupScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [first, setFirst] = useState(null);
  const [error, setError] = useState('');

  const stage = first ? 'confirm' : 'enter';

  const onComplete = async (pin) => {
    if (stage === 'enter') {
      setFirst(pin);
      setError('');
      return;
    }
    if (pin !== first) {
      setFirst(null);
      setError("PINs didn't match — start again");
      return;
    }
    try {
      await setSecretPin(pin);
      showAlert(
        'Private space ready',
        'Open it anytime by entering this PIN on the lock screen.',
        [{ text: 'Done', onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      setFirst(null);
      setError(err?.message || 'Could not set the PIN');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.backdrop, paddingTop: insets.top + 12, paddingHorizontal: spacing.screenX }}>
      <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
        <Text style={{ fontFamily: fontFamilies.sans, fontSize: 15, color: colors.clayText }}>← back</Text>
      </Pressable>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 80 }}>
        <Text style={[textStyles.label, { color: colors.mutedLabel, marginBottom: 18 }]}>
          {stage === 'enter' ? 'choose a private PIN' : 'confirm private PIN'}
        </Text>
        <PinPad onComplete={onComplete} error={error} />
      </View>
    </View>
  );
}
