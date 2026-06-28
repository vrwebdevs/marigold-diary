import { Pressable, Text, View } from 'react-native';
import { colors, textStyles, spacing, radii, shadows, fontFamilies } from '../theme';
import { useWritingPrompt } from '../hooks/useWritingPrompt';
import { STATIC_PROMPTS } from '../utils/staticPrompts';

function dayOfYear(date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date - start) / 86400000);
}

export default function HeroPromptCard({ onWrite, style }) {
  const { data } = useWritingPrompt();
  const isAI = !!data?.text;
  const prompt = data?.text || STATIC_PROMPTS[dayOfYear() % STATIC_PROMPTS.length];

  return (
    <View
      style={[
        {
          backgroundColor: colors.paper,
          borderRadius: radii.cardLarge,
          padding: spacing.cardPadding + 2,
          ...shadows.card,
        },
        style,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={[textStyles.label, { color: colors.mutedLabel, flex: 1 }]}>
          today's prompt
        </Text>
        {isAI ? (
          <Text style={{ fontFamily: fontFamilies.hand, fontSize: 14, color: colors.sage }}>
            ✦ gemini
          </Text>
        ) : null}
      </View>
      <Text
        style={{
          fontFamily: fontFamilies.handBold,
          fontSize: 21,
          lineHeight: 29,
          color: colors.ink,
          marginTop: 10,
        }}
      >
        {prompt}
      </Text>
      <Pressable onPress={onWrite} hitSlop={8} style={{ marginTop: 12, alignSelf: 'flex-start' }}>
        <Text style={{ fontFamily: fontFamilies.hand, fontSize: 17, color: colors.clayText }}>
          write about this →
        </Text>
      </Pressable>
    </View>
  );
}
