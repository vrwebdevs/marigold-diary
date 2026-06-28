import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RichText, Toolbar, useEditorBridge, useEditorContent } from '@10play/tentap-editor';
import { colors, textStyles, spacing, radii, fontFamilies } from '../../theme';
import { haptics } from '../../utils/haptics';
import MoodSelector from '../../components/MoodSelector';
import ScreenLoader from '../../components/ScreenLoader';
import TagChip from '../../components/TagChip';
import { useEntry, useCreateEntry, useUpdateEntry } from '../../hooks/useEntries';
import { useEntryTags, useSetEntryTags, useTags, useCreateTag } from '../../hooks/useTags';
import { useEntryStore } from '../../stores';
import { normalizeTag, countWords, stripHtml } from '../../utils/textUtils';
import { formatFullDate } from '../../utils/dateUtils';
import { useWeather } from '../../hooks/useWeather';
import { formatWeatherStamp } from '../../services/weather';

/**
 * Route params: { entryId } → edit mode; absent → new entry.
 * New-entry drafts autosave to useEntryStore so navigating away keeps them.
 * The editor remounts via key when switching between entries.
 */
export default function WriteScreen() {
  const route = useRoute();
  const entryId = route.params?.entryId ?? null;
  const { data: existing, isLoading } = useEntry(entryId);
  if (entryId && (isLoading || !existing)) {
    return <ScreenLoader />;
  }
  return <WriteEditor key={entryId || 'new'} existing={entryId ? existing : null} />;
}

