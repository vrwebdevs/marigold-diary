import { Pressable, Text, View } from 'react-native';
import { colors, textStyles, spacing, radii, shadows, fontFamilies, moodColor } from '../theme';
import { moodByKey } from '../utils/constants';
import { makeExcerpt } from '../utils/textUtils';
import { fromDateKey } from '../utils/dateUtils';
import { formatWeatherStamp } from '../services/weather';

/**
 * The Marigold entry card: a hovering paper card with a left date rail.
 * entry: row from the entries table. tags: optional array of tag rows.
 */
export default function EntryCard({ entry, tags = [], onPress, style }) {
  const mood = moodByKey(entry.mood);
  const d = fromDateKey(entry.dateKey);
  const now = new Date();
  const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
  const day = d.getDate();
  const sameMonth = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  const monthLabel = d.toLocaleDateString('en-US', { month: 'short' });
  const weather = formatWeatherStamp(entry.weatherTemp, entry.weatherCode);

  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: colors.clayTint }}
      style={[
        {
          flexDirection: 'row',
          backgroundColor: colors.paper,
          borderRadius: radii.cardLarge,
          borderWidth: 1,
          borderColor: colors.cardBorder,
          padding: spacing.cardPadding,
          marginBottom: spacing.gap,
          ...shadows.card,
        },
        style,
      ]}
    >
      {/* date rail */}
      <View style={{ width: 44, alignItems: 'center', marginRight: 14 }}>
        <Text style={{ fontFamily: fontFamilies.sans, fontSize: 12, color: colors.mutedLabel, marginBottom: 1 }}>
          {weekday}
        </Text>
        <Text style={{ fontFamily: fontFamilies.serifMedium, fontSize: 26, lineHeight: 30, color: colors.ink }}>
          {day}
        </Text>
        {!sameMonth ? (
          <Text style={{ fontFamily: fontFamilies.sans, fontSize: 11, color: colors.softInk, marginTop: 1 }}>
            {monthLabel}
          </Text>
        ) : null}
      </View>

      {/* content */}
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text
            numberOfLines={1}
            style={[textStyles.title, { flex: 1, fontSize: 19, lineHeight: 25, color: colors.ink }]}
          >
            {entry.title || 'Untitled'}
          </Text>
          {entry.isStarred ? (
            <Text style={{ color: colors.clayText, fontSize: 14, marginLeft: 8 }}>★</Text>
          ) : null}
          {entry.aiConsent ? (
            <Text style={{ color: colors.sage, fontSize: 13, marginLeft: 8 }}>✦</Text>
          ) : null}
        </View>

        <Text
          numberOfLines={2}
          style={[textStyles.body, { fontSize: 15, lineHeight: 23, color: colors.midInk, marginTop: 4 }]}
        >
          {entry.isLocked ? 'This entry is locked.' : makeExcerpt(entry.content)}
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 12 }}>
          {mood ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12 }}>
              <View style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: moodColor(entry.mood), marginRight: 5 }} />
              <Text style={{ fontFamily: fontFamilies.sans, fontSize: 13, color: moodColor(entry.mood) }}>
                {mood.label}
              </Text>
            </View>
          ) : null}
          {tags.slice(0, 3).map((tag) => (
            <Text
              key={tag.id}
              style={{ fontFamily: fontFamilies.sans, fontSize: 13, color: colors.softInk, marginRight: 10 }}
            >
              #{tag.name}
            </Text>
          ))}
          {weather ? (
            <Text style={{ fontFamily: fontFamilies.sans, fontSize: 13, color: colors.softInk }}>
              {weather}
            </Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}
