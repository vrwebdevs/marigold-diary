import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Modal,
  PanResponder,
  Pressable,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, textStyles, spacing, radii, fontFamilies, shadows } from '../../theme';
import { showAlert } from '../../components/ThemedDialog';
import { useAllTaskLogs, useDeleteTaskLog } from '../../hooks/useTasks';
import { formatTime, fromDateKey, toDateKey } from '../../utils/dateUtils';
import { haptics } from '../../utils/haptics';
import ScreenLoader from '../../components/ScreenLoader';

const todayKey = () => toDateKey(new Date());

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];
const DAYS_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function formatNavLabel(dateKey) {
  const d = fromDateKey(dateKey);
  const today = todayKey();
  const month = MONTHS_SHORT[d.getMonth()];
  const day = d.getDate();
  const thisYear = new Date().getFullYear();
  const yearSuffix = d.getFullYear() !== thisYear ? `, ${d.getFullYear()}` : '';

  if (dateKey === today) return `Today · ${month} ${day}`;
  const diff = Math.round((fromDateKey(today) - d) / 86400000);
  if (diff === 1) return `Yesterday · ${month} ${day}`;
  return `${d.toLocaleDateString('en-US', { weekday: 'long' })} · ${month} ${day}${yearSuffix}`;
}

function chunkArray(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export default function TaskHistoryScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { data: allLogs = [], isLoading } = useAllTaskLogs();
  const deleteLog = useDeleteTaskLog();

  const [selectedDateKey, setSelectedDateKey] = useState(todayKey());
  const [unlockedIds, setUnlockedIds] = useState(new Set());
  const [calendarVisible, setCalendarVisible] = useState(false);

  // earliest task log date -> lower bound for date navigation
  const minDateKey = useMemo(() => {
    if (!allLogs.length) return todayKey();
    return allLogs.map(l => toDateKey(new Date(l.loggedAt))).reduce((a, b) => (a < b ? a : b));
  }, [allLogs]);

  const maxDateKey = todayKey();

  // set of all dates that have at least one log (for calendar dot indicators)
  const logDateKeys = useMemo(
    () => new Set(allLogs.map(l => toDateKey(new Date(l.loggedAt)))),
    [allLogs]
  );

  // logs for the currently selected day, sorted by time ascending
  const dayLogs = useMemo(
    () =>
      allLogs
        .filter(l => toDateKey(new Date(l.loggedAt)) === selectedDateKey)
        .sort((a, b) => a.loggedAt.localeCompare(b.loggedAt)),
    [allLogs, selectedDateKey]
  );

  // person badge counts for the selected day
  const personCounts = useMemo(() => {
    const counts = {};
    for (const log of dayLogs) {
      counts[log.personName] = (counts[log.personName] || 0) + 1;
    }
    return counts;
  }, [dayLogs]);

  const canGoPrev = selectedDateKey > minDateKey;
  const canGoNext = selectedDateKey < maxDateKey;

  const goToPrev = () => {
    if (!canGoPrev) return;
    const d = fromDateKey(selectedDateKey);
    d.setDate(d.getDate() - 1);
    setSelectedDateKey(toDateKey(d));
    setUnlockedIds(new Set());
  };

  const goToNext = () => {
    if (!canGoNext) return;
    const d = fromDateKey(selectedDateKey);
    d.setDate(d.getDate() + 1);
    setSelectedDateKey(toDateKey(d));
    setUnlockedIds(new Set());
  };

  // ref pattern: PanResponder is created once but always calls the latest nav functions
  const navRef = useRef({});
  navRef.current.goToPrev = goToPrev;
  navRef.current.goToNext = goToNext;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderRelease: (_, g) => {
        if (g.dx > 50) navRef.current.goToPrev();
        else if (g.dx < -50) navRef.current.goToNext();
      },
    })
  ).current;

  if (isLoading) return <ScreenLoader />;

  const unlock = (id) => setUnlockedIds((prev) => new Set([...prev, id]));

  const confirmDelete = (item) => {
    showAlert(
      'Remove this task?',
      `"${item.label}" logged by ${item.personName} will be removed.`,
      [
        { text: 'keep it', style: 'cancel' },
        {
          text: 'remove',
          style: 'destructive',
          onPress: () => {
            deleteLog.mutate(item.id);
            haptics.success();
            setUnlockedIds((prev) => {
              const next = new Set(prev);
              next.delete(item.id);
              return next;
            });
          },
        },
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.backdrop }} {...panResponder.panHandlers}>
      {/* screen header */}
      <View
        style={{
          paddingTop: insets.top + 16,
          paddingHorizontal: spacing.screenX,
          paddingBottom: 4,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={{ marginRight: 14 }}>
          <Feather name="arrow-left" size={22} color={colors.softInk} />
        </Pressable>
        <Text style={[textStyles.title, { color: colors.ink }]}>Task History</Text>
      </View>

      {/* day navigator */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: spacing.screenX,
          paddingVertical: 12,
          gap: 4,
        }}
      >
        <Pressable
          onPress={goToPrev}
          disabled={!canGoPrev}
          hitSlop={12}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: canGoPrev ? colors.clayTint : 'transparent',
          }}
        >
          <Feather
            name="chevron-left"
            size={20}
            color={canGoPrev ? colors.clayText : colors.softInk + '40'}
          />
        </Pressable>

        <Pressable
          onPress={() => setCalendarVisible(true)}
          style={{ flex: 1, alignItems: 'center', paddingVertical: 4 }}
        >
          <Text style={{ fontFamily: fontFamilies.serifMedium, fontSize: 17, color: colors.ink }}>
            {formatNavLabel(selectedDateKey)}
          </Text>
          <Text style={{ fontFamily: fontFamilies.sans, fontSize: 11, color: colors.softInk, marginTop: 2 }}>
            tap to jump to a date
          </Text>
        </Pressable>

        <Pressable
          onPress={goToNext}
          disabled={!canGoNext}
          hitSlop={12}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: canGoNext ? colors.clayTint : 'transparent',
          }}
        >
          <Feather
            name="chevron-right"
            size={20}
            color={canGoNext ? colors.clayText : colors.softInk + '40'}
          />
        </Pressable>
      </View>

      {/* log list for selected day */}
      <FlatList
        data={dayLogs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingHorizontal: spacing.screenX,
          paddingBottom: 60,
          flexGrow: 1,
        }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          Object.keys(personCounts).length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
              {Object.entries(personCounts).map(([name, count]) => (
                <View
                  key={name}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: colors.clayTint,
                    borderRadius: radii.pill,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                  }}
                >
                  <Text style={{ fontFamily: fontFamilies.sans, fontSize: 12, color: colors.clayText }}>
                    {name}
                  </Text>
                  <View
                    style={{
                      backgroundColor: colors.clay,
                      borderRadius: 99,
                      minWidth: 16,
                      height: 16,
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingHorizontal: 3,
                      marginLeft: 5,
                    }}
                  >
                    <Text style={{ fontFamily: fontFamilies.sansBold, fontSize: 10, color: colors.cream }}>
                      {count}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 80 }}>
            <Text style={{ fontFamily: fontFamilies.hand, fontSize: 22, color: colors.mutedLabel, textAlign: 'center' }}>
              No tasks logged
            </Text>
            <Text style={{ fontFamily: fontFamilies.sans, fontSize: 14, color: colors.softInk, marginTop: 8, textAlign: 'center' }}>
              {selectedDateKey === todayKey()
                ? 'Log a task from the home screen.'
                : 'Nothing was logged on this day.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const isToday = toDateKey(new Date(item.loggedAt)) === todayKey();
          const isUnlocked = unlockedIds.has(item.id);
          return (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: colors.paper,
                borderRadius: radii.card,
                borderWidth: 1,
                borderColor: colors.cardBorder,
                paddingHorizontal: spacing.cardPadding,
                paddingVertical: 12,
                marginBottom: spacing.gap,
                ...shadows.card,
              }}
            >
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
                  <Text style={{ fontFamily: fontFamilies.serifMedium, fontSize: 18, color: colors.clayText }}>
                    {formatTime(new Date(item.loggedAt))}
                  </Text>
                  <Text
                    style={{ fontFamily: fontFamilies.serifMedium, fontSize: 16, color: colors.ink, flex: 1 }}
                    numberOfLines={1}
                  >
                    {item.label}
                  </Text>
                </View>
                <Text style={{ fontFamily: fontFamilies.sans, fontSize: 12, color: colors.softInk, marginTop: 3 }}>
                  {item.personName}
                </Text>
              </View>

              {isToday ? (
                isUnlocked ? (
                  <Pressable onPress={() => confirmDelete(item)} hitSlop={10}>
                    <Feather name="trash-2" size={15} color={colors.moods.frayed} />
                  </Pressable>
                ) : (
                  <Pressable onPress={() => unlock(item.id)} hitSlop={10}>
                    <Feather name="lock" size={15} color={colors.softInk} />
                  </Pressable>
                )
              ) : null}
            </View>
          );
        }}
      />

      <CalendarModal
        visible={calendarVisible}
        onClose={() => setCalendarVisible(false)}
        selectedKey={selectedDateKey}
        minKey={minDateKey}
        maxKey={maxDateKey}
        logDateKeys={logDateKeys}
        onSelect={(key) => {
          setSelectedDateKey(key);
          setUnlockedIds(new Set());
          setCalendarVisible(false);
        }}
      />
    </View>
  );
}

