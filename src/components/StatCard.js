import { Text, View } from 'react-native';
import { colors, textStyles, radii, shadows, fontFamilies } from '../theme';

/** Small stat tile: big serif numeral over a muted label (streak, totals…). */
export default function StatCard({ value, caption, style }) {
  return (
    <View
      style={[
        {
          flex: 1,
          aspectRatio: 1,
          backgroundColor: colors.paper,
          borderRadius: radii.card,
          alignItems: 'center',
          justifyContent: 'center',
          ...shadows.card,
        },
        style,
      ]}
    >
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={{ fontFamily: fontFamilies.serifMedium, fontSize: 22, color: colors.ink }}
      >
        {value}
      </Text>
      <Text style={[textStyles.label, { color: colors.mutedLabel, marginTop: 4, textAlign: 'center' }]}>
        {caption}
      </Text>
    </View>
  );
}
