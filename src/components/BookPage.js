import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, textStyles, spacing, radii, shadows, fontFamilies, moodColor } from '../theme';
import { moodByKey } from '../utils/constants';
import { stripHtml } from '../utils/textUtils';
import { formatFullDate, fromDateKey } from '../utils/dateUtils';
import { pageGradient } from '../utils/pageTheme';

/** One page of the diary book. Tap the header to open the full entry. */
export default function BookPage({ entry, pageNumber, pageCount, onOpen }) {
  const mood = moodByKey(entry.mood);
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.paper,
        borderRadius: radii.cardLarge,
        marginHorizontal: spacing.screenX,
        marginBottom: 16,
        ...shadows.card,
      }}
    >
      <LinearGradient
        colors={pageGradient(entry)}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFill, { borderRadius: radii.cardLarge }]}
      />
      <Pressable onPress={onOpen} style={{ padding: spacing.cardPadding + 4, paddingBottom: 0 }}>
        <Text style={[textStyles.label, { color: colors.mutedLabel }]}>
          {formatFullDate(fromDateKey(entry.dateKey))}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 6 }}>
          <Text style={[textStyles.title, { color: colors.ink, flex: 1 }]} numberOfLines={2}>
            {entry.title || 'Untitled'}
          </Text>
          {mood ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 8 }}>
              <View style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: moodColor(entry.mood), marginRight: 5 }} />
              <Text style={{ fontFamily: fontFamilies.sans, fontSize: 13, color: moodColor(entry.mood) }}>
                {mood.label}
              </Text>
            </View>
          ) : null}
        </View>
        <View style={{ height: 1, backgroundColor: colors.hairline, marginTop: 12 }} />
      </Pressable>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing.cardPadding + 4, paddingTop: 14 }}
        showsVerticalScrollIndicator={false}
      >
        <Text
          style={
            entry.isLocked
              ? { fontFamily: fontFamilies.sans, fontSize: 15, color: colors.softInk }
              : [textStyles.body, { color: colors.midInk }]
          }
        >
          {entry.isLocked ? 'this entry is locked — open it to unlock' : stripHtml(entry.content)}
        </Text>
      </ScrollView>
      <Text style={[textStyles.caption, { color: colors.softInk, textAlign: 'center', paddingVertical: 10 }]}>
        {pageNumber} of {pageCount}
      </Text>
    </View>
  );
}
