import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { showAlert } from '../../components/ThemedDialog';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { colors, textStyles, spacing, radii, fontFamilies, moodColor } from '../../theme';
import TagChip from '../../components/TagChip';
import EntryLockModal from '../../components/EntryLockModal';
import ScreenLoader from '../../components/ScreenLoader';
import { useEntry, useUpdateEntry, useDeleteEntry } from '../../hooks/useEntries';
import { useEntryTags } from '../../hooks/useTags';
import { useAuthStore } from '../../stores';
import { moodByKey } from '../../utils/constants';
import { formatFullDate, formatTime, fromDateKey } from '../../utils/dateUtils';
import { formatWeatherStamp } from '../../services/weather';
import { exportEntryPdf } from '../../services/pdfExport';

/** Reading-view HTML shell; Newsreader isn't available inside the WebView, Georgia is the stand-in. */
const wrapContent = (body) => `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<style>
  body { font-family: Georgia, serif; font-size: 18px; line-height: 1.75;
         color: ${colors.ink}; background: transparent; margin: 0; padding: 4px 2px 60px; }
  p { margin: 0 0 14px; }
</style></head><body>${body}</body></html>`;

function HandAction({ label, color, onPress, disabled = false }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} hitSlop={8}>
      <Text style={{ fontFamily: fontFamilies.sans, fontSize: 15, color, opacity: disabled ? 0.45 : 1 }}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function EntryDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const entryId = route.params?.entryId ?? null;
  const { data: entry, isLoading } = useEntry(entryId);
  const { data: tags } = useEntryTags(entryId);
  const updateMutation = useUpdateEntry();
  const deleteMutation = useDeleteEntry();

  const pinEnabled = useAuthStore((s) => s.pinEnabled);
  const unlockedEntryIds = useAuthStore((s) => s.unlockedEntryIds);
  const unlockEntry = useAuthStore((s) => s.unlockEntry);
  const [modalVisible, setModalVisible] = useState(false);

  const goBack = () => navigation.goBack();

  if (!entryId || (!isLoading && !entry)) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.backdrop,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: spacing.screenX,
        }}
      >
        <Text style={{ fontFamily: fontFamilies.sans, fontSize: 15, color: colors.softInk, textAlign: 'center' }}>
          {entryId ? 'this entry is gone' : 'open an entry from your Journal'}
        </Text>
        <Pressable onPress={goBack} hitSlop={8} style={{ marginTop: 16 }}>
          <Text style={{ fontFamily: fontFamilies.sans, fontSize: 15, color: colors.clayText }}>
            ← go back
          </Text>
        </Pressable>
      </View>
    );
  }

  if (isLoading || !entry) {
    return <ScreenLoader />;
  }

  const isGated = !!entry.isLocked && !unlockedEntryIds.includes(entry.id);

  if (isGated) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.backdrop,
          paddingTop: insets.top + 12,
          paddingHorizontal: spacing.screenX,
        }}
      >
        <Pressable onPress={goBack} hitSlop={10}>
          <Text style={{ fontFamily: fontFamilies.sans, fontSize: 15, color: colors.clayText }}>
            ← journal
          </Text>
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 80 }}>
          <Text style={[textStyles.label, { color: colors.mutedLabel }]}>
            {formatFullDate(fromDateKey(entry.dateKey))}
          </Text>
          <Text
            style={{
              fontFamily: fontFamilies.sans,
              fontSize: 16,
              color: colors.softInk,
              marginTop: 14,
            }}
          >
            this entry is locked
          </Text>
          <Pressable
            onPress={() => setModalVisible(true)}
            style={{
              backgroundColor: colors.clay,
              borderRadius: radii.pill,
              paddingHorizontal: 26,
              paddingVertical: 12,
              marginTop: 22,
            }}
          >
            <Text style={[textStyles.labelBold, { color: colors.cream }]}>unlock</Text>
          </Pressable>
        </View>
        <EntryLockModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          onUnlocked={() => {
            unlockEntry(entry.id);
            setModalVisible(false);
          }}
        />
      </View>
    );
  }

  const mood = moodByKey(entry.mood);

  const toggleStar = () => {
    updateMutation.mutate({ id: entry.id, fields: { isStarred: entry.isStarred ? 0 : 1 } });
  };

  const toggleLock = () => {
    if (entry.isLocked) {
      updateMutation.mutate({ id: entry.id, fields: { isLocked: 0 } });
      return;
    }
    if (!pinEnabled) {
      showAlert('Set a PIN first', 'Locked entries open with your app PIN.', [
        { text: 'Not now', style: 'cancel' },
        { text: 'Set PIN', onPress: () => navigation.navigate('PINSetup') },
      ]);
      return;
    }
    unlockEntry(entry.id); // keep it readable for the rest of this session
    updateMutation.mutate({ id: entry.id, fields: { isLocked: 1 } });
  };

  const onDelete = () => {
    showAlert('Delete this entry?', 'It will be removed from your diary.', [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteMutation.mutateAsync(entry.id);
          goBack();
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.backdrop, paddingTop: insets.top + 12 }}>
      <View style={{ paddingHorizontal: spacing.screenX }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Pressable onPress={goBack} hitSlop={10} style={{ flex: 1 }}>
            <Text style={{ fontFamily: fontFamilies.sans, fontSize: 15, color: colors.clayText }}>
              ← journal
            </Text>
          </Pressable>
          <HandAction
            label={entry.isStarred ? '★ starred' : '☆ star'}
            color={colors.clayText}
            onPress={toggleStar}
          />
        </View>

        <Text style={[textStyles.label, { color: colors.mutedLabel, marginTop: 16 }]}>
          {formatFullDate(fromDateKey(entry.dateKey))} · {formatTime(new Date(entry.createdAt))} · {entry.wordCount} words
          {formatWeatherStamp(entry.weatherTemp, entry.weatherCode) ? ` · ${formatWeatherStamp(entry.weatherTemp, entry.weatherCode)}` : ''}
        </Text>

        {entry.title ? (
          <Text style={[textStyles.heading, { color: colors.ink, marginTop: 6 }]}>{entry.title}</Text>
        ) : null}

        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
          {mood ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 6 }}>
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  backgroundColor: moodColor(entry.mood),
                  marginRight: 6,
                }}
              />
              <Text style={{ fontFamily: fontFamilies.sans, fontSize: 14, color: moodColor(entry.mood) }}>
                {mood.label}
              </Text>
            </View>
          ) : null}
          {(tags || []).map((tag) => (
            <TagChip key={tag.id} label={`#${tag.name}`} />
          ))}
        </View>
        {entry.aiConsent ? (
          <Text style={{ fontFamily: fontFamilies.sans, fontSize: 13, color: colors.sage, marginTop: 8 }}>
            ✦ shared with AI
          </Text>
        ) : null}
      </View>

      <View
        style={{
          flex: 1,
          backgroundColor: colors.paper,
          borderTopLeftRadius: radii.cardLarge,
          borderTopRightRadius: radii.cardLarge,
          marginTop: 16,
          paddingHorizontal: spacing.screenX,
          paddingTop: 18,
        }}
      >
        <WebView
          originWhitelist={['*']}
          source={{ html: wrapContent(entry.content) }}
          style={{ backgroundColor: 'transparent' }}
          showsVerticalScrollIndicator={false}
        />
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-around',
            paddingVertical: 12,
            paddingBottom: insets.bottom + 12,
            borderTopWidth: 1,
            borderTopColor: colors.hairline,
          }}
        >
          <HandAction
            label="edit"
            color={colors.clayText}
            onPress={() => navigation.navigate('Write', { entryId: entry.id })}
          />
          <HandAction
            label={entry.isLocked ? 'remove lock' : 'lock'}
            color={entry.isLocked ? colors.sage : colors.softInk}
            onPress={toggleLock}
          />
          <HandAction
            label="export"
            color={colors.clayText}
            onPress={() => exportEntryPdf(entry).catch((err) => console.warn('[export]', err?.message))}
          />
          <HandAction label="delete" color={colors.moods.frayed} onPress={onDelete} />
        </View>
      </View>
    </View>
  );
}
