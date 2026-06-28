import { Pressable, ScrollView, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, textStyles, spacing, fontFamilies } from '../theme';

/** Placeholder screen used until each real screen lands in its phase. */
export default function ScreenStub({ title, phase, links = [] }) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.backdrop,
        paddingHorizontal: spacing.screenX,
        paddingTop: insets.top + 24,
      }}
    >
      <Text style={[textStyles.label, { color: colors.mutedLabel }]}>
        coming in {phase}
      </Text>
      <Text style={[textStyles.heading, { color: colors.ink, marginTop: 8 }]}>
        {title}
      </Text>
      {navigation.canGoBack() && (
        <Pressable onPress={() => navigation.goBack()} hitSlop={8} style={{ marginTop: 12 }}>
          <Text style={{ fontFamily: fontFamilies.sans, fontSize: 15, color: colors.clayText }}>
            ← go back
          </Text>
        </Pressable>
      )}
      {links.length > 0 && (
        <ScrollView style={{ marginTop: spacing.sectionGap }}>
          {links.map((link) => (
            <Pressable
              key={link.screen}
              onPress={() => navigation.navigate(link.screen)}
              style={{
                backgroundColor: colors.paper,
                borderRadius: 14,
                paddingVertical: 12,
                paddingHorizontal: spacing.cardPadding,
                marginBottom: spacing.gap,
                borderWidth: 1,
                borderColor: colors.hairline,
              }}
            >
              <Text style={[textStyles.body, { color: colors.midInk, lineHeight: 24 }]}>
                {link.label} →
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
