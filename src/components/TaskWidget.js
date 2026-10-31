import { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, textStyles, spacing, radii, fontFamilies, shadows } from '../theme';
import SectionHeader from './SectionHeader';
import { showAlert } from './ThemedDialog';
import { useTaskLogsForDay, usePersons, useCreateTaskLog, useDeleteTaskLog } from '../hooks/useTasks';
import { formatTime, toDateKey } from '../utils/dateUtils';
import { haptics } from '../utils/haptics';

const todayKey = () => toDateKey(new Date());

export default function TaskWidget() {
  const navigation = useNavigation();
  const { data: logs = [] } = useTaskLogsForDay(todayKey());
  const [modalVisible, setModalVisible] = useState(false);
  // tracks which log rows are unlocked for deletion (lock icon tapped)
  const [unlockedIds, setUnlockedIds] = useState(new Set());

  const unlock = (id) => setUnlockedIds((prev) => new Set([...prev, id]));

  // person badge counts for today
  const personCounts = {};
  for (const log of logs) {
    personCounts[log.personName] = (personCounts[log.personName] || 0) + 1;
  }

  return (
    <View>
      <SectionHeader
        label="tasks"
        actionLabel="history →"
        onAction={() => navigation.navigate('TaskHistory')}
        style={{ marginTop: spacing.sectionGap }}
      />

      {/* person badges */}
      {Object.keys(personCounts).length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          {Object.entries(personCounts).map(([name, count]) => (
            <View
              key={name}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: colors.clayTint,
                borderRadius: radii.pill,
                paddingHorizontal: 10,
                paddingVertical: 5,
              }}
            >
              <Text style={{ fontFamily: fontFamilies.sans, fontSize: 13, color: colors.clayText }}>
                {name}
              </Text>
              <View
                style={{
                  backgroundColor: colors.clay,
                  borderRadius: 99,
                  minWidth: 18,
                  height: 18,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: 4,
                  marginLeft: 6,
                }}
              >
                <Text style={{ fontFamily: fontFamilies.sansBold, fontSize: 11, color: colors.cream }}>
                  {count}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* today's logs */}
      {logs.length > 0 ? (
        logs.map((log) => (
          <TaskLogRow
            key={log.id}
            log={log}
            isUnlocked={unlockedIds.has(log.id)}
            onUnlock={() => unlock(log.id)}
          />
        ))
      ) : (
        <Text style={{ fontFamily: fontFamilies.sans, fontSize: 14, color: colors.softInk, marginBottom: spacing.gap }}>
          No tasks logged today.
        </Text>
      )}

      {/* log task button */}
      <Pressable
        onPress={() => setModalVisible(true)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.paper,
          borderRadius: radii.card,
          borderWidth: 1,
          borderColor: colors.cardBorder,
          paddingVertical: 12,
          marginBottom: spacing.gap,
          ...shadows.card,
        }}
      >
        <Feather name="plus" size={16} color={colors.clayText} style={{ marginRight: 6 }} />
        <Text style={{ fontFamily: fontFamilies.sansBold, fontSize: 14, color: colors.clayText }}>
          log task
        </Text>
      </Pressable>

      <LogTaskModal visible={modalVisible} onClose={() => setModalVisible(false)} />
    </View>
  );
}

function TaskLogRow({ log, isUnlocked, onUnlock }) {
  const deleteLog = useDeleteTaskLog();
  const isToday = toDateKey(new Date(log.loggedAt)) === todayKey();

  const confirmDelete = () => {
    showAlert(
      'Remove this task?',
      `"${log.label}" logged by ${log.personName} will be removed.`,
      [
        { text: 'keep it', style: 'cancel' },
        {
          text: 'remove',
          style: 'destructive',
          onPress: () => { deleteLog.mutate(log.id); haptics.success(); },
        },
      ]
    );
  };

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
        {/* time + task name — both major */}
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
          <Text style={{ fontFamily: fontFamilies.serifMedium, fontSize: 18, color: colors.clayText }}>
            {formatTime(new Date(log.loggedAt))}
          </Text>
          <Text style={{ fontFamily: fontFamilies.serifMedium, fontSize: 16, color: colors.ink, flex: 1 }} numberOfLines={1}>
            {log.label}
          </Text>
        </View>
        {/* person — smaller */}
        <Text style={{ fontFamily: fontFamilies.sans, fontSize: 12, color: colors.softInk, marginTop: 3 }}>
          {log.personName}
        </Text>
      </View>

      {/* today only: lock → unlock → confirm delete */}
      {isToday ? (
        isUnlocked ? (
          <Pressable onPress={confirmDelete} hitSlop={10} style={{ marginLeft: 10 }}>
            <Feather name="trash-2" size={15} color={colors.moods.frayed} />
          </Pressable>
        ) : (
          <Pressable onPress={onUnlock} hitSlop={10} style={{ marginLeft: 10 }}>
            <Feather name="lock" size={15} color={colors.softInk} />
          </Pressable>
        )
      ) : null}
    </View>
  );
}

