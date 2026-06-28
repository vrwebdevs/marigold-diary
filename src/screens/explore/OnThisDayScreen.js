import { Pressable, ScrollView, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, textStyles, spacing, radii, shadows, fontFamilies } from '../../theme';
import EntryCardWithTags from '../../components/EntryCardWithTags';
import EmptyState from '../../components/EmptyState';
import SectionHeader from '../../components/SectionHeader';
import { useEntries, useOnThisDay } from '../../hooks/useEntries';
import ScreenLoader from '../../components/ScreenLoader';
import { toDateKey } from '../../utils/dateUtils';

export default function OnThisDayScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const todayKey = toDateKey();
  const monthDay = todayKey.slice(5);
  const { data: matches, isLoading } = useOnThisDay(monthDay, todayKey);
  const { data: all } = useEntries({ limit: 500 });

  const dayLabel = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

  const openRandom = () => {
    if (!all || all.length === 0) return;
    const entry = all[Math.floor(Math.random() * all.length)];
    navigation.navigate('EntryDetail', { entryId: entry.id });
  };

  if (isLoading) return <ScreenLoader />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.backdrop, paddingTop: insets.top + 12 }}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: spacing.screenX, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Text style={{ fontFamily: fontFamilies.sans, fontSize: 15, color: colors.clayText }}>
            ← back
          </Text>
        </Pressable>

        <Text style={[textStyles.heading, { color: colors.ink, marginTop: 14 }]}>On This Day</Text>
        <Text style={[textStyles.label, { color: colors.mutedLabel, marginTop: 4 }]}>{dayLabel}</Text>

        {(matches || []).length === 0 ? (
          <EmptyState
            icon="clock"
            title="No memories yet"
            subtitle="Entries from past years on this date will gather here as your diary grows."
            style={{ marginTop: 24 }}
          />
        ) : (
          (matches || []).map((entry) => (
            <View key={entry.id} style={{ marginTop: spacing.gapLarge }}>
              <SectionHeader label={entry.dateKey.slice(0, 4)} />
              <EntryCardWithTags
                entry={entry}
                onPress={() => navigation.navigate('EntryDetail', { entryId: entry.id })}
              />
            </View>
          ))
        )}

        <Pressable
          onPress={openRandom}
          style={{
            backgroundColor: colors.paper,
            borderRadius: radii.cardLarge,
            padding: spacing.cardPadding,
            marginTop: spacing.sectionGap,
            alignItems: 'center',
            ...shadows.card,
          }}
        >
          <Text style={{ fontFamily: fontFamilies.sansBold, fontSize: 15, color: colors.clayText }}>
            feeling lucky? read a random entry →
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