function CalendarModal({ visible, onClose, selectedKey, minKey, maxKey, logDateKeys, onSelect }) {
  const [viewYear, setViewYear] = useState(parseInt(selectedKey.slice(0, 4)));
  const [viewMonth, setViewMonth] = useState(parseInt(selectedKey.slice(5, 7)) - 1); // 0-indexed

  // sync view to the selected key when the modal opens
  useEffect(() => {
    if (visible) {
      setViewYear(parseInt(selectedKey.slice(0, 4)));
      setViewMonth(parseInt(selectedKey.slice(5, 7)) - 1);
    }
  }, [visible, selectedKey]);

  const viewYM = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
  const canPrevMonth = viewYM > minKey.slice(0, 7);
  const canNextMonth = viewYM < maxKey.slice(0, 7);

  const goPrevMonth = () => {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  };

  const goNextMonth = () => {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
  };

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sunday

  const cells = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const today = todayKey();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: 'rgba(20,14,8,0.55)',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 28,
        }}
      >
        <Pressable
          onPress={() => {}}
          style={{
            backgroundColor: colors.paper,
            borderRadius: radii.cardLarge,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            padding: 20,
            width: '100%',
            maxWidth: 340,
            ...shadows.card,
          }}
        >
          {/* month navigation */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <Pressable onPress={goPrevMonth} disabled={!canPrevMonth} hitSlop={10} style={{ padding: 6 }}>
              <Feather name="chevron-left" size={20} color={canPrevMonth ? colors.ink : colors.softInk + '30'} />
            </Pressable>
            <Text style={{ flex: 1, textAlign: 'center', fontFamily: fontFamilies.serifMedium, fontSize: 17, color: colors.ink }}>
              {MONTHS[viewMonth]} {viewYear}
            </Text>
            <Pressable onPress={goNextMonth} disabled={!canNextMonth} hitSlop={10} style={{ padding: 6 }}>
              <Feather name="chevron-right" size={20} color={canNextMonth ? colors.ink : colors.softInk + '30'} />
            </Pressable>
          </View>

          {/* weekday labels */}
          <View style={{ flexDirection: 'row', marginBottom: 6 }}>
            {DAYS_SHORT.map((label, i) => (
              <Text
                key={i}
                style={{
                  flex: 1,
                  textAlign: 'center',
                  fontFamily: fontFamilies.sansBold,
                  fontSize: 11,
                  color: colors.mutedLabel,
                }}
              >
                {label}
              </Text>
            ))}
          </View>

          {/* day grid */}
          {chunkArray(cells, 7).map((row, ri) => (
            <View key={ri} style={{ flexDirection: 'row', marginBottom: 2 }}>
              {row.map((day, ci) => {
                if (!day) return <View key={ci} style={{ flex: 1, height: 44 }} />;

                const dayKey = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const isDisabled = dayKey < minKey || dayKey > maxKey;
                const isSelected = dayKey === selectedKey;
                const isToday = dayKey === today;
                const hasLog = logDateKeys.has(dayKey);

                return (
                  <Pressable
                    key={ci}
                    onPress={() => !isDisabled && onSelect(dayKey)}
                    disabled={isDisabled}
                    style={{ flex: 1, alignItems: 'center', paddingVertical: 2 }}
                  >
                    <View
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 17,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: isSelected ? colors.clay : isToday ? colors.clayTint : 'transparent',
                        borderWidth: isToday && !isSelected ? 1.5 : 0,
                        borderColor: colors.clay,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: isSelected ? fontFamilies.sansBold : fontFamilies.sans,
                          fontSize: 14,
                          color: isSelected ? colors.cream : isDisabled ? colors.softInk + '30' : colors.ink,
                        }}
                      >
                        {day}
                      </Text>
                    </View>
                    {/* activity dot */}
                    <View style={{ height: 5, alignItems: 'center', justifyContent: 'center' }}>
                      {hasLog && !isSelected ? (
                        <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: colors.clay }} />
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
