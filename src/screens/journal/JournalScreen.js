import { FlatList, ScrollView, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, textStyles, spacing, fontFamilies } from '../../theme';
import EntryCard from '../../components/EntryCard';
import FAB from '../../components/FAB';
import SearchBar from '../../components/SearchBar';
import SectionHeader from '../../components/SectionHeader';
import FilterDropdown from '../../components/FilterDropdown';
import EmptyState from '../../components/EmptyState';
import { useEntries } from '../../hooks/useEntries';
import ScreenLoader from '../../components/ScreenLoader';
import { useEntryTags, useTags } from '../../hooks/useTags';
import { useEntryStore } from '../../stores';
import { MOODS } from '../../utils/constants';

/** Card wrapper that fetches its own tag chips (cached per entry by React Query). */
function JournalCard({ entry, onPress }) {
  const { data: tags } = useEntryTags(entry.id);
  return <EntryCard entry={entry} tags={tags || []} onPress={onPress} />;
}

export default function JournalScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const filters = useEntryStore((s) => s.filters);
  const setFilters = useEntryStore((s) => s.setFilters);
  const { data: entries, isLoading } = useEntries(filters);
  const { data: allTags } = useTags();

  const count = entries?.length ?? 0;

  if (isLoading) return <ScreenLoader />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.backdrop, paddingTop: insets.top + 16 }}>
      <Text style={[textStyles.heading, { color: colors.ink, paddingHorizontal: spacing.screenX }]}>
        Journal
      </Text>

      <SearchBar
        value={filters.search}
        onChangeText={(search) => setFilters({ search })}
        style={{ marginHorizontal: spacing.screenX, marginTop: 12 }}
      />

      {/* filters — dropdowns (taps, not scrolls → no tab-swipe conflict) */}
      <View style={{ flexDirection: 'row', gap: spacing.gap, paddingHorizontal: spacing.screenX, marginTop: 12 }}>
        <FilterDropdown
          placeholder="All moods"
          value={filters.starredOnly ? 'starred' : filters.mood || 'all'}
          options={[
            { value: 'all', label: 'All moods' },
            { value: 'starred', label: '★ Starred' },
            ...MOODS.map((m) => ({ value: m.key, label: m.label })),
          ]}
          onSelect={(v) => {
            if (v === 'all') setFilters({ mood: null, starredOnly: false });
            else if (v === 'starred') setFilters({ mood: null, starredOnly: true });
            else setFilters({ mood: v, starredOnly: false });
          }}
        />
        <FilterDropdown
          placeholder="All tags"
          value={filters.tagId || 'all'}
          options={[
            { value: 'all', label: 'All tags' },
            ...(allTags || []).map((t) => ({ value: t.id, label: `#${t.name}` })),
          ]}
          onSelect={(v) => setFilters({ tagId: v === 'all' ? null : v })}
        />
      </View>

      <SectionHeader
        label={`${count} ${count === 1 ? 'entry' : 'entries'}`}
        actionLabel={filters.sort === 'newest' ? 'newest first' : 'oldest first'}
        onAction={() => setFilters({ sort: filters.sort === 'newest' ? 'oldest' : 'newest' })}
        style={{ paddingHorizontal: spacing.screenX, marginTop: 18 }}
      />

      <FlatList
        data={entries || []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: spacing.screenX, paddingBottom: 120 }}
        renderItem={({ item }) => (
          <JournalCard
            entry={item}
            onPress={() => navigation.navigate('EntryDetail', { entryId: item.id })}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="book-open"
            title="Your journal is empty"
            subtitle="Tap the + button to write your first entry."
            style={{ marginTop: 40 }}
          />
        }
      />

      <FAB onPress={() => navigation.navigate('Write')} />
    </View>
  );
}
