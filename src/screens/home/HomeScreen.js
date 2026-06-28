import { Pressable, ScrollView, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, textStyles, spacing, radii, shadows, fontFamilies } from '../../theme';
import EntryCardWithTags from '../../components/EntryCardWithTags';
import FAB from '../../components/FAB';
import HeroPromptCard from '../../components/HeroPromptCard';
import MiniHeatmap from '../../components/MiniHeatmap';
import SectionHeader from '../../components/SectionHeader';
import { useEntries, useEntryDateKeys } from '../../hooks/useEntries';
import ScreenLoader from '../../components/ScreenLoader';
import { useSettingsStore } from '../../stores';
import { greetingForHour, toDateKey } from '../../utils/dateUtils';
import { computeCurrentStreak, computeLongestStreak } from '../../utils/streakUtils';

export default function HomeScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const diaryName = useSettingsStore((s) => s.diaryName);
  const { data: recent, isLoading: loadingRecent } = useEntries({ limit: 3 });
  const { data: dateRows, isLoading: loadingDates } = useEntryDateKeys();

  const dateKeys = (dateRows || []).map((row) => row.dateKey);
  const countsByDay = Object.fromEntries((dateRows || []).map((row) => [row.dateKey, row.count]));
  const streak = computeCurrentStreak(dateKeys);
  const bestStreak = computeLongestStreak(dateKeys);
  const today = new Date();
  const since = new Date(today);
  since.setDate(since.getDate() - 55);
  const sinceKey = toDateKey(since);
  const daysWritten = dateKeys.filter((k) => k >= sinceKey).length;

  if (loadingRecent || loadingDates) return <ScreenLoader />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.backdrop }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.screenX,
          paddingTop: insets.top + 20,
          paddingBottom: 120,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* greeting + streak pill */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          <Text style={{ fontFamily: fontFamilies.hand, fontSize: 24, color: colors.clayText, flex: 1, paddingRight: 12 }}>
            {greetingForHour()}, {diaryName}
          </Text>
          {streak > 0 ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: colors.clayTint,
                borderRadius: radii.pill,
                paddingHorizontal: 12,
                paddingVertical: 6,
                marginTop: 4,
              }}
            >
              <View style={{ width: 7, height: 7, borderRadius: 999, backgroundColor: colors.clay, marginRight: 6 }} />
              <Text style={{ fontFamily: fontFamilies.sansBold, fontSize: 12, color: colors.clayText }}>
                {streak}-day streak
              </Text>
            </View>
          ) : null}
        </View>

        {/* today's date as hero */}
        <Text style={[textStyles.label, { color: colors.mutedLabel, marginTop: 14 }]}>
          {today.toLocaleDateString('en-US', { weekday: 'long' })}
        </Text>
        <Text style={[textStyles.display, { color: colors.ink, marginTop: 2 }]}>
          {today.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
        </Text>

        <HeroPromptCard
          style={{ marginTop: spacing.sectionGap }}
          onWrite={() => navigation.navigate('Write')}
        />

        <SectionHeader
          label="last 8 weeks"
          actionLabel="calendar →"
          actionHandwritten
          onAction={() => navigation.navigate('Calendar')}
          style={{ marginTop: spacing.sectionGap }}
        />
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: colors.paper,
            borderRadius: radii.cardLarge,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            padding: spacing.cardPadding + 4,
            ...shadows.card,
          }}
        >
          <MiniHeatmap countsByDay={countsByDay} onPress={() => navigation.navigate('Calendar')} />
          <View style={{ paddingRight: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
              <Text style={{ fontFamily: fontFamilies.serifMedium, fontSize: 24, color: colors.ink, marginRight: 8 }}>
                {daysWritten}
              </Text>
              <Text style={[textStyles.label, { color: colors.mutedLabel }]}>days written</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 12 }}>
              <Text style={{ fontFamily: fontFamilies.serifMedium, fontSize: 24, color: colors.ink, marginRight: 8 }}>
                {bestStreak}
              </Text>
              <Text style={[textStyles.label, { color: colors.mutedLabel }]}>best streak</Text>
            </View>
          </View>
        </View>

        <Pressable
          onPress={() => navigation.navigate('Book')}
          style={{
            backgroundColor: colors.paper,
            borderRadius: radii.cardLarge,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            padding: spacing.cardPadding + 2,
            marginTop: spacing.sectionGap,
            ...shadows.card,
          }}
        >
          <Text style={[textStyles.title, { color: colors.ink }]}>My Diary</Text>
          <Text style={{ fontFamily: fontFamilies.hand, fontSize: 17, color: colors.clayText, marginTop: 4 }}>
            flip through your entries →
          </Text>
        </Pressable>

        <SectionHeader label="explore" style={{ marginTop: spacing.sectionGap }} />
        <View style={{ flexDirection: 'row', gap: spacing.gap }}>
          <ExploreButton icon="search" label="search" onPress={() => navigation.navigate('Search')} />
          <ExploreButton icon="calendar" label="on this day" onPress={() => navigation.navigate('OnThisDay')} />
          <ExploreButton icon="message-circle" label="ask diary" onPress={() => navigation.navigate('AskDiary')} />
        </View>

        <SectionHeader
          label="recent"
          actionLabel="see all →"
          onAction={() => navigation.navigate('Journal')}
          style={{ marginTop: spacing.sectionGap }}
        />
        {(recent || []).map((entry) => (
          <EntryCardWithTags
            key={entry.id}
            entry={entry}
            onPress={() => navigation.navigate('EntryDetail', { entryId: entry.id })}
          />
        ))}
      </ScrollView>
      <FAB onPress={() => navigation.navigate('Write')} />
    </View>
  );
}

function ExploreButton({ icon, label, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        aspectRatio: 1,
        backgroundColor: colors.paper,
        borderRadius: radii.card,
        borderWidth: 1,
        borderColor: colors.cardBorder,
        alignItems: 'center',
        justifyContent: 'center',
        ...shadows.card,
      }}
    >
      <Feather name={icon} size={30} color={colors.clayText} />
      <Text style={{ fontFamily: fontFamilies.sans, fontSize: 14, color: colors.midInk, marginTop: 10 }}>
        {label}
      </Text>
    </Pressable>
  );
}
