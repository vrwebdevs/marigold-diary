import { Pressable, ScrollView, Text, View } from 'react-native';
import { colors, fontFamilies, spacing, moodList, moodColor } from '../theme';

/** Mood dots from the dynamic mood list. value is a mood key or null. */
export default function MoodSelector({ value, onChange, style }) {
  return (
    <View style={[{ height: 56 }, style]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexDirection: 'row', gap: 4, alignItems: 'center', paddingHorizontal: spacing.screenX }}
      >
        {moodList.map((mood) => {
          const selected = value === mood.key;
          const c = moodColor(mood.key);
          return (
            <Pressable
              key={mood.key}
              onPress={() => onChange(selected ? null : mood.key)}
              hitSlop={6}
              style={{ alignItems: 'center', width: 64 }}
            >
              <View
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 999,
                  backgroundColor: c,
                  opacity: selected ? 1 : 0.45,
                  borderWidth: selected ? 3 : 0,
                  borderColor: colors.paper,
                  ...(selected
                    ? {
                        shadowColor: c,
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: 0.5,
                        shadowRadius: 6,
                        elevation: 3,
                      }
                    : null),
                }}
              />
              <Text
                numberOfLines={1}
                style={{
                  fontFamily: fontFamilies.sans,
                  fontSize: 13,
                  marginTop: 6,
                  maxWidth: 64,
                  color: selected ? c : colors.softInk,
                }}
              >
                {mood.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
