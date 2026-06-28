import { Linking, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { colors, textStyles, spacing, radii, fontFamilies } from '../theme';

const STEPS = [
  'Tap the button below — it opens Google AI Studio in your browser.',
  'Sign in with your Google account (the same one you use for Gmail works).',
  'Tap "Get API key" in the menu.',
  'Tap "Create API key" and copy the key it shows you.',
  'Come back here, paste the key in the field, and tap connect.',
];

/** Step-by-step guide for getting a free Gemini API key. */
export default function AIKeyHelpModal({ visible, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(59,48,38,0.5)',
          justifyContent: 'center',
          padding: spacing.screenX,
        }}
      >
        <View
          style={{
            backgroundColor: colors.backdrop,
            borderRadius: radii.cardLarge,
            padding: spacing.cardPadding + 4,
            maxHeight: '85%',
          }}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={[textStyles.title, { color: colors.ink }]}>
              Get your free Gemini key
            </Text>
            <Text style={{ fontFamily: fontFamilies.sans, fontSize: 13, color: colors.softInk, marginTop: 4 }}>
              takes about two minutes · free · no card needed
            </Text>

            {STEPS.map((step, i) => (
              <View key={i} style={{ flexDirection: 'row', marginTop: 14 }}>
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 999,
                    backgroundColor: colors.clayTint,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 10,
                  }}
                >
                  <Text style={{ fontFamily: fontFamilies.sansBold, fontSize: 12, color: colors.clayText }}>
                    {i + 1}
                  </Text>
                </View>
                <Text
                  style={[
                    textStyles.body,
                    { flex: 1, fontSize: 15, lineHeight: 22, color: colors.midInk },
                  ]}
                >
                  {step}
                </Text>
              </View>
            ))}

            <Pressable
              onPress={() => Linking.openURL('https://aistudio.google.com/apikey')}
              style={{
                backgroundColor: colors.clay,
                borderRadius: radii.pill,
                paddingVertical: 12,
                alignItems: 'center',
                marginTop: 22,
              }}
            >
              <Text style={[textStyles.labelBold, { color: colors.cream }]}>
                open google ai studio →
              </Text>
            </Pressable>

            <Text style={[textStyles.caption, { color: colors.mutedLabel, marginTop: 14 }]}>
              your key is stored only in this phone's secure storage — never in your diary,
              never on any server
            </Text>

            <Pressable onPress={onClose} hitSlop={10} style={{ alignSelf: 'center', marginTop: 16 }}>
              <Text style={{ fontFamily: fontFamilies.sans, fontSize: 14, color: colors.softInk }}>
                close
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
