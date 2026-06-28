import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, textStyles, spacing, radii, shadows, fontFamilies } from '../../theme';
import EntryCardWithTags from '../../components/EntryCardWithTags';
import EmptyState from '../../components/EmptyState';
import SectionHeader from '../../components/SectionHeader';
import { useEntriesByDay, useEntryDateKeys } from '../../hooks/useEntries';
import ScreenLoader from '../../components/ScreenLoader';
import { toDateKey, fromDateKey, formatFullDate } from '../../utils/dateUtils';
import { getMonthMatrix, monthLabel } from '../../utils/calendarUtils';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function CalendarScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const now = new Date();
  const todayKey = toDateKey();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [selectedKey, setSelectedKey] = useState(todayKey);

  const { data: dateRows, isLoading } = useEntryDateKeys();
  const countsByDay = Object.fromEntries((dateRows || []).map((r) => [r.dateKey, r.count]));
  const { data: dayEntries } = useEntriesByDay(selectedKey);

  // bounds: lower = month of earliest entry; upper = current month
  const currentIndex = now.getFullYear() * 12 + now.getMonth();
  const earliestKey = dateRows && dateRows.length ? dateRows[0].dateKey : todayKey;
  const lowerIndex =
    parseInt(earliestKey.slice(0, 4), 10) * 12 + (parseInt(earliestKey.slice(5, 7), 10) - 1);
  const cursorIndex = cursor.year * 12 + cursor.month;
  const canPrev = cursorIndex > lowerIndex;
  const canNext = cursorIndex < currentIndex;

  const weeks = getMonthMatrix(cursor.year, cursor.month);

  const shiftMonth = (delta) => {
    if (delta > 0 && !canNext) return;
    if (delta < 0 && !canPrev) return;
    const d = new Date(cursor.year, cursor.month + delta, 1);
    setCursor({ year: d.getFullYear(), month: d.getMonth() });
  };

  const swipe = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .failOffsetY([-15, 15])
    .runOnJS(true)
    .onEnd((e) => {
      if (e.translationX <= -40) shiftMonth(1);
      else if (e.translationX >= 40) shiftMonth(-1);
    });

  const cellBackground = (key) => {
    const n = countsByDay[key] || 0;
    if (!n) return 'transparent';
    if (n === 1) return 'rgba(178,106,71,0.30)';
    return colors.clay;
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

        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 14 }}>
          <Text style={[textStyles.heading, { color: colors.ink, flex: 1 }]}>
            {monthLabel(cursor.year, cursor.month)}
          </Text>
          <Pressable onPress={() => shiftMonth(-1)} disabled={!canPrev} hitSlop={12} style={{ paddingHorizontal: 10 }}>
            <Text style={{ fontFamily: fontFamilies.serifMedium, fontSize: 22, color: canPrev ? colors.clayText : colors.hairline }}>
              ←
            </Text>
          </Pressable>
          <Pressable onPress={() => shiftMonth(1)} disabled={!canNext} hitSlop={12} style={{ paddingHorizontal: 10 }}>
            <Text style={{ fontFamily: fontFamilies.serifMedium, fontSize: 22, color: canNext ? colors.clayText : colors.hairline }}>
              →
            </Text>
          </Pressable>
        </View>

        <GestureDetector gesture={swipe}>
          <View
            style={{
              backgroundColor: colors.paper,
              borderRadius: radii.cardLarge,
              borderWidth: 1,
              borderColor: colors.cardBorder,
              padding: spacing.cardPadding,
              marginTop: 14,
              ...shadows.card,
            }}
          >
            <View style={{ flexDirection: 'row' }}>
              {WEEKDAYS.map((d, i) => (
                <Text key={i} style={[textStyles.caption, { color: colors.mutedLabel, flex: 1, textAlign: 'center' }]}>
                  {d}
                </Text>
              ))}
            </View>
            {weeks.map((week, wi) => (
              <View key={wi} style={{ flexDirection: 'row', marginTop: 6 }}>
                {week.map((key, di) => {
                  if (!key) return <View key={di} style={{ flex: 1, aspectRatio: 1 }} />;
                  const isFuture = key > todayKey;
                  const isSelected = key === selectedKey;
                  const isToday = key === todayKey;
                  const count = countsByDay[key] || 0;
                  return (
                    <Pressable
                      key={di}
                      onPress={() => !isFuture && setSelectedKey(key)}
                      disabled={isFuture}
                      style={{ flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' }}
                    >
                      <View
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 12,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: cellBackground(key),
                          borderWidth: isSelected ? 2 : 0,
                          borderColor: colors.clayText,
                          opacity: isFuture ? 0.35 : 1,
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: isToday ? fontFamilies.sansBold : fontFamilies.sans,
                            fontSize: 13,
                            color: count > 1 ? colors.cream : colors.midInk,
                          }}
                        >
                          {parseInt(key.slice(8), 10)}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
        </GestureDetector>

        <SectionHeader
          label={formatFullDate(fromDateKey(selectedKey))}
          style={{ marginTop: spacing.sectionGap }}
        />
        {(dayEntries || []).length === 0 ? (
          <EmptyState
            icon="edit-3"
            title="Nothing on this day"
            subtitle="Pick another date, or tap + on Home to write."
            style={{ paddingVertical: 28 }}
          />
        ) : (
          (dayEntries || []).map((entry) => (
            <EntryCardWithTags
              key={entry.id}
              entry={entry}
              onPress={() => navigation.navigate('EntryDetail', { entryId: entry.id })}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}