const HOURS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
const AMPM = ['AM', 'PM'];

function initTime() {
  const now = new Date();
  const h = now.getHours();
  const hour12 = h % 12 || 12;
  return {
    hourIdx: hour12 - 1,        // 0-11
    minuteIdx: now.getMinutes(), // 0-59
    ampmIdx: h < 12 ? 0 : 1,   // 0=AM 1=PM
  };
}

const MAX_LABEL = 50;

function LogTaskModal({ visible, onClose }) {
  const { data: persons = [] } = usePersons();
  const createLog = useCreateTaskLog();

  const [label, setLabel] = useState('');
  const [selectedPerson, setSelectedPerson] = useState(null);
  const init = initTime();
  const [hourIdx, setHourIdx] = useState(init.hourIdx);
  const [minuteIdx, setMinuteIdx] = useState(init.minuteIdx);
  const [ampmIdx, setAmpmIdx] = useState(init.ampmIdx);

  const handleShow = () => {
    const t = initTime();
    setHourIdx(t.hourIdx);
    setMinuteIdx(t.minuteIdx);
    setAmpmIdx(t.ampmIdx);
  };

  const resetAndClose = () => {
    setLabel('');
    setSelectedPerson(null);
    onClose();
  };

  const handleLog = async () => {
    if (!label.trim()) { showAlert('Add a label', 'Write a short description before logging.'); return; }
    if (!selectedPerson) { showAlert('Pick a person', 'Choose who did this task before logging.'); return; }

    const hour12 = hourIdx + 1;
    const isAM = ampmIdx === 0;
    const hour24 = isAM ? (hour12 === 12 ? 0 : hour12) : (hour12 === 12 ? 12 : hour12 + 12);
    const now = new Date();
    const loggedAt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour24, minuteIdx, 0).toISOString();
    await createLog.mutateAsync({ label: label.trim(), personId: selectedPerson.id, loggedAt });
    haptics.success();
    resetAndClose();
  };

  if (persons.length === 0) {
    return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <Pressable
          onPress={onClose}
          style={{ flex: 1, backgroundColor: 'rgba(20,14,8,0.55)', alignItems: 'center', justifyContent: 'center', padding: 28 }}
        >
          <Pressable
            onPress={() => {}}
            style={{
              backgroundColor: colors.paper,
              borderRadius: radii.cardLarge,
              borderWidth: 1,
              borderColor: colors.cardBorder,
              padding: spacing.cardPadding + 8,
              width: '100%',
              maxWidth: 340,
              ...shadows.card,
            }}
          >
            <Text style={[textStyles.title, { color: colors.ink, marginBottom: 10 }]}>Setup required</Text>
            <Text style={{ fontFamily: fontFamilies.sans, fontSize: 14, color: colors.midInk, marginBottom: 20, lineHeight: 20 }}>
              Add at least one person in Settings → Manage Tasks before logging.
            </Text>
            <Pressable onPress={onClose}>
              <Text style={{ fontFamily: fontFamilies.sansBold, fontSize: 15, color: colors.clayText, textAlign: 'center' }}>Close</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={resetAndClose} onShow={handleShow}>
      <Pressable
        onPress={resetAndClose}
        style={{ flex: 1, backgroundColor: 'rgba(20,14,8,0.55)', justifyContent: 'flex-end' }}
      >
        <Pressable
          onPress={() => {}}
          style={{
            backgroundColor: colors.backdrop,
            borderTopLeftRadius: radii.cardLarge,
            borderTopRightRadius: radii.cardLarge,
            paddingHorizontal: spacing.screenX,
            paddingTop: 20,
            paddingBottom: 36,
          }}
        >
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.hairline, alignSelf: 'center', marginBottom: 20 }} />
          <Text style={[textStyles.title, { color: colors.ink, marginBottom: 20 }]}>Log a Task</Text>

          {/* time picker */}
          <Text style={[textStyles.label, { color: colors.mutedLabel, marginBottom: 12 }]}>time</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 24 }}>
            <TimeSpinner
              value={HOURS[hourIdx]}
              onUp={() => setHourIdx((h) => (h + 11) % 12)}
              onDown={() => setHourIdx((h) => (h + 1) % 12)}
            />
            <Text style={{ fontFamily: fontFamilies.serifMedium, fontSize: 28, color: colors.softInk, marginBottom: 4 }}>:</Text>
            <TimeSpinner
              value={MINUTES[minuteIdx]}
              onUp={() => setMinuteIdx((m) => (m + 59) % 60)}
              onDown={() => setMinuteIdx((m) => (m + 1) % 60)}
            />
            <Pressable
              onPress={() => setAmpmIdx((a) => (a + 1) % 2)}
              style={{
                backgroundColor: colors.clayTint,
                borderRadius: radii.card,
                borderWidth: 1.5,
                borderColor: colors.clay,
                paddingHorizontal: 14,
                paddingVertical: 10,
                marginBottom: 4,
              }}
            >
              <Text style={{ fontFamily: fontFamilies.sansBold, fontSize: 18, color: colors.clayText }}>
                {AMPM[ampmIdx]}
              </Text>
            </Pressable>
          </View>

          {/* label input */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <Text style={[textStyles.label, { color: colors.mutedLabel }]}>label</Text>
            <Text style={{ fontFamily: fontFamilies.sans, fontSize: 12, color: label.length >= MAX_LABEL ? colors.moods.frayed : colors.softInk }}>
              {label.length}/{MAX_LABEL}
            </Text>
          </View>
          <TextInput
            value={label}
            onChangeText={(t) => setLabel(t.length <= MAX_LABEL ? t : t.slice(0, MAX_LABEL))}
            placeholder="e.g. Morning checkup"
            placeholderTextColor={colors.softInk}
            maxLength={MAX_LABEL}
            style={{
              fontFamily: fontFamilies.sans,
              fontSize: 15,
              color: colors.ink,
              backgroundColor: colors.paper,
              borderRadius: radii.card,
              borderWidth: 1,
              borderColor: colors.cardBorder,
              paddingHorizontal: 14,
              paddingVertical: 12,
              marginBottom: 24,
              ...shadows.card,
            }}
          />

          {/* person picker */}
          <Text style={[textStyles.label, { color: colors.mutedLabel, marginBottom: 10 }]}>person</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ marginHorizontal: -spacing.screenX }} contentContainerStyle={{ gap: 8, paddingHorizontal: spacing.screenX, paddingBottom: 4, marginBottom: 28 }}>
            {persons.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => setSelectedPerson(p)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: radii.pill,
                  borderWidth: 1.5,
                  borderColor: selectedPerson?.id === p.id ? colors.clay : colors.cardBorder,
                  backgroundColor: selectedPerson?.id === p.id ? colors.clayTint : colors.paper,
                }}
              >
                <Text style={{ fontFamily: fontFamilies.sans, fontSize: 14, color: selectedPerson?.id === p.id ? colors.clayText : colors.midInk }}>
                  {p.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <Pressable
            onPress={handleLog}
            disabled={createLog.isPending}
            style={{ backgroundColor: colors.clay, borderRadius: radii.pill, paddingVertical: 14, alignItems: 'center' }}
          >
            <Text style={{ fontFamily: fontFamilies.sansBold, fontSize: 16, color: colors.cream }}>
              {createLog.isPending ? 'Logging…' : 'Log Task'}
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function TimeSpinner({ value, onUp, onDown }) {
  return (
    <View style={{ alignItems: 'center', gap: 4 }}>
      <Pressable onPress={onUp} hitSlop={12} style={{ padding: 6 }}>
        <Feather name="chevron-up" size={22} color={colors.clayText} />
      </Pressable>
      <View
        style={{
          backgroundColor: colors.paper,
          borderRadius: radii.card,
          borderWidth: 1,
          borderColor: colors.cardBorder,
          paddingHorizontal: 16,
          paddingVertical: 8,
          minWidth: 62,
          alignItems: 'center',
          ...shadows.card,
        }}
      >
        <Text style={{ fontFamily: fontFamilies.serifMedium, fontSize: 30, color: colors.ink }}>
          {value}
        </Text>
      </View>
      <Pressable onPress={onDown} hitSlop={12} style={{ padding: 6 }}>
        <Feather name="chevron-down" size={22} color={colors.clayText} />
      </Pressable>
    </View>
  );
}
