import { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { showAlert } from '../../components/ThemedDialog';
import DraggableFlatList from 'react-native-draggable-flatlist';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, textStyles, spacing, radii, fontFamilies } from '../../theme';
import { useTags, useDeleteTag, useCreateTag, useReorderTags } from '../../hooks/useTags';
import ScreenLoader from '../../components/ScreenLoader';
import { normalizeTag } from '../../utils/textUtils';

/** Tag Manager: drag to set priority, add new, remove. Order propagates app-wide. */
export default function TagFilterScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { data: tags, isLoading } = useTags();
  const createMutation = useCreateTag();
  const deleteMutation = useDeleteTag();
  const reorderMutation = useReorderTags();
  const [data, setData] = useState([]);
  const [input, setInput] = useState('');

  useEffect(() => {
    if (tags) setData(tags);
  }, [tags]);

  const addTag = () => {
    const name = normalizeTag(input);
    setInput('');
    if (name) createMutation.mutate(name);
  };

  const removeTag = (tag) => {
    showAlert(
      `Remove #${tag.name}?`,
      tag.count > 0
        ? `It's on ${tag.count} ${tag.count === 1 ? 'entry' : 'entries'} — they stay, just untagged.`
        : "This tag isn't used yet.",
      [
        { text: 'Keep', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => deleteMutation.mutate(tag.id) },
      ]
    );
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
        opacity: isActive ? 0.92 : 1,
      }}
    >
      <Feather name="menu" size={18} color={colors.softInk} style={{ marginRight: 12 }} />
      <Text style={{ fontFamily: fontFamilies.serifMedium, fontSize: 17, color: colors.ink, flex: 1 }}>
        #{item.name}
      </Text>
      <Text style={[textStyles.caption, { color: colors.softInk, marginRight: 16 }]}>
        {item.count} {item.count === 1 ? 'entry' : 'entries'}
      </Text>
      <TouchableOpacity onPress={() => removeTag(item)} hitSlop={10}>
        <Text style={{ fontSize: 16, color: colors.moods.frayed }}>✕</Text>
      </TouchableOpacity>
    </Pressable>
  );

  if (isLoading) return <ScreenLoader />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.backdrop, paddingTop: insets.top + 12 }}>
      <View style={{ paddingHorizontal: spacing.screenX }}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Text style={{ fontFamily: fontFamilies.sans, fontSize: 15, color: colors.clayText }}>← back</Text>
        </Pressable>
        <Text style={[textStyles.heading, { color: colors.ink, marginTop: 14 }]}>Tags</Text>
        <Text style={{ fontFamily: fontFamilies.sans, fontSize: 13, color: colors.softInk, marginTop: 4 }}>
          long-press a tag and drag to set priority
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
          <Text style={{ fontFamily: fontFamilies.sans, fontSize: 15, color: colors.softInk, marginRight: 4 }}>#</Text>
          <TextInput
            value={input}
            onChangeText={setInput}
            onSubmitEditing={addTag}
            placeholder="new tag"
            placeholderTextColor={colors.softInk}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            style={{ flex: 1, fontFamily: fontFamilies.sans, fontSize: 15, color: colors.ink, paddingVertical: 11 }}
          />
          <Pressable onPress={addTag} hitSlop={8}>
            <Text style={{ fontFamily: fontFamilies.sansBold, fontSize: 12, color: colors.clayText, letterSpacing: 1.5, textTransform: 'uppercase' }}>
              add
            </Text>
          </Pressable>
        </View>
      </View>

      <DraggableFlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        onDragEnd={({ data: newData }) => {
          setData(newData);
          reorderMutation.mutate(newData.map((t) => t.id));
        }}
        ListEmptyComponent={
          <Text style={{ fontFamily: fontFamilies.sans, fontSize: 14, color: colors.softInk, textAlign: 'center', marginTop: 30 }}>
            no tags yet — add one above
          </Text>
        }
        contentContainerStyle={{ paddingHorizontal: spacing.screenX, paddingTop: 4, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
