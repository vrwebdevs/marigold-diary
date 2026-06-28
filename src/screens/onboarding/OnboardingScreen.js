import { useRef, useState } from 'react';
import { FlatList, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, textStyles, spacing, radii, fontFamilies } from '../../theme';
import { MOODS } from '../../utils/constants';
import { setSetting } from '../../db/queries/settings';
import { useSettingsStore } from '../../stores';

const SLIDES = [
  {
    key: 'write',
    title: 'write it down',
    body: 'Entries with moods, tags and the weather of the moment. A book view to leaf through your days, a calendar to see them gather.',
  },
  {
    key: 'private',
    title: 'it stays yours',
    body: 'Everything lives on your phone. Lock the app with a PIN, lock single entries — and nothing is ever shared with AI unless you explicitly say so, entry by entry.',
  },
  {
    key: 'help',
    title: 'let it help you',
    body: 'A fresh writing prompt every day. Connect your own free Gemini key for weekly reflections, monthly summaries, and asking your diary questions.',
  },
];

export default function OnboardingScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const listRef = useRef(null);
  const [index, setIndex] = useState(0);
  const last = index === SLIDES.length - 1;

  const finish = () => {
    navigation.replace('Setup');
  };

  const next = () => {
    if (last) {
      finish();
    } else {
      listRef.current?.scrollToIndex({ index: index + 1, animated: true });
    }
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.backdrop,
        paddingTop: insets.top + 16,
        paddingBottom: insets.bottom + 24,
      }}
    >
      <Pressable onPress={finish} hitSlop={10} style={{ alignSelf: 'flex-end', paddingHorizontal: spacing.screenX }}>
        <Text style={{ fontFamily: fontFamilies.sans, fontSize: 14, color: colors.softInk }}>
          skip
        </Text>
      </Pressable>

      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(item) => item.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item, index: i }) => (
          <View style={{ width, paddingHorizontal: spacing.screenX + 8, justifyContent: 'center' }}>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 24 }}>
              {MOODS.slice(0, i + 2).map((mood) => (
                <View
                  key={mood.key}
                  style={{ width: 12, height: 12, borderRadius: 999, backgroundColor: mood.color }}
                />
              ))}
            </View>
            <Text style={{ fontFamily: fontFamilies.handBold, fontSize: 40, color: colors.clayText }}>
              {item.title}
            </Text>
            <Text style={[textStyles.body, { color: colors.midInk, marginTop: 14 }]}>
              {item.body}
            </Text>
          </View>
        )}
      />

      <View style={{ alignItems: 'center', gap: 18 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {SLIDES.map((slide, i) => (
            <View
              key={slide.key}
              style={{
                width: i === index ? 22 : 8,
                height: 8,
                borderRadius: 999,
                backgroundColor: i === index ? colors.clay : colors.hairline,
              }}
            />
          ))}
        </View>
        <Pressable
          onPress={next}
          style={{
            backgroundColor: colors.clay,
            borderRadius: radii.pill,
            paddingHorizontal: 34,
            paddingVertical: 13,
          }}
        >
          <Text style={[textStyles.labelBold, { color: colors.cream }]}>
            {last ? 'get started' : 'next'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
