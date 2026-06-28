import { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import DraggableFlatList from 'react-native-draggable-flatlist';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { colors, textStyles, spacing, radii, shadows, fontFamilies, applyMoods, moodColor, CURATED_MOOD_COLORS } from '../../theme';
import { showAlert } from '../../components/ThemedDialog';
import { listMoods, createMood, updateMood, reorderMoods, deleteMood, countEntriesWithMood } from '../../db/queries/moods';

/** Manage emotions: add (label + color), recolor, drag-reorder (order = mood scale), remove. */
export default function MoodManagerScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [data, setData] = useState([]);
  const [label, setLabel] = useState('');
  const [newColor, setNewColor] = useState(CURATED_MOOD_COLORS[0]);
  const [picker, setPicker] = useState(null); // null | 'new' | <mood key>

  const refresh = async () => {
    const list = await listMoods();
    setData(list);
    applyMoods(list);
    setNewColor(CURATED_MOOD_COLORS.find((c) => !list.some((m) => m.color === c)) || CURATED_MOOD_COLORS[0]);
    queryClient.invalidateQueries();
  };
  useEffect(() => {
    refresh();
  }, []);

  const addMood = async () => {
    const l = label.trim();
    if (!l) return;
    await createMood(l, newColor);
    setLabel('');
    setNewColor(CURATED_MOOD_COLORS[0]);
    await refresh();
  };

  const pickColor = async (c) => {
    if (picker === 'new') {
      setNewColor(c);
    } else if (picker) {
      await updateMood(picker, { color: c });
      await refresh();
    }
    setPicker(null);
  };

  const removeMood = (m) => {
    (async () => {
      const count = await countEntriesWithMood(m.key);
      showAlert(
        `Remove ${m.label}?`,
        count > 0
          ? `${count} ${count === 1 ? 'entry uses' : 'entries use'} it — they keep the label but lose its color.`
          : "This emotion isn't used yet.",
        [
          { text: 'Keep', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              await deleteMood(m.key);
              await refresh();
            },
          },
        ]
      );
    })();
  };

  const renderItem = ({ item, drag, isActive }) => (
    <Pressable
      onLongPress={drag}
      delayLongPress={150}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.paper,
        borderRadius: radii.card,
        borderWidth: 1,
        borderColor: isActive ? colors.clayText : colors.cardBorder,
        paddingHorizontal: spacing.cardPadding,
        paddingVertical: 12,
        marginBottom: spacing.gap,
      }}
    >
      <Feather name="menu" size={18} color={colors.softInk} style={{ marginRight: 12 }} />
      <TouchableOpacity onPress={() => setPicker(item.key)} hitSlop={8} style={{ marginRight: 12 }}>
        <View style={{ width: 24, height: 24, borderRadius: 999, backgroundColor: moodColor(item.key), borderWidth: 1, borderColor: colors.hairline }} />
      </TouchableOpacity>
      <Text style={{ fontFamily: fontFamilies.serifMedium, fontSize: 17, color: colors.ink, flex: 1 }}>{item.label}</Text>
      <TouchableOpacity onPress={() => removeMood(item)} hitSlop={10}>
        <Text style={{ fontSize: 16, color: colors.moods.frayed }}>✕</Text>
      </TouchableOpacity>
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.backdrop, paddingTop: insets.top + 12 }}>
      <View style={{ paddingHorizontal: spacing.screenX }}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Text style={{ fontFamily: fontFamilies.sans, fontSize: 15, color: colors.clayText }}>← back</Text>
        </Pressable>
        <Text style={[textStyles.heading, { color: colors.ink, marginTop: 14 }]}>Emotions</Text>
        <Text style={{ fontFamily: fontFamilies.sans, fontSize: 13, color: colors.softInk, marginTop: 4 }}>
          long-press to reorder · order is the mood scale (top = brightest)
        </Text>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.paper,
            borderRadius: radii.input,
            borderWidth: 1,
            borderColor: colors.hairline,
            paddingHorizontal: 14,
            marginTop: spacing.gapLarge,
            marginBottom: spacing.gap,
          }}
        >
          <TouchableOpacity onPress={() => setPicker('new')} hitSlop={8} style={{ marginRight: 10 }}>
            <View style={{ width: 24, height: 24, borderRadius: 999, backgroundColor: newColor, borderWidth: 1, borderColor: colors.hairline }} />
          </TouchableOpacity>
          <TextInput
            value={label}
            onChangeText={setLabel}
            onSubmitEditing={addMood}
            placeholder="new emotion"
            placeholderTextColor={colors.softInk}
            returnKeyType="done"
            style={{ flex: 1, fontFamily: fontFamilies.sans, fontSize: 15, color: colors.ink, paddingVertical: 11 }}
          />
          <Pressable onPress={addMood} hitSlop={8}>
            <Text style={{ fontFamily: fontFamilies.sansBold, fontSize: 12, color: colors.clayText, letterSpacing: 1.5, textTransform: 'uppercase' }}>add</Text>
          </Pressable>
        </View>
      </View>

      <DraggableFlatList
        data={data}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        onDragEnd={async ({ data: newData }) => {
          setData(newData);
          await reorderMoods(newData.map((m) => m.key));
          applyMoods(newData);
        }}
        contentContainerStyle={{ paddingHorizontal: spacing.screenX, paddingTop: 4, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      />

      {picker ? (
        <Pressable
          onPress={() => setPicker(null)}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(20,14,8,0.45)', alignItems: 'center', justifyContent: 'center', padding: 28 }}
        >
          <Pressable
            onPress={() => {}}
            style={{ backgroundColor: colors.paper, borderRadius: radii.cardLarge, borderWidth: 1, borderColor: colors.cardBorder, padding: spacing.cardPadding + 4, width: '100%', maxWidth: 340, ...shadows.card }}
          >
            <Text style={[textStyles.label, { color: colors.mutedLabel, marginBottom: 14 }]}>pick a color</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, justifyContent: 'center' }}>
              {CURATED_MOOD_COLORS.map((c) => {
                const targetKey = picker === 'new' ? null : picker;
                const taken = data.some((m) => m.color === c && m.key !== targetKey);
                return (
                  <TouchableOpacity key={c} onPress={() => pickColor(c)} disabled={taken} hitSlop={4}>
                    <View style={{ width: 40, height: 40, borderRadius: 999, backgroundColor: c, borderWidth: 2, borderColor: colors.paper, opacity: taken ? 0.25 : 1 }} />
                  </TouchableOpacity>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      ) : null}
    </View>
  );
}
