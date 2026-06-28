import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { colors, textStyles, spacing, radii, fontFamilies } from '../theme';

const DISCLOSURES = {
  aggregates: {
    title: 'Share mood & tags only',
    shared: [
      'your mood mix — how many entries carry each mood',
      'your tag names, and how often each one is used',
    ],
    never: [
      'the text or title of ANY entry',
      'locked entries — not even that they exist',
      'your PIN, API keys, or app settings',
      'anything at all, while AI features are off',
    ],
  },
  selective: {
    title: 'Share entries you mark',
    shared: [
      'your mood mix and tag usage',
      'the full text, title, date and mood of entries where YOU ticked "can share this entry with AI" (✦)',
    ],
    never: [
      'entries without the ✦ mark',
      'locked entries — even if they carry the ✦ mark',
      'your PIN, API keys, or app settings',
      'anything at all, while AI features are off',
    ],
  },
  all: {
    title: 'Share everything',
    shared: [
      'your mood mix and tag usage',
      'the full text, title, date and mood of ALL your unlocked entries',
    ],
    never: [
      'locked entries — the lock always wins',
      'your PIN, API keys, or app settings',
      'anything at all, while AI features are off',
    ],
  },
};

function BulletList({ items, color }) {
  return items.map((item, i) => (
    <View key={i} style={{ flexDirection: 'row', marginTop: 6 }}>
      <Text style={{ color, fontSize: 14, lineHeight: 21, marginRight: 8 }}>•</Text>
      <Text style={[{ flex: 1 }, { fontFamily: 'Newsreader_400Regular', fontSize: 15, lineHeight: 21, color: colors.midInk }]}>
        {item}
      </Text>
    </View>
  ));
}

/**
 * Explicit, repeated consent — shown EVERY time a sharing toggle is switched on.
 * OK stays disabled until "I accept" is checked. Cancel/dismiss changes nothing.
 */
export default function ConsentModal({ mode, visible, onAccept, onCancel }) {
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (visible) setAccepted(false);
  }, [visible]);

  const disclosure = mode ? DISCLOSURES[mode] : null;
  if (!disclosure) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
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
            <Text style={[textStyles.title, { color: colors.ink }]}>{disclosure.title}</Text>

            <Text style={[textStyles.label, { color: colors.clayText, marginTop: 18 }]}>
              will be shared with your gemini account
            </Text>
            <BulletList items={disclosure.shared} color={colors.clay} />

            <Text style={[textStyles.label, { color: colors.sage, marginTop: 18 }]}>
              will never be shared
            </Text>
            <BulletList items={disclosure.never} color={colors.sage} />

            <Pressable
              onPress={() => setAccepted(!accepted)}
              hitSlop={6}
              style={{ flexDirection: 'row', alignItems: 'center', marginTop: 22 }}
            >
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 6,
                  borderWidth: 1.5,
                  borderColor: accepted ? colors.clay : 'rgba(59,48,38,0.35)',
                  backgroundColor: accepted ? colors.clay : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 10,
                }}
              >
                {accepted ? (
                  <Text style={{ color: colors.cream, fontSize: 13, lineHeight: 15 }}>✓</Text>
                ) : null}
              </View>
              <Text style={{ fontFamily: fontFamilies.sans, fontSize: 15, color: colors.ink }}>
                I understand and accept
              </Text>
            </Pressable>

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: 22,
                marginTop: 20,
              }}
            >
              <Pressable onPress={onCancel} hitSlop={10}>
                <Text style={{ fontFamily: fontFamilies.sans, fontSize: 14, color: colors.softInk }}>
                  cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={onAccept}
                disabled={!accepted}
                hitSlop={8}
                style={{
                  backgroundColor: accepted ? colors.clay : colors.hairline,
                  borderRadius: radii.pill,
                  paddingHorizontal: 24,
                  paddingVertical: 9,
                }}
              >
                <Text style={[textStyles.labelBold, { color: accepted ? colors.cream : colors.softInk }]}>
                  ok
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
