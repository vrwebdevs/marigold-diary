import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, textStyles, spacing, radii, shadows, fontFamilies } from '../../theme';
import SectionHeader from '../../components/SectionHeader';
import { useEntryTotals } from '../../hooks/useEntries';
import { useSettingsStore } from '../../stores';
import { exportDiaryPdf, exportDiaryJson } from '../../services/pdfExport';

function ExportCard({ title, caption, cta, onPress, busy }) {
  return (
    <View
      style={{
        backgroundColor: colors.paper,
        borderRadius: radii.cardLarge,
        padding: spacing.cardPadding,
        marginBottom: spacing.gap,
        ...shadows.card,
      }}
    >
      <Text style={[textStyles.title, { color: colors.ink, fontSize: 20, lineHeight: 26 }]}>
        {title}
      </Text>
      <Text style={[textStyles.caption, { color: colors.softInk, marginTop: 4 }]}>{caption}</Text>
      <Pressable onPress={onPress} disabled={busy} hitSlop={8} style={{ marginTop: 12 }}>
        <Text style={{ fontFamily: fontFamilies.sans, fontSize: 15, color: colors.clayText }}>
          {busy ? 'preparing…' : cta}
        </Text>
      </Pressable>
    </View>
  );
}

export default function ExportScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const diaryName = useSettingsStore((s) => s.diaryName);
  const { data: totals } = useEntryTotals();
  const [busy, setBusy] = useState(null); // 'pdf' | 'json' | null

  const run = async (kind, fn) => {
    setBusy(kind);
    try {
      await fn(diaryName);
    } catch (err) {
      console.warn('[export] failed:', err?.message);
    }
    setBusy(null);
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.backdrop,
        paddingTop: insets.top + 12,
        paddingHorizontal: spacing.screenX,
      }}
    >
      <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
        <Text style={{ fontFamily: fontFamilies.sans, fontSize: 15, color: colors.clayText }}>
          ← back
        </Text>
      </Pressable>
      <Text style={[textStyles.heading, { color: colors.ink, marginTop: 14 }]}>Export</Text>
      <Text style={{ fontFamily: fontFamilies.sans, fontSize: 13, color: colors.softInk, marginTop: 4 }}>
        {totals?.totalEntries ?? 0} entries · {totals?.totalWords ?? 0} words
      </Text>

      <SectionHeader label="full diary" style={{ marginTop: spacing.sectionGap }} />
      <ExportCard
        title="Printable PDF"
        caption="your whole diary as a beautifully set document, newest first"
        cta="create PDF →"
        busy={busy === 'pdf'}
        onPress={() => run('pdf', exportDiaryPdf)}
      />
      <ExportCard
        title="JSON backup"
        caption="every entry, tag and setting in one machine-readable file"
        cta="create backup →"
        busy={busy === 'json'}
        onPress={() => run('json', exportDiaryJson)}
      />

      <Text style={[textStyles.caption, { color: colors.mutedLabel, marginTop: spacing.gap }]}>
        exports include locked entries — once the file leaves Marigold it isn't protected
        by your PIN, so share it carefully
      </Text>
    </View>
  );
}
