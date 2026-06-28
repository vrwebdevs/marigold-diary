import { useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, textStyles, spacing, radii, shadows, fontFamilies, moodColor } from '../../theme';
import SearchBar from '../../components/SearchBar';
import MarigoldLoader from '../../components/MarigoldLoader';
import EmptyState from '../../components/EmptyState';
import { useEntries } from '../../hooks/useEntries';
import { moodByKey } from '../../utils/constants';
import { stripHtml } from '../../utils/textUtils';
import { fromDateKey } from '../../utils/dateUtils';

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Text with case-insensitive query matches emphasized in clay. */
function Highlight({ text, query, style, numberOfLines }) {
  const parts = text.split(new RegExp(`(${escapeRegex(query)})`, 'ig'));
  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <Text key={i} style={{ color: colors.clayText, fontFamily: fontFamilies.serifMedium }}>
            {part}
          </Text>
        ) : (
          part
        )
      )}
    </Text>
  );
}

function makeSnippet(content, query) {
  const text = stripHtml(content);
  const at = text.toLowerCase().indexOf(query.toLowerCase());
  if (at < 0) return text.slice(0, 120);
  const start = Math.max(0, at - 50);
  return (start > 0 ? '…' : '') + text.slice(start, at + query.length + 70) + '…';
}

export default function SearchScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const trimmed = query.trim();
  const active = trimmed.length >= 2;
  const { data: results, isFetching } = useEntries(active ? { search: trimmed, limit: 50 } : { limit: 0 });

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.backdrop,
        paddingTop: insets.top + 12,
        paddingHorizontal: spacing.screenX,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Text style={{ fontFamily: fontFamilies.sans, fontSize: 15, color: colors.clayText }}>←</Text>
        </Pressable>
        <SearchBar value={query} onChangeText={setQuery} autoFocus style={{ flex: 1 }} />
      </View>

      {!active ? (
        <EmptyState
          icon="search"
          title="Search your diary"
          subtitle="Type at least two letters to find an entry."
          style={{ marginTop: 24 }}
        />
      ) : isFetching && !(results && results.length) ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <MarigoldLoader size={48} />
        </View>
      ) : (
        <FlatList
          data={results || []}
          keyExtractor={(item) => item.id}
          style={{ marginTop: 16 }}
          contentContainerStyle={{ paddingBottom: 60 }}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const d = fromDateKey(item.dateKey);
            const now = new Date();
            const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
            const day = d.getDate();
            const sameMonth = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
            const monthLabel = d.toLocaleDateString('en-US', { month: 'short' });
            const mood = moodByKey(item.mood);
            return (
              <Pressable
                onPress={() => navigation.navigate('EntryDetail', { entryId: item.id })}
                style={{
                  flexDirection: 'row',
                  backgroundColor: colors.paper,
                  borderRadius: radii.cardLarge,
                  borderWidth: 1,
                  borderColor: colors.cardBorder,
                  padding: spacing.cardPadding,
                  marginBottom: spacing.gap,
                  ...shadows.card,
                }}
              >
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
                <View style={{ flex: 1 }}>
                  {item.title ? (
                    <Highlight
                      text={item.title}
                      query={trimmed}
                      numberOfLines={1}
                      style={[textStyles.title, { fontSize: 19, lineHeight: 25, color: colors.ink }]}
                    />
                  ) : null}
                  {item.isLocked ? (
                    <Text style={{ fontFamily: fontFamilies.sans, fontSize: 14, color: colors.softInk, marginTop: 4 }}>
                      this entry is locked
                    </Text>
                  ) : (
                    <Highlight
                      text={makeSnippet(item.content, trimmed)}
                      query={trimmed}
                      numberOfLines={2}
                      style={[textStyles.body, { fontSize: 15, lineHeight: 23, color: colors.midInk, marginTop: 4 }]}
                    />
                  )}
                  {mood ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: moodColor(item.mood), marginRight: 5 }} />
                      <Text style={{ fontFamily: fontFamilies.sans, fontSize: 13, color: moodColor(item.mood) }}>
                        {mood.label}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <EmptyState
              icon="search"
              title="Nothing found"
              subtitle={`No entries match "${trimmed}".`}
              style={{ marginTop: 24 }}
            />
          }
        />
      )}
    </View>
  );
}
