import { Pressable, Text } from 'react-native';
import { colors, radii, fontFamilies } from '../theme';

/** Pill chip. selected → clay tint; default → paper with hairline border. */
export default function TagChip({ label, count, selected = false, onPress, style }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={4}
      style={[
        {
          borderRadius: radii.pill,
          paddingHorizontal: 14,
          paddingVertical: 7,
          backgroundColor: selected ? colors.clayTint : colors.paper,
          borderWidth: 1,
          borderColor: selected ? 'rgba(178,106,71,0.25)' : colors.hairline,
        },
        style,
      ]}
    >
      <Text
        style={{
          fontFamily: fontFamilies.sans,
          fontSize: 12,
          color: selected ? colors.clayText : colors.midInk,
        }}
      >
        {label}
        {count !== undefined ? `  ${count}` : ''}
      </Text>
    </Pressable>
  );
}
