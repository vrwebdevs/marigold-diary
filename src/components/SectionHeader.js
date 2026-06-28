import { Pressable, Text, View } from 'react-native';
import { colors, textStyles, fontFamilies } from '../theme';

/** Uppercase micro label with optional action on the right. */
export default function SectionHeader({ label, actionLabel, onAction, actionHandwritten, style }) {
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 14,
        },
        style,
      ]}
    >
      <Text style={[textStyles.label, { color: colors.mutedLabel }]}>{label}</Text>
      {actionLabel ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text
            style={{
              fontFamily: actionHandwritten ? fontFamilies.hand : fontFamilies.sans,
              fontSize: actionHandwritten ? 17 : 13,
              color: colors.clayText,
            }}
          >
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