function WriteEditor({ existing }) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const isEdit = !!existing;

  const setDraft = useEntryStore((s) => s.setDraft);
  const resetDraft = useEntryStore((s) => s.resetDraft);

  // initial values captured once (draft store for new, entry row for edit)
  const [initialHtml] = useState(() =>
    isEdit ? existing.content : useEntryStore.getState().draft.content || ''
  );
  const [title, setTitle] = useState(() =>
    isEdit ? existing.title : useEntryStore.getState().draft.title
  );
  const [mood, setMood] = useState(() =>
    isEdit ? existing.mood : useEntryStore.getState().draft.mood
  );
  const [tagNames, setTagNames] = useState(() =>
    isEdit ? [] : useEntryStore.getState().draft.tagNames
  );
  const [aiConsent, setAiConsent] = useState(() =>
    isEdit ? !!existing.aiConsent : !!useEntryStore.getState().draft.aiConsent
  );
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);
  const { data: weather } = useWeather();
  const weatherStamp = weather ? formatWeatherStamp(weather.temp, weather.code) : null;

  const editor = useEditorBridge({
    autofocus: !isEdit,
    avoidIosKeyboard: true,
    initialContent: initialHtml,
  });
  const liveHtml = useEditorContent(editor, { type: 'html' });
  const html = liveHtml !== undefined ? liveHtml : initialHtml;
  const wordCount = countWords(stripHtml(html));

  // edit mode: hydrate tag chips from the entry's saved tags (once)
  const { data: existingTags } = useEntryTags(isEdit ? existing.id : null);
  useEffect(() => {
    if (isEdit && existingTags) {
      setTagNames(existingTags.map((t) => t.name));
    }
  }, [isEdit, existingTags]);

  // autosave new-entry draft
  useEffect(() => {
    if (isEdit) return;
    const fields = { title, mood, tagNames, aiConsent };
    if (liveHtml !== undefined) fields.content = liveHtml;
    setDraft(fields);
  }, [isEdit, title, mood, tagNames, aiConsent, liveHtml, setDraft]);

  const createMutation = useCreateEntry();
  const updateMutation = useUpdateEntry();
  const setTagsMutation = useSetEntryTags();
  const { data: allTags } = useTags();
  const createTagMutation = useCreateTag();

  const toggleTag = (tag) =>
    setTagNames(tagNames.includes(tag) ? tagNames.filter((t) => t !== tag) : [...tagNames, tag]);

  const addNewTag = () => {
    const tag = normalizeTag(tagInput);
    setTagInput('');
    if (tag && !tagNames.includes(tag)) {
      setTagNames([...tagNames, tag]);
      createTagMutation.mutate(tag); // persist to the global tag list / Manager
    }
  };

  const canSave = !saving && (title.trim().length > 0 || wordCount > 0);

  const onSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const content = await editor.getHTML();
      let id;
      if (isEdit) {
        await updateMutation.mutateAsync({
          id: existing.id,
          fields: { title: title.trim(), content, mood, aiConsent: aiConsent ? 1 : 0 },
        });
        id = existing.id;
      } else {
        const created = await createMutation.mutateAsync({
          title: title.trim(),
          content,
          mood,
          weatherTemp: weather?.temp ?? null,
          weatherCode: weather?.code ?? null,
          aiConsent: aiConsent ? 1 : 0,
        });
        id = created.id;
      }
      await setTagsMutation.mutateAsync({ entryId: id, tagNames });
      if (!isEdit) {
        resetDraft();
      }
      haptics.success();
      navigation.goBack();
    } catch (err) {
      console.error('[WRITE] save failed:', err);
      setSaving(false);
    }
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.backdrop,
        paddingTop: insets.top + 12,
      }}
    >
      {/* header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: spacing.screenX,
          marginBottom: 10,
        }}
      >
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Text style={{ color: colors.softInk, fontSize: 22, lineHeight: 26 }}>✕</Text>
        </Pressable>
        <Text
          style={[
            textStyles.label,
            { color: colors.mutedLabel, flex: 1, textAlign: 'center' },
          ]}
        >
          {formatFullDate(new Date())}
          {weatherStamp ? `  ·  ${weatherStamp}` : ''}
        </Text>
        <Pressable
          onPress={onSave}
          disabled={!canSave}
          hitSlop={8}
          style={{
            backgroundColor: canSave ? colors.clay : colors.hairline,
            borderRadius: radii.pill,
            paddingHorizontal: 18,
            paddingVertical: 8,
          }}
        >
          <Text
            style={[
              textStyles.labelBold,
              { color: canSave ? colors.cream : colors.softInk },
            ]}
          >
            {saving ? 'saving' : 'save'}
          </Text>
        </Pressable>
      </View>

      {/* title */}
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="Title"
        placeholderTextColor={colors.softInk}
        style={{
          fontFamily: fontFamilies.serifMedium,
          fontSize: 24,
          color: colors.ink,
          paddingHorizontal: spacing.screenX,
          paddingVertical: 6,
        }}
      />

      {/* mood */}
      <MoodSelector
        value={mood}
        onChange={setMood}
        style={{ marginTop: 6 }}
      />

      {/* tags — priority order (horizontal scroll) + add new */}
      <View style={{ marginTop: 14 }}>
        {[...new Set([...(allTags || []).map((t) => t.name), ...tagNames])].length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ flexDirection: 'row', gap: 6, paddingHorizontal: spacing.screenX }}
          >
            {[...new Set([...(allTags || []).map((t) => t.name), ...tagNames])].map((name) => (
              <TagChip
                key={name}
                label={`#${name}`}
                selected={tagNames.includes(name)}
                onPress={() => toggleTag(name)}
              />
            ))}
          </ScrollView>
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, paddingHorizontal: spacing.screenX }}>
          <Text style={{ fontFamily: fontFamilies.sans, fontSize: 13, color: colors.softInk, marginRight: 2 }}>#</Text>
          <TextInput
            value={tagInput}
            onChangeText={setTagInput}
            onSubmitEditing={addNewTag}
            placeholder="add a tag"
            placeholderTextColor={colors.softInk}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            blurOnSubmit={false}
            style={{
              flex: 1,
              fontFamily: fontFamilies.sans,
              fontSize: 13,
              color: colors.ink,
              paddingVertical: 6,
            }}
          />
        </View>
      </View>

      {/* AI consent — captured even before AI features are enabled */}
      <Pressable
        onPress={() => setAiConsent(!aiConsent)}
        hitSlop={6}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: spacing.screenX,
          marginTop: 10,
        }}
      >
        <View
          style={{
            width: 18,
            height: 18,
            borderRadius: 5,
            borderWidth: 1.5,
            borderColor: aiConsent ? colors.clay : 'rgba(59,48,38,0.30)',
            backgroundColor: aiConsent ? colors.clay : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 8,
          }}
        >
          {aiConsent ? (
            <Text style={{ color: colors.cream, fontSize: 12, lineHeight: 14 }}>✓</Text>
          ) : null}
        </View>
        <Text style={{ fontFamily: fontFamilies.sans, fontSize: 13, color: colors.midInk }}>
          can share this entry with AI
        </Text>
      </Pressable>

      {/* word count */}
      <Text
        style={[
          textStyles.caption,
          {
            color: colors.softInk,
            textAlign: 'right',
            paddingHorizontal: spacing.screenX,
            marginBottom: 6,
          },
        ]}
      >
        {wordCount} words
      </Text>

      {/* editor */}
      <View
        style={{
          flex: 1,
          backgroundColor: colors.paper,
          borderTopLeftRadius: radii.cardLarge,
          borderTopRightRadius: radii.cardLarge,
          paddingHorizontal: 12,
          paddingTop: 8,
        }}
      >
        <RichText editor={editor} style={{ backgroundColor: 'transparent' }} />
      </View>

      {/* toolbar pinned above keyboard */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ position: 'absolute', width: '100%', bottom: 0 }}
      >
        <Toolbar editor={editor} />
      </KeyboardAvoidingView>
    </View>
  );
}
