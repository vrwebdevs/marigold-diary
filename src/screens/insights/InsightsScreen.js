import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LineChart } from 'react-native-gifted-charts';
import { Feather } from '@expo/vector-icons';
import { colors, textStyles, spacing, radii, shadows, fontFamilies } from '../../theme';
import SectionHeader from '../../components/SectionHeader';
import StatCard from '../../components/StatCard';
import TagChip from '../../components/TagChip';
import { useInsights } from '../../hooks/useInsights';
import ScreenLoader from '../../components/ScreenLoader';
import { useEntryStore } from '../../stores';
import { MOODS } from '../../utils/constants';
import {
  ACCESS_MESSAGES,
  getCachedWeeklyReflection,
  generateWeeklyReflection,
  getCachedMonthlySummary,
  generateMonthlySummary,
} from '../../services/aiDigest';

function Card({ children, style }) {
  return (
    <View
      style={[
        {
          backgroundColor: colors.paper,
          borderRadius: radii.cardLarge,
          padding: spacing.cardPadding,
          ...shadows.card,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export default function InsightsScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const insights = useInsights();
  const navigation = useNavigation();
  const setFilters = useEntryStore((s) => s.setFilters);

  const chartWidth = width - spacing.screenX * 2 - spacing.cardPadding * 2 - 12;

  const openMood = (moodKey) => {
    setFilters({ mood: moodKey, tagId: null, starredOnly: false, search: '' });
    navigation.navigate('Journal');
  };
  const openTag = (tagId) => {
    setFilters({ tagId, mood: null, starredOnly: false, search: '' });
    navigation.navigate('Journal');
  };

  if (insights.isLoading) return <ScreenLoader />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.backdrop, paddingTop: insets.top + 16 }}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: spacing.screenX, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[textStyles.heading, { color: colors.ink }]}>Insights</Text>

        <View style={{ flexDirection: 'row', gap: spacing.gap, marginTop: spacing.gapLarge }}>
          <StatCard value={insights.currentStreak} caption="streak" />
          <StatCard value={insights.longestStreak} caption="best streak" />
          <StatCard value={insights.entriesThisMonth} caption="this month" />
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.gap, marginTop: spacing.gap }}>
          <StatCard value={insights.avgWords} caption="avg words" />
          <StatCard value={insights.totalEntries} caption="entries" />
          <StatCard value={insights.totalWords} caption="words" />
        </View>

        <SectionHeader label="mood · last 30 days" style={{ marginTop: spacing.sectionGap }} />
        <Card>
          {insights.moodLine.length >= 2 ? (
            <LineChart
              data={insights.moodLine}
              width={chartWidth}
              adjustToWidth
              curved
              areaChart
              color={colors.clay}
              thickness={2.5}
              startFillColor={colors.clay}
              startOpacity={0.18}
              endOpacity={0}
              maxValue={insights.moodCount || 5}
              mostNegativeValue={0}
              noOfSections={5}
              hideDataPoints
              hideYAxisText
              yAxisThickness={0}
              xAxisThickness={0}
              rulesColor={colors.hairline}
              rulesType="solid"
              initialSpacing={8}
              endSpacing={8}
              xAxisLabelTextStyle={{
                fontFamily: fontFamilies.sans,
                fontSize: 10,
                color: colors.softInk,
              }}
              disableScroll
            />
          ) : (
            <Text
              style={{
                fontFamily: fontFamilies.sans,
                fontSize: 14,
                color: colors.softInk,
                textAlign: 'center',
                paddingVertical: 24,
              }}
            >
              log moods on a few more days to see your line
            </Text>
          )}
        </Card>

        {insights.patterns.length > 0 ? (
          <>
            <SectionHeader label="patterns" style={{ marginTop: spacing.sectionGap }} />
            <Card>
              {insights.patterns.map((p, i) => (
                <View
                  key={i}
                  style={{ flexDirection: 'row', alignItems: 'center', marginBottom: i < insights.patterns.length - 1 ? 12 : 0 }}
                >
                  <Feather name={p.icon} size={16} color={colors.clayText} style={{ marginRight: 10 }} />
                  <Text style={{ fontFamily: fontFamilies.sans, fontSize: 14, color: colors.midInk, flex: 1, lineHeight: 20 }}>
                    {p.text}
                  </Text>
                </View>
              ))}
            </Card>
          </>
        ) : null}

        <SectionHeader label="mood mix" style={{ marginTop: spacing.sectionGap }} />
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            {MOODS.map((mood) => (
              <Pressable key={mood.key} onPress={() => openMood(mood.key)} style={{ alignItems: 'center', flex: 1 }}>
                <View
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: 999,
                    backgroundColor: mood.color,
                  }}
                />
                <Text
                  style={{
                    fontFamily: fontFamilies.serifMedium,
                    fontSize: 18,
                    color: colors.ink,
                    marginTop: 6,
                  }}
                >
                  {insights.moodCounts[mood.key] || 0}
                </Text>
                <Text style={{ fontFamily: fontFamilies.sans, fontSize: 13, color: colors.softInk }}>
                  {mood.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </Card>

        <SectionHeader label="tags" style={{ marginTop: spacing.sectionGap }} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {insights.tags.filter((t) => t.count > 0).map((tag) => (
            <TagChip key={tag.id} label={`#${tag.name}`} count={tag.count} onPress={() => openTag(tag.id)} />
          ))}
          {insights.tags.filter((t) => t.count > 0).length === 0 ? (
            <Text style={{ fontFamily: fontFamilies.sans, fontSize: 14, color: colors.softInk }}>
              no tags yet
            </Text>
          ) : null}
        </View>

        <SectionHeader label="weekly reflection" style={{ marginTop: spacing.sectionGap }} />
        <AIDigest
          getCached={getCachedWeeklyReflection}
          generate={generateWeeklyReflection}
          cta="Reflect on my week →"
        />

        <SectionHeader label="monthly reflection" style={{ marginTop: spacing.sectionGap }} />
        <AIDigest
          getCached={getCachedMonthlySummary}
          generate={generateMonthlySummary}
          cta="Sum up my month →"
        />
      </ScrollView>
    </View>
  );
}

function AIDigest({ getCached, generate, cta }) {
  const [text, setText] = useState(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getCached().then(setText);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const run = async () => {
    setBusy(true);
    setNote('');
    try {
      setText(await generate());
    } catch (err) {
      setNote(ACCESS_MESSAGES[err.message] || 'something went wrong — try again later');
    }
    setBusy(false);
  };

  return (
    <Card>
      {text ? (
        <Text style={[textStyles.body, { fontSize: 16, lineHeight: 25, color: colors.midInk }]}>
          {text}
        </Text>
      ) : null}
      {note ? (
        <Text style={{ fontFamily: fontFamilies.sans, fontSize: 14, color: colors.softInk }}>
          {note}
        </Text>
      ) : null}
      <Pressable onPress={run} disabled={busy} hitSlop={8} style={{ marginTop: text || note ? 12 : 0 }}>
        <Text style={{ fontFamily: fontFamilies.sans, fontSize: 14, color: colors.clayText }}>
          {busy ? 'thinking…' : text ? 'refresh →' : cta}
        </Text>
      </Pressable>
    </Card>
  );
}
