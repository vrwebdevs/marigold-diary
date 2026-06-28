import { Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, fontFamilies } from '../theme';

/** Warm empty state: a soft icon circle, serif title, optional sans subtitle. */
export default function EmptyState({ icon = 'feather', title, subtitle, style }) {
  return (
    <View style={[{ alignItems: 'center', justifyContent: 'center', paddingVertical: 44, paddingHorizontal: 28 }, style]}>
      <View
        style={{
          width: 60,
          height: 60,
          borderRadius: 999,
          backgroundColor: colors.clayTint,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
        }}
      >
        <Feather name={icon} size={26} color={colors.clayText} />
      </View>
      <Text style={{ fontFamily: fontFamilies.serifMedium, fontSize: 18, color: colors.ink, textAlign: 'center' }}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={{ fontFamily: fontFamilies.sans, fontSize: 14, color: colors.softInk, textAlign: 'center', marginTop: 6, lineHeight: 20 }}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}
