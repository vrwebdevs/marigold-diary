import { Pressable, Text } from 'react-native';
import { colors, radii, shadows } from '../theme';

/** Clay squircle floating action button. Defaults to bottom-right placement. */
export default function FAB({ onPress, label = '+', style }) {
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: 'rgba(251,246,236,0.35)', borderless: false }}
      style={[
        {
          position: 'absolute',
          right: 22,
          bottom: 28,
          width: 58,
          height: 58,
          borderRadius: radii.fab,
          backgroundColor: colors.clay,
          alignItems: 'center',
          justifyContent: 'center',
          ...shadows.clay,
        },
        style,
      ]}
    >
      <Text
        style={{
          color: colors.cream,
          fontSize: 30,
          lineHeight: 34,
          marginTop: -2,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
